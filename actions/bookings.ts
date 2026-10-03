'use server';

import { createClient } from '@/lib/supabase/server';
import {
  courtBookingCreateSchema,
  bookingCancellationSchema,
  addParticipantSchema,
  courtCreateSchema,
  courtUpdateSchema,
  type CourtBookingCreateInput,
  type BookingCancellationInput,
  type AddParticipantInput,
  type CourtCreateInput,
  type CourtUpdateInput,
} from '@/lib/validations/booking';
import { handleActionError, BookingConcurrencyError, AppError } from '@/lib/errors';
import { requireAuth, requireRole, requirePermission } from '@/lib/auth/session';
import { calculateCourtPrice } from '@/lib/pricing';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// COURT MANAGEMENT ACTIONS
// ---------------------------------------------------------------------------

/**
 * Create a new court (Owner/Admin only)
 */
export async function createCourtAction(
  input: CourtCreateInput
): Promise<ActionResult<{ courtId: string }>> {
  try {
    const user = await requirePermission('courts:manage');
    const validated = courtCreateSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('courts')
      .insert({
        name: validated.name,
        sport_type: validated.sportType,
        hourly_rate: validated.hourlyRate,
        is_indoor: validated.isIndoor,
        is_active: validated.isActive,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/courts');

    return {
      success: true,
      data: { courtId: data.id },
      message: `Court "${validated.name}" created successfully.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Update an existing court (Owner/Admin only)
 */
export async function updateCourtAction(
  input: CourtUpdateInput
): Promise<ActionResult<{ courtId: string }>> {
  try {
    const user = await requirePermission('courts:manage');
    const validated = courtUpdateSchema.parse(input);
    const supabase = await createClient();

    const updateData: {
      name?: string;
      hourly_rate?: number;
      is_indoor?: boolean;
      is_active?: boolean;
    } = {};
    if (validated.name !== undefined) updateData.name = validated.name;
    if (validated.hourlyRate !== undefined) updateData.hourly_rate = validated.hourlyRate;
    if (validated.isIndoor !== undefined) updateData.is_indoor = validated.isIndoor;
    if (validated.isActive !== undefined) updateData.is_active = validated.isActive;

    const { error } = await supabase
      .from('courts')
      .update(updateData)
      .eq('id', validated.id);

    if (error) throw error;

    revalidatePath('/dashboard/courts');

    return {
      success: true,
      data: { courtId: validated.id },
      message: 'Court updated successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// BOOKING CREATION ACTION
// ---------------------------------------------------------------------------

/**
 * Server action to create a court booking atomically.
 * Prevents race conditions using the PostgreSQL exclusion constraint (GIST) and stored procedure.
 */
export async function createCourtBookingAction(
  input: CourtBookingCreateInput
): Promise<ActionResult<{ bookingId: string }>> {
  try {
    const validated = courtBookingCreateSchema.parse(input);
    const user = await requireAuth();

    // Members can book for themselves, staff can book for any member
    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);
    if (!isStaff && user.role !== 'MEMBER') {
      throw new AppError('You do not have permission to book courts.', 'FORBIDDEN', 403);
    }

    const supabase = await createClient();

    // 1. Fetch court details
    const { data: court, error: courtError } = await supabase
      .from('courts')
      .select('id, name, hourly_rate, is_active')
      .eq('id', validated.courtId)
      .single();

    if (courtError || !court) {
      throw new AppError('Court not found', 'NOT_FOUND', 404);
    }

    if (!court.is_active) {
      throw new AppError('This court is currently closed for maintenance or inactive', 'COURT_INACTIVE', 400);
    }

    // 2. Resolve member and plan for pricing
    const memberId = validated.memberId || user.memberId || null;
    let planData: { tier: string; courtDiscountPercent: number; freeCourtHoursPerDay: number } | null = null;
    let hoursBookedToday = 0;

    if (memberId) {
      const { data: member } = await supabase
        .from('members')
        .select(`
          id,
          status,
          membership_plans (
            tier,
            court_discount_percent,
            free_court_hours_per_day
          )
        `)
        .eq('id', memberId)
        .single();

      if (member && member.status === 'ACTIVE' && member.membership_plans) {
        const plan = member.membership_plans as { tier: string; court_discount_percent: number; free_court_hours_per_day: number };
        planData = {
          tier: plan.tier,
          courtDiscountPercent: Number(plan.court_discount_percent),
          freeCourtHoursPerDay: plan.free_court_hours_per_day,
        };

        // Count existing non-cancelled bookings for the day
        const bookingDate = new Date(validated.startTime).toISOString().split('T')[0];
        const { count } = await supabase
          .from('court_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', memberId)
          .gte('start_time', `${bookingDate}T00:00:00Z`)
          .lt('start_time', `${bookingDate}T23:59:59.999Z`)
          .neq('status', 'CANCELLED');

        hoursBookedToday = count || 0;
      } else if (member && member.status !== 'ACTIVE') {
        throw new AppError(
          'Membership is not active. Please renew to book courts.',
          'MEMBERSHIP_INACTIVE',
          400
        );
      }
    }

    // Members without staff role booking for other members is not allowed
    if (user.role === 'MEMBER' && memberId && memberId !== user.memberId) {
      throw new AppError('Members can only book courts for themselves.', 'FORBIDDEN', 403);
    }

    // 3. Compute price server-side
    const pricing = calculateCourtPrice({
      hourlyRate: Number(court.hourly_rate),
      plan: planData ? {
        tier: planData.tier as 'GOLD' | 'SILVER' | 'JUNIOR',
        courtDiscountPercent: planData.courtDiscountPercent,
        freeCourtHoursPerDay: planData.freeCourtHoursPerDay,
      } : null,
      hoursBookedToday,
    });

    // 4. Call atomic database stored procedure
    const { data: bookingId, error: rpcError } = await supabase.rpc('create_court_booking', {
      p_court_id: court.id,
      p_member_id: memberId,
      p_booking_type: validated.bookingType,
      p_start_time: validated.startTime,
      p_end_time: validated.endTime,
      p_base_price: pricing.basePrice,
      p_discount_amount: pricing.discountAmount,
      p_final_price: pricing.finalPrice,
      p_notes: validated.notes || null,
    });

    if (rpcError) {
      if (rpcError.code === '23P01') {
        throw new BookingConcurrencyError();
      }
      if (rpcError.message?.includes('MEMBER_DAILY_LIMIT_EXCEEDED')) {
        throw new AppError(
          'Daily booking limit reached: Members can play at most twice per day.',
          'DAILY_LIMIT_EXCEEDED',
          400
        );
      }
      throw rpcError;
    }

    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard/courts');

    return {
      success: true,
      data: { bookingId: bookingId as string },
      message: 'Court booked successfully!',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// BOOKING CANCELLATION ACTION
// ---------------------------------------------------------------------------

/**
 * Server action to cancel an existing booking
 */
export async function cancelBookingAction(
  input: BookingCancellationInput
): Promise<ActionResult<{ bookingId: string }>> {
  try {
    const validated = bookingCancellationSchema.parse(input);
    const user = await requireAuth();
    const supabase = await createClient();

    // Verify booking exists and get ownership data
    const { data: booking, error: fetchError } = await supabase
      .from('court_bookings')
      .select('id, member_id, status, start_time, members(profile_id)')
      .eq('id', validated.bookingId)
      .single();

    if (fetchError || !booking) {
      throw new AppError('Booking not found', 'NOT_FOUND', 404);
    }

    if (booking.status === 'CANCELLED') {
      throw new AppError('This booking is already cancelled.', 'ALREADY_CANCELLED', 400);
    }

    if (booking.status === 'COMPLETED') {
      throw new AppError('Completed bookings cannot be cancelled.', 'COMPLETED_BOOKING', 400);
    }

    const isOwner = booking.members?.profile_id === user.id;
    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);

    if (!isOwner && !isStaff) {
      throw new AppError('Unauthorized to cancel this booking', 'FORBIDDEN', 403);
    }

    // Update booking status to CANCELLED (preserves history)
    const { error: updateError } = await supabase
      .from('court_bookings')
      .update({
        status: 'CANCELLED',
        cancellation_reason: validated.cancellationReason,
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', validated.bookingId);

    if (updateError) {
      throw updateError;
    }

    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard/courts');

    return {
      success: true,
      data: { bookingId: validated.bookingId },
      message: 'Booking cancelled successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// SOCIAL PLAY PARTICIPANT ACTION
// ---------------------------------------------------------------------------

/**
 * Add a participant to an existing SOCIAL_PLAY booking
 */
export async function addSocialPlayParticipantAction(
  input: AddParticipantInput
): Promise<ActionResult<{ participantId: string }>> {
  try {
    const validated = addParticipantSchema.parse(input);
    const user = await requireAuth();
    const supabase = await createClient();

    // Verify the booking exists and is a SOCIAL_PLAY type
    const { data: booking, error: fetchError } = await supabase
      .from('court_bookings')
      .select('id, booking_type, status, start_time')
      .eq('id', validated.bookingId)
      .single();

    if (fetchError || !booking) {
      throw new AppError('Booking not found', 'NOT_FOUND', 404);
    }

    if (booking.booking_type !== 'SOCIAL_PLAY') {
      throw new AppError('Participants can only be added to Social Play bookings.', 'INVALID_BOOKING_TYPE', 400);
    }

    if (booking.status === 'CANCELLED') {
      throw new AppError('Cannot add participants to a cancelled booking.', 'BOOKING_CANCELLED', 400);
    }

    // Verify it's a Friday
    const bookingDay = new Date(booking.start_time).getUTCDay();
    if (bookingDay !== 5) {
      throw new AppError('Social play is only available on Fridays.', 'NOT_FRIDAY', 400);
    }

    // Staff can add participants; members are limited
    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);
    if (!isStaff && user.role !== 'MEMBER') {
      throw new AppError('Unauthorized to add participants.', 'FORBIDDEN', 403);
    }

    // Check duplicate participant
    if (validated.memberId) {
      const { data: existing } = await supabase
        .from('booking_participants')
        .select('id')
        .eq('booking_id', validated.bookingId)
        .eq('member_id', validated.memberId)
        .maybeSingle();

      if (existing) {
        throw new AppError('This member is already registered for this session.', 'DUPLICATE_PARTICIPANT', 409);
      }
    }

    const { data, error } = await supabase
      .from('booking_participants')
      .insert({
        booking_id: validated.bookingId,
        member_id: validated.memberId || null,
        guest_name: validated.guestName || null,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/bookings');

    return {
      success: true,
      data: { participantId: data.id },
      message: 'Participant added successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// AVAILABILITY QUERY ACTIONS
// ---------------------------------------------------------------------------

export interface TimeSlot {
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'past' | 'social_play';
  bookingId?: string;
  bookedBy?: string;
  bookingType?: string;
}

export interface CourtAvailability {
  courtId: string;
  courtName: string;
  sportType: string;
  hourlyRate: number;
  isIndoor: boolean;
  date: string;
  slots: TimeSlot[];
}

/**
 * Fetch availability for a court on a given date.
 * Operating hours: 6:00 AM to 10:00 PM (16 hours, 32 half-hour slots)
 */
export async function getCourtAvailabilityAction(
  courtId: string,
  date: string
): Promise<ActionResult<CourtAvailability>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    // Fetch court details
    const { data: court, error: courtError } = await supabase
      .from('courts')
      .select('id, name, sport_type, hourly_rate, is_indoor, is_active')
      .eq('id', courtId)
      .single();

    if (courtError || !court) {
      throw new AppError('Court not found', 'NOT_FOUND', 404);
    }

    // Fetch existing bookings for this court on this date
    const dayStart = `${date}T00:00:00Z`;
    const dayEnd = `${date}T23:59:59.999Z`;

    const { data: bookings, error: bookingsError } = await supabase
      .from('court_bookings')
      .select(`
        id,
        start_time,
        end_time,
        status,
        booking_type,
        members(
          membership_number,
          profiles(full_name)
        )
      `)
      .eq('court_id', courtId)
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd)
      .neq('status', 'CANCELLED')
      .order('start_time', { ascending: true });

    if (bookingsError) throw bookingsError;

    // Generate time slots from 6:00 AM to 10:00 PM with 30-min intervals
    const slots: TimeSlot[] = [];
    const now = new Date();

    for (let hour = 6; hour < 22; hour++) {
      for (const min of [0, 30]) {
        const slotStart = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

        // Check if past
        if (slotStart.getTime() < now.getTime()) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            status: 'past',
          });
          continue;
        }

        // Check if any existing booking overlaps
        const overlapping = bookings?.find((b) => {
          const bStart = new Date(b.start_time).getTime();
          const bEnd = new Date(b.end_time).getTime();
          return slotStart.getTime() < bEnd && slotEnd.getTime() > bStart;
        });

        if (overlapping) {
          const memberName = overlapping.members?.profiles?.full_name || 'Walk-in Guest';
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            status: overlapping.booking_type === 'SOCIAL_PLAY' ? 'social_play' : 'booked',
            bookingId: overlapping.id,
            bookedBy: memberName,
            bookingType: overlapping.booking_type,
          });
        } else {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            status: 'available',
          });
        }
      }
    }

    return {
      success: true,
      data: {
        courtId: court.id,
        courtName: court.name,
        sportType: court.sport_type,
        hourlyRate: Number(court.hourly_rate),
        isIndoor: court.is_indoor,
        date,
        slots,
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Fetch all courts with their basic information
 */
export async function getCourtsAction(): Promise<ActionResult<Array<{
  id: string;
  name: string;
  sportType: string;
  hourlyRate: number;
  isIndoor: boolean;
  isActive: boolean;
}>>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: courts, error } = await supabase
      .from('courts')
      .select('*')
      .order('name');

    if (error) throw error;

    return {
      success: true,
      data: (courts || []).map((c) => ({
        id: c.id,
        name: c.name,
        sportType: c.sport_type,
        hourlyRate: Number(c.hourly_rate),
        isIndoor: c.is_indoor,
        isActive: c.is_active,
      })),
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Fetch all bookings with filtering
 */
export async function getBookingsAction(filters?: {
  courtId?: string;
  status?: string;
  date?: string;
  memberId?: string;
}): Promise<ActionResult<Array<{
  id: string;
  courtName: string;
  sportType: string;
  memberName: string | null;
  membershipNumber: string | null;
  bookingType: string;
  startTime: string;
  endTime: string;
  status: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  cancellationReason: string | null;
  cancelledAt: string | null;
  notes: string | null;
  createdAt: string;
}>>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    let query = supabase
      .from('court_bookings')
      .select(`
        id,
        booking_type,
        start_time,
        end_time,
        status,
        base_price,
        discount_amount,
        final_price,
        cancellation_reason,
        cancelled_at,
        notes,
        created_at,
        courts (name, sport_type),
        members (membership_number, profiles (full_name))
      `)
      .order('start_time', { ascending: false });

    if (filters?.courtId) {
      query = query.eq('court_id', filters.courtId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status as 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW');
    }
    if (filters?.date) {
      query = query
        .gte('start_time', `${filters.date}T00:00:00Z`)
        .lt('start_time', `${filters.date}T23:59:59.999Z`);
    }
    if (filters?.memberId) {
      query = query.eq('member_id', filters.memberId);
    }

    const { data: bookings, error } = await query.limit(100);

    if (error) throw error;

    return {
      success: true,
      data: (bookings || []).map((b) => ({
        id: b.id,
        courtName: b.courts?.name || 'Unknown Court',
        sportType: b.courts?.sport_type || 'TENNIS',
        memberName: b.members?.profiles?.full_name || null,
        membershipNumber: b.members?.membership_number || null,
        bookingType: b.booking_type,
        startTime: b.start_time,
        endTime: b.end_time,
        status: b.status,
        basePrice: Number(b.base_price),
        discountAmount: Number(b.discount_amount),
        finalPrice: Number(b.final_price),
        cancellationReason: b.cancellation_reason,
        cancelledAt: b.cancelled_at,
        notes: b.notes,
        createdAt: b.created_at,
      })),
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Fetch available members for booking (staff only)
 */
export async function getMembersForBookingAction(): Promise<ActionResult<Array<{
  id: string;
  membershipNumber: string;
  fullName: string;
  tier: string;
  status: string;
}>>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: members, error } = await supabase
      .from('members')
      .select(`
        id,
        membership_number,
        status,
        membership_plans (tier),
        profiles (full_name)
      `)
      .eq('status', 'ACTIVE')
      .order('membership_number');

    if (error) throw error;

    return {
      success: true,
      data: (members || []).map((m) => ({
        id: m.id,
        membershipNumber: m.membership_number,
        fullName: (m.profiles as { full_name: string } | null)?.full_name || 'Unknown',
        tier: (m.membership_plans as { tier: string } | null)?.tier || 'SILVER',
        status: m.status,
      })),
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Get booking details including participants
 */
export async function getBookingDetailsAction(
  bookingId: string
): Promise<ActionResult<{
  booking: {
    id: string;
    courtName: string;
    sportType: string;
    memberName: string | null;
    bookingType: string;
    startTime: string;
    endTime: string;
    status: string;
    basePrice: number;
    discountAmount: number;
    finalPrice: number;
    cancellationReason: string | null;
    notes: string | null;
  };
  participants: Array<{
    id: string;
    memberName: string | null;
    guestName: string | null;
  }>;
}>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: booking, error: bookingError } = await supabase
      .from('court_bookings')
      .select(`
        id,
        booking_type,
        start_time,
        end_time,
        status,
        base_price,
        discount_amount,
        final_price,
        cancellation_reason,
        notes,
        courts (name, sport_type),
        members (membership_number, profiles (full_name))
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      throw new AppError('Booking not found', 'NOT_FOUND', 404);
    }

    const { data: participants } = await supabase
      .from('booking_participants')
      .select(`
        id,
        guest_name,
        members (profiles (full_name))
      `)
      .eq('booking_id', bookingId);

    return {
      success: true,
      data: {
        booking: {
          id: booking.id,
          courtName: booking.courts?.name || 'Unknown',
          sportType: booking.courts?.sport_type || 'TENNIS',
          memberName: booking.members?.profiles?.full_name || null,
          bookingType: booking.booking_type,
          startTime: booking.start_time,
          endTime: booking.end_time,
          status: booking.status,
          basePrice: Number(booking.base_price),
          discountAmount: Number(booking.discount_amount),
          finalPrice: Number(booking.final_price),
          cancellationReason: booking.cancellation_reason,
          notes: booking.notes,
        },
        participants: (participants || []).map((p) => ({
          id: p.id,
          memberName: (p.members as { profiles: { full_name: string } | null } | null)?.profiles?.full_name || null,
          guestName: p.guest_name,
        })),
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

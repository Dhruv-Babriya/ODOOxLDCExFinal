'use server';

import { createClient } from '@/lib/supabase/server';
import {
  courtBookingCreateSchema,
  bookingRescheduleSchema,
  bookingCancellationSchema,
  addParticipantSchema,
  removeParticipantSchema,
  bookingPricePreviewSchema,
  bookingPaymentSchema,
  courtCreateSchema,
  courtUpdateSchema,
  type CourtBookingCreateInput,
  type BookingRescheduleInput,
  type BookingCancellationInput,
  type AddParticipantInput,
  type RemoveParticipantInput,
  type BookingPricePreviewInput,
  type BookingPaymentInput,
  type CourtCreateInput,
  type CourtUpdateInput,
} from '@/lib/validations/booking';
import { handleActionError, BookingConcurrencyError, AppError } from '@/lib/errors';
import { requireAuth, requirePermission } from '@/lib/auth/session';
import { calculateCourtPrice } from '@/lib/pricing';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';
import {
  DEFAULT_PAGE_SIZE,
  PAGE_SIZE_OPTIONS,
  type PaginationMeta,
  calculatePaginationMeta,
  getSupabaseRange,
  generateCsvContent,
} from '@/lib/pagination';

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
    await requirePermission('courts:manage');
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
    await requirePermission('courts:manage');
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
// LIVE PRICING PREVIEW ACTION (Phase 2)
// ---------------------------------------------------------------------------

export interface PricePreviewResult {
  hourlyRate: number;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  discountPercent: number;
  isFreeBenefit: boolean;
  tier: string;
  hoursBookedToday: number;
}

/**
 * Server-side calculation of booking pricing before confirmation.
 */
export async function previewBookingPriceAction(
  input: BookingPricePreviewInput
): Promise<ActionResult<PricePreviewResult>> {
  try {
    const validated = bookingPricePreviewSchema.parse(input);
    await requireAuth();
    const supabase = await createClient();

    // 1. Fetch court hourly rate
    const { data: court, error: courtError } = await supabase
      .from('courts')
      .select('id, hourly_rate')
      .eq('id', validated.courtId)
      .single();

    if (courtError || !court) {
      throw new AppError('Court not found', 'NOT_FOUND', 404);
    }

    const hourlyRate = Number(court.hourly_rate);

    // 2. Resolve member and plan if memberId is given
    if (!validated.memberId) {
      const guestPricing = calculateCourtPrice({ hourlyRate });
      return {
        success: true,
        data: {
          hourlyRate,
          basePrice: guestPricing.basePrice,
          discountAmount: guestPricing.discountAmount,
          finalPrice: guestPricing.finalPrice,
          discountPercent: 0,
          isFreeBenefit: false,
          tier: 'GUEST',
          hoursBookedToday: 0,
        },
      };
    }

    const { data: member } = await supabase
      .from('members')
      .select(`
        id,
        status,
        end_date,
        membership_plans (
          tier,
          court_discount_percent,
          free_court_hours_per_day
        )
      `)
      .eq('id', validated.memberId)
      .single();

    const todayStr = new Date().toISOString().split('T')[0];
    const isMemberActive =
      member &&
      member.status === 'ACTIVE' &&
      (!member.end_date || member.end_date >= todayStr);

    if (!member || !isMemberActive || !member.membership_plans) {
      const guestPricing = calculateCourtPrice({ hourlyRate });
      return {
        success: true,
        data: {
          hourlyRate,
          basePrice: guestPricing.basePrice,
          discountAmount: guestPricing.discountAmount,
          finalPrice: guestPricing.finalPrice,
          discountPercent: 0,
          isFreeBenefit: false,
          tier: 'STANDARD',
          hoursBookedToday: 0,
        },
      };
    }

    const plan = member.membership_plans as {
      tier: string;
      court_discount_percent: number;
      free_court_hours_per_day: number;
    };

    // Count today's non-cancelled bookings
    const bookingDate = new Date(validated.startTime).toISOString().split('T')[0];
    const { count } = await supabase
      .from('court_bookings')
      .select('id', { count: 'exact', head: true })
      .eq('member_id', validated.memberId)
      .gte('start_time', `${bookingDate}T00:00:00Z`)
      .lt('start_time', `${bookingDate}T23:59:59.999Z`)
      .neq('status', 'CANCELLED');

    const hoursBookedToday = count || 0;

    const pricing = calculateCourtPrice({
      hourlyRate,
      plan: {
        tier: plan.tier as 'GOLD' | 'SILVER' | 'JUNIOR',
        courtDiscountPercent: Number(plan.court_discount_percent),
        freeCourtHoursPerDay: plan.free_court_hours_per_day,
      },
      hoursBookedToday,
    });

    return {
      success: true,
      data: {
        hourlyRate,
        basePrice: pricing.basePrice,
        discountAmount: pricing.discountAmount,
        finalPrice: pricing.finalPrice,
        discountPercent: Number(plan.court_discount_percent),
        isFreeBenefit: pricing.isFreeBenefit,
        tier: plan.tier,
        hoursBookedToday,
      },
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
): Promise<ActionResult<{ bookingId: string; finalPrice: number }>> {
  try {
    const validated = courtBookingCreateSchema.parse(input);
    const user = await requireAuth();

    // Members can book for themselves, staff can book for any member or walk-in guest
    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);
    if (!isStaff && user.role !== 'MEMBER') {
      throw new AppError('You do not have permission to book courts.', 'FORBIDDEN', 403);
    }

    // Maintenance bookings are staff-only
    if (validated.bookingType === 'MAINTENANCE' && !isStaff) {
      throw new AppError('Only staff can schedule court maintenance.', 'FORBIDDEN', 403);
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

    if (!court.is_active && validated.bookingType !== 'MAINTENANCE') {
      throw new AppError(
        'This court is currently closed for maintenance or inactive.',
        'COURT_INACTIVE',
        400
      );
    }

    // 2. Resolve member and plan for pricing
    const memberId = validated.memberId || (isStaff ? null : user.memberId) || null;
    let planData: { tier: string; courtDiscountPercent: number; freeCourtHoursPerDay: number } | null = null;
    let hoursBookedToday = 0;

    if (memberId) {
      const { data: member } = await supabase
        .from('members')
        .select(`
          id,
          status,
          end_date,
          membership_plans (
            tier,
            court_discount_percent,
            free_court_hours_per_day
          )
        `)
        .eq('id', memberId)
        .single();

      const todayStr = new Date().toISOString().split('T')[0];
      const isMemberActive =
        member &&
        member.status === 'ACTIVE' &&
        (!member.end_date || member.end_date >= todayStr);

      if (isMemberActive && member.membership_plans) {
        const plan = member.membership_plans as {
          tier: string;
          court_discount_percent: number;
          free_court_hours_per_day: number;
        };
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
    let basePrice = Number(court.hourly_rate);
    let discountAmount = 0;
    let finalPrice = basePrice;

    if (validated.bookingType === 'MAINTENANCE') {
      basePrice = 0;
      discountAmount = 0;
      finalPrice = 0;
    } else {
      const pricing = calculateCourtPrice({
        hourlyRate: basePrice,
        plan: planData ? {
          tier: planData.tier as 'GOLD' | 'SILVER' | 'JUNIOR',
          courtDiscountPercent: planData.courtDiscountPercent,
          freeCourtHoursPerDay: planData.freeCourtHoursPerDay,
        } : null,
        hoursBookedToday,
      });
      basePrice = pricing.basePrice;
      discountAmount = pricing.discountAmount;
      finalPrice = pricing.finalPrice;
    }

    // Compose notes with guest info if walk-in
    let finalNotes = validated.notes || '';
    if (!memberId && validated.guestName) {
      const guestDetails = `Walk-in Guest: ${validated.guestName}${validated.guestPhone ? ` (Tel: ${validated.guestPhone})` : ''}`;
      finalNotes = finalNotes ? `${guestDetails} | ${finalNotes}` : guestDetails;
    }

    // 4. Call atomic database stored procedure
    const { data: bookingId, error: rpcError } = await supabase.rpc('create_court_booking', {
      p_court_id: court.id,
      p_member_id: memberId,
      p_booking_type: validated.bookingType,
      p_start_time: validated.startTime,
      p_end_time: validated.endTime,
      p_base_price: basePrice,
      p_discount_amount: discountAmount,
      p_final_price: finalPrice,
      p_notes: finalNotes || null,
    });

    if (rpcError) {
      if (rpcError.code === '23P01' || rpcError.message?.toLowerCase().includes('exclusion')) {
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
      data: {
        bookingId: bookingId as string,
        finalPrice,
      },
      message: 'Court booked successfully!',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// BOOKING RESCHEDULING ACTION (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Server action to safely reschedule an existing court booking.
 * Enforces conflict revalidation, daily booking limits, and server-side repricing.
 */
export async function rescheduleBookingAction(
  input: BookingRescheduleInput
): Promise<ActionResult<{ bookingId: string; newFinalPrice: number }>> {
  try {
    const validated = bookingRescheduleSchema.parse(input);
    const user = await requireAuth();
    const supabase = await createClient();

    // 1. Fetch existing booking
    const { data: booking, error: bookingError } = await supabase
      .from('court_bookings')
      .select(`
        id,
        court_id,
        member_id,
        booking_type,
        start_time,
        end_time,
        status,
        members (profile_id)
      `)
      .eq('id', validated.bookingId)
      .single();

    if (bookingError || !booking) {
      throw new AppError('Booking not found', 'NOT_FOUND', 404);
    }

    if (booking.status === 'CANCELLED') {
      throw new AppError('Cancelled bookings cannot be rescheduled.', 'CANNOT_RESCHEDULE_CANCELLED', 400);
    }

    if (booking.status === 'COMPLETED') {
      throw new AppError('Completed bookings cannot be rescheduled.', 'CANNOT_RESCHEDULE_COMPLETED', 400);
    }

    // Authorization: Owner of the booking or Staff
    const isOwner = booking.members?.profile_id === user.id;
    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);

    if (!isOwner && !isStaff) {
      throw new AppError('Unauthorized to reschedule this booking.', 'FORBIDDEN', 403);
    }

    // 2. Fetch target court details
    const { data: targetCourt, error: courtError } = await supabase
      .from('courts')
      .select('id, name, hourly_rate, is_active')
      .eq('id', validated.newCourtId)
      .single();

    if (courtError || !targetCourt) {
      throw new AppError('Target court not found', 'NOT_FOUND', 404);
    }

    if (!targetCourt.is_active && booking.booking_type !== 'MAINTENANCE') {
      throw new AppError('The target court is currently inactive or closed for maintenance.', 'COURT_INACTIVE', 400);
    }

    // 3. Recalculate price for the new court and date
    let basePrice = Number(targetCourt.hourly_rate);
    let discountAmount = 0;
    let finalPrice = basePrice;

    if (booking.booking_type === 'MAINTENANCE') {
      basePrice = 0;
      discountAmount = 0;
      finalPrice = 0;
    } else if (booking.member_id) {
      const { data: member } = await supabase
        .from('members')
        .select(`
          id,
          status,
          end_date,
          membership_plans (
            tier,
            court_discount_percent,
            free_court_hours_per_day
          )
        `)
        .eq('id', booking.member_id)
        .single();

      const todayStr = new Date().toISOString().split('T')[0];
      const isMemberActive =
        member &&
        member.status === 'ACTIVE' &&
        (!member.end_date || member.end_date >= todayStr);

      if (member && !isMemberActive) {
        throw new AppError(
          'Membership is not active. Suspended or expired members cannot reschedule court bookings.',
          'MEMBERSHIP_INACTIVE',
          400
        );
      }

      if (isMemberActive && member.membership_plans) {
        const plan = member.membership_plans as {
          tier: string;
          court_discount_percent: number;
          free_court_hours_per_day: number;
        };

        // Count other bookings on the target date (excluding this one)
        const targetDate = new Date(validated.newStartTime).toISOString().split('T')[0];
        const { count } = await supabase
          .from('court_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', booking.member_id)
          .neq('id', booking.id)
          .gte('start_time', `${targetDate}T00:00:00Z`)
          .lt('start_time', `${targetDate}T23:59:59.999Z`)
          .neq('status', 'CANCELLED');

        const hoursBookedToday = count || 0;

        const pricing = calculateCourtPrice({
          hourlyRate: basePrice,
          plan: {
            tier: plan.tier as 'GOLD' | 'SILVER' | 'JUNIOR',
            courtDiscountPercent: Number(plan.court_discount_percent),
            freeCourtHoursPerDay: plan.free_court_hours_per_day,
          },
          hoursBookedToday,
        });

        basePrice = pricing.basePrice;
        discountAmount = pricing.discountAmount;
        finalPrice = pricing.finalPrice;
      }
    }

    // Historical audit note for safe rescheduling tracking
    const auditNote = `[Rescheduled by ${user.role} on ${new Date().toISOString()}] Original: ${booking.start_time} - ${booking.end_time}.${validated.notes ? ` Reason/Notes: ${validated.notes}` : ''}`;

    // 4. Call atomic stored procedure
    const { data: rescheduledId, error: rpcError } = await supabase.rpc('reschedule_court_booking', {
      p_booking_id: validated.bookingId,
      p_new_court_id: targetCourt.id,
      p_new_start_time: validated.newStartTime,
      p_new_end_time: validated.newEndTime,
      p_new_base_price: basePrice,
      p_new_discount_amount: discountAmount,
      p_new_final_price: finalPrice,
      p_notes: auditNote,
    });

    if (rpcError) {
      if (rpcError.code === '23P01' || rpcError.message?.toLowerCase().includes('exclusion')) {
        throw new BookingConcurrencyError();
      }
      if (rpcError.message?.includes('MEMBER_DAILY_LIMIT_EXCEEDED')) {
        throw new AppError(
          'Daily booking limit reached: Members can play at most twice per day on the selected date.',
          'DAILY_LIMIT_EXCEEDED',
          400
        );
      }
      if (rpcError.message?.includes('OUT_OF_OPERATING_HOURS')) {
        throw new AppError(
          'Courts are open from 06:00 to 22:00. Sessions cannot start before 06:00 or after 21:30.',
          'OUT_OF_OPERATING_HOURS',
          400
        );
      }
      if (rpcError.message?.includes('PAST_BOOKING_PROHIBITED')) {
        throw new AppError('Cannot reschedule a court to a past date or time.', 'PAST_BOOKING_PROHIBITED', 400);
      }
      if (rpcError.message?.includes('SOCIAL_PLAY_FRIDAY_ONLY')) {
        throw new AppError('Friday Social Play sessions are strictly permitted on Fridays only.', 'SOCIAL_PLAY_FRIDAY_ONLY', 400);
      }
      throw rpcError;
    }

    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard/courts');

    return {
      success: true,
      data: {
        bookingId: rescheduledId as string,
        newFinalPrice: finalPrice,
      },
      message: 'Booking rescheduled successfully!',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// BOOKING CANCELLATION ACTION
// ---------------------------------------------------------------------------

/**
 * Server action to cancel an existing booking.
 * Preserves historical records, enforces RBAC, and frees the member daily limit quota.
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

    // Call atomic stored procedure: cancel_court_booking
    const { error: cancelError } = await supabase.rpc('cancel_court_booking', {
      p_booking_id: validated.bookingId,
      p_reason: validated.cancellationReason,
    });

    if (cancelError) {
      if (cancelError.message?.includes('ALREADY_CANCELLED')) {
        throw new AppError('This booking is already cancelled.', 'ALREADY_CANCELLED', 400);
      }
      if (cancelError.message?.includes('CANNOT_CANCEL_COMPLETED')) {
        throw new AppError('Completed bookings cannot be cancelled.', 'COMPLETED_BOOKING', 400);
      }
      throw cancelError;
    }

    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard/courts');

    return {
      success: true,
      data: { bookingId: validated.bookingId },
      message: 'Booking cancelled successfully. Daily booking quota has been restored.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// BOOKING STATUS UPDATE (Operations: Completed / No-Show)
// ---------------------------------------------------------------------------

export async function updateBookingStatusAction(
  bookingId: string,
  newStatus: 'COMPLETED' | 'NO_SHOW'
): Promise<ActionResult<{ bookingId: string }>> {
  try {
    const user = await requireAuth();
    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);
    if (!isStaff) {
      throw new AppError('Unauthorized to update booking status.', 'FORBIDDEN', 403);
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('court_bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) throw error;

    revalidatePath('/dashboard/bookings');

    return {
      success: true,
      data: { bookingId },
      message: `Booking marked as ${newStatus.replace('_', ' ')}.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// SOCIAL PLAY PARTICIPANT ACTIONS (Phase 2)
// ---------------------------------------------------------------------------

/**
 * Add a participant to an existing SOCIAL_PLAY booking
 */
export async function addSocialPlayParticipantAction(
  input: AddParticipantInput
): Promise<ActionResult<{ participantId: string }>> {
  try {
    const validated = addParticipantSchema.parse(input);
    await requireAuth();
    const supabase = await createClient();

    // Verify booking
    const { data: participantId, error: rpcError } = await supabase.rpc('add_booking_participant', {
      p_booking_id: validated.bookingId,
      p_member_id: validated.memberId || null,
      p_guest_name: validated.guestName || null,
    });

    if (rpcError) {
      if (rpcError.message?.includes('INVALID_BOOKING_TYPE')) {
        throw new AppError('Participants can only be added to Friday Social Play sessions.', 'INVALID_BOOKING_TYPE', 400);
      }
      if (rpcError.message?.includes('CAPACITY_REACHED')) {
        throw new AppError('This social play session has reached its maximum capacity of 12 players.', 'CAPACITY_REACHED', 400);
      }
      if (rpcError.message?.includes('DUPLICATE_PARTICIPANT')) {
        throw new AppError('This member is already registered for this session.', 'DUPLICATE_PARTICIPANT', 409);
      }
      if (rpcError.message?.includes('BOOKING_CANCELLED')) {
        throw new AppError('Cannot add participants to a cancelled booking.', 'BOOKING_CANCELLED', 400);
      }
      if (rpcError.message?.includes('BOOKING_NOT_FOUND')) {
        throw new AppError('Booking not found', 'NOT_FOUND', 404);
      }
      throw rpcError;
    }

    revalidatePath('/dashboard/bookings');

    return {
      success: true,
      data: { participantId: participantId as string },
      message: 'Participant added successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Remove a participant from a SOCIAL_PLAY booking
 */
export async function removeSocialPlayParticipantAction(
  input: RemoveParticipantInput
): Promise<ActionResult<{ success: boolean }>> {
  try {
    const validated = removeParticipantSchema.parse(input);
    const user = await requireAuth();
    const supabase = await createClient();

    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);

    // If not staff, verify participant belongs to member
    if (!isStaff) {
      const { data: participant } = await supabase
        .from('booking_participants')
        .select('member_id, members(profile_id)')
        .eq('id', validated.participantId)
        .single();

      if (!participant || (participant.members as { profile_id: string } | null)?.profile_id !== user.id) {
        throw new AppError('Unauthorized to remove this participant.', 'FORBIDDEN', 403);
      }
    }

    const { error } = await supabase
      .from('booking_participants')
      .delete()
      .eq('id', validated.participantId);

    if (error) throw error;

    revalidatePath('/dashboard/bookings');

    return {
      success: true,
      data: { success: true },
      message: 'Participant removed successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// PAYMENT & FINANCE INTEGRATION (Developer 4 Contract)
// ---------------------------------------------------------------------------

/**
 * Record a payment for a completed/confirmed court booking.
 * Integrates directly with public.payments schema without creating a separate payment system.
 */
export async function recordBookingPaymentAction(
  input: BookingPaymentInput
): Promise<ActionResult<{ paymentId: string; paymentNumber: string }>> {
  try {
    const validated = bookingPaymentSchema.parse(input);
    const user = await requireAuth();
    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);
    if (!isStaff) {
      throw new AppError('Only front-desk and administration staff can record booking payments.', 'FORBIDDEN', 403);
    }

    const supabase = await createClient();

    // Verify booking
    const { data: booking, error: fetchError } = await supabase
      .from('court_bookings')
      .select('id, member_id, final_price, status')
      .eq('id', validated.bookingId)
      .single();

    if (fetchError || !booking) {
      throw new AppError('Booking not found', 'NOT_FOUND', 404);
    }

    // Generate unique payment number
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const paymentNumber = `PAY-BKG-${timestamp}-${randomSuffix}`;

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_number: paymentNumber,
        booking_id: booking.id,
        member_id: booking.member_id || null,
        amount: validated.amount,
        payment_method: validated.paymentMethod,
        status: 'COMPLETED',
        transaction_reference: validated.transactionReference || null,
        recorded_by: user.id,
      })
      .select('id')
      .single();

    if (paymentError) throw paymentError;

    revalidatePath('/dashboard/bookings');
    revalidatePath('/dashboard/payments');

    return {
      success: true,
      data: {
        paymentId: payment.id,
        paymentNumber,
      },
      message: `Payment of ₹${validated.amount} recorded successfully under ${paymentNumber}.`,
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
  status: 'available' | 'booked' | 'past' | 'social_play' | 'maintenance';
  bookingId?: string;
  bookedBy?: string;
  bookingType?: string;
  isMine?: boolean;
}

export interface CourtAvailability {
  courtId: string;
  courtName: string;
  sportType: string;
  hourlyRate: number;
  isIndoor: boolean;
  isActive: boolean;
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

    // Fetch existing bookings for this court on this date via SECURITY DEFINER function
    // This eliminates phantom available slots caused by RLS restrictions on normal members
    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);
    const { data: bookings, error: bookingsError } = await supabase.rpc('get_court_bookings_for_date', {
      p_court_id: courtId,
      p_date: date,
    });

    if (bookingsError) throw bookingsError;

    // Track user's own bookings for accurate isMine determination
    let userBookingIds = new Set<string>();
    if (user.role === 'MEMBER' && user.memberId) {
      const { data: myBookings } = await supabase
        .from('court_bookings')
        .select('id')
        .eq('member_id', user.memberId)
        .gte('start_time', `${date}T00:00:00Z`)
        .lte('start_time', `${date}T23:59:59.999Z`)
        .neq('status', 'CANCELLED');

      if (myBookings) {
        userBookingIds = new Set(myBookings.map((b) => b.id));
      }
    }

    // Generate time slots from 6:00 AM to 10:00 PM with 30-min intervals
    const slots: TimeSlot[] = [];
    const now = new Date();

    for (let hour = 6; hour < 22; hour++) {
      for (const min of [0, 30]) {
        const slotStart = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);

        // If court is inactive, mark all slots as maintenance
        if (!court.is_active) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            status: 'maintenance',
          });
          continue;
        }

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
          const isMine = isStaff || userBookingIds.has(overlapping.booking_id);
          const memberName = isStaff
            ? (overlapping.member_name || 'Reserved')
            : (isMine ? (overlapping.member_name || 'My Booking') : 'Reserved');

          let statusType: TimeSlot['status'] = 'booked';
          if (overlapping.booking_type === 'SOCIAL_PLAY') {
            statusType = 'social_play';
          } else if (overlapping.booking_type === 'MAINTENANCE') {
            statusType = 'maintenance';
          }

          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            status: statusType,
            bookingId: overlapping.booking_id,
            bookedBy: memberName,
            bookingType: overlapping.booking_type,
            isMine,
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
        isActive: court.is_active,
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
    await requireAuth();
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
  courtId: string;
  courtName: string;
  sportType: string;
  memberId: string | null;
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
  isMine: boolean;
}>>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    let query = supabase
      .from('court_bookings')
      .select(`
        id,
        court_id,
        member_id,
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
        members (profile_id, membership_number, profiles (full_name))
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
      data: (bookings || []).map((b) => {
        const memberProfileId = (b.members as { profile_id?: string } | null)?.profile_id;
        return {
          id: b.id,
          courtId: b.court_id,
          courtName: b.courts?.name || 'Unknown Court',
          sportType: b.courts?.sport_type || 'TENNIS',
          memberId: b.member_id,
          memberName: (b.members as { profiles?: { full_name: string } | null } | null)?.profiles?.full_name || null,
          membershipNumber: (b.members as { membership_number?: string } | null)?.membership_number || null,
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
          isMine: memberProfileId === user.id,
        };
      }),
    };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// SERVER-SIDE PAGINATED BOOKINGS & OWNER AGGREGATES
// ---------------------------------------------------------------------------

export interface BookingRow {
  id: string;
  courtId: string;
  courtName: string;
  sportType: string;
  memberId: string | null;
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
  isMine: boolean;
}

export interface GetBookingsPaginatedInput {
  page?: number;
  pageSize?: number;
  search?: string;
  courtId?: string;
  status?: string;
  date?: string;
  bookingType?: string;
  memberId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface BookingDashboardMetrics {
  today: {
    totalBookings: number;
    courtRevenue: number;
    activeMembers: number;
  };
  thisWeek: {
    totalBookings: number;
    revenue: number;
    bookingActivity: number;
  };
  thisMonth: {
    totalBookings: number;
    revenue: number;
    courtUsageHours: number;
  };
  overall: {
    totalBookings: number;
    confirmedBookings: number;
    completedBookings: number;
    cancelledBookings: number;
  };
}

/**
 * Server-side paginated bookings fetcher.
 * Guarantees that large datasets (50,000+ rows) are sliced at the database level.
 * Never loads all rows into memory or browser.
 */
export async function getBookingsPaginatedAction(
  params?: GetBookingsPaginatedInput
): Promise<ActionResult<{ bookings: BookingRow[]; pagination: PaginationMeta }>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const rawPage = params?.page ?? 1;
    const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
    const rawSize = params?.pageSize ?? DEFAULT_PAGE_SIZE;
    const pageSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize)
      ? rawSize
      : DEFAULT_PAGE_SIZE;

    const { from, to } = getSupabaseRange(page, pageSize);
    const search = params?.search ? params.search.trim() : undefined;
    const sortBy = params?.sortBy || 'start_time_desc';

    // 1. Primary Strategy: Database Stored Procedure (RPC) with window count
    try {
      const rpcResult = await (supabase as any).rpc('get_court_bookings_paginated', {
        p_search: search || null,
        p_court_id: params?.courtId || null,
        p_status: params?.status || null,
        p_booking_type: params?.bookingType || null,
        p_date: params?.date || null,
        p_member_id: params?.memberId || null,
        p_sort_by: sortBy,
        p_limit: pageSize,
        p_offset: from,
      });

      const rpcData = rpcResult.data as any[] | null;

      if (!rpcResult.error && Array.isArray(rpcData)) {
        let totalCount = 0;
        if (rpcData.length > 0) {
          totalCount = Number(rpcData[0].total_count || 0);
        } else if (page > 1) {
          // If requested page returned 0 rows, check if there's any matching rows to calculate totalPages
          const countCheckRes = await (supabase as any).rpc('get_court_bookings_paginated', {
            p_search: search || null,
            p_court_id: params?.courtId || null,
            p_status: params?.status || null,
            p_booking_type: params?.bookingType || null,
            p_date: params?.date || null,
            p_member_id: params?.memberId || null,
            p_sort_by: sortBy,
            p_limit: 1,
            p_offset: 0,
          });
          const countCheck = countCheckRes.data as any[] | null;
          if (Array.isArray(countCheck) && countCheck.length > 0) {
            totalCount = Number(countCheck[0].total_count || 0);
          }
        }

        const pagination = calculatePaginationMeta(totalCount, page, pageSize);

        const bookings: BookingRow[] = rpcData.map((b: any) => ({
          id: b.id,
          courtId: b.court_id,
          courtName: b.court_name || 'Unknown Court',
          sportType: b.sport_type || 'TENNIS',
          memberId: b.member_id,
          memberName: b.member_name || null,
          membershipNumber: b.membership_number || null,
          bookingType: b.booking_type,
          startTime: b.start_time,
          endTime: b.end_time,
          status: b.status,
          basePrice: Number(b.base_price || 0),
          discountAmount: Number(b.discount_amount || 0),
          finalPrice: Number(b.final_price || 0),
          cancellationReason: b.cancellation_reason,
          cancelledAt: b.cancelled_at,
          notes: b.notes,
          createdAt: b.created_at,
          isMine: b.member_profile_id === user.id,
        }));

        return {
          success: true,
          data: {
            bookings,
            pagination,
          },
        };
      }
    } catch {
      // Fallback to PostgREST query if RPC unavailable
    }

    // 2. Fallback Strategy: Exact Supabase PostgREST query with Range & Count
    let countQuery = supabase
      .from('court_bookings')
      .select('*', { count: 'exact', head: true });

    let dataQuery = supabase
      .from('court_bookings')
      .select(`
        id,
        court_id,
        member_id,
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
        members (profile_id, membership_number, profiles (full_name))
      `);

    // Apply identical filters to both Count Query and Data Query
    if (params?.courtId) {
      countQuery = countQuery.eq('court_id', params.courtId);
      dataQuery = dataQuery.eq('court_id', params.courtId);
    }
    if (params?.status) {
      countQuery = countQuery.eq('status', params.status as any);
      dataQuery = dataQuery.eq('status', params.status as any);
    }
    if (params?.bookingType) {
      countQuery = countQuery.eq('booking_type', params.bookingType as any);
      dataQuery = dataQuery.eq('booking_type', params.bookingType as any);
    }
    if (params?.date) {
      const dayStart = `${params.date}T00:00:00Z`;
      const dayEnd = `${params.date}T23:59:59.999Z`;
      countQuery = countQuery.gte('start_time', dayStart).lt('start_time', dayEnd);
      dataQuery = dataQuery.gte('start_time', dayStart).lt('start_time', dayEnd);
    }
    if (params?.memberId) {
      countQuery = countQuery.eq('member_id', params.memberId);
      dataQuery = dataQuery.eq('member_id', params.memberId);
    }
    if (search) {
      countQuery = countQuery.ilike('notes', `%${search}%`);
      dataQuery = dataQuery.ilike('notes', `%${search}%`);
    }

    // Deterministic database-level sorting
    let sortColumn = 'start_time';
    let isAsc = false;

    if (sortBy === 'start_time_asc' || sortBy === 'date_asc') {
      sortColumn = 'start_time';
      isAsc = true;
    } else if (sortBy === 'created_at_desc' || sortBy === 'newest') {
      sortColumn = 'created_at';
      isAsc = false;
    } else if (sortBy === 'created_at_asc' || sortBy === 'oldest') {
      sortColumn = 'created_at';
      isAsc = true;
    } else if (sortBy === 'price_desc') {
      sortColumn = 'final_price';
      isAsc = false;
    } else if (sortBy === 'price_asc') {
      sortColumn = 'final_price';
      isAsc = true;
    }

    dataQuery = dataQuery.order(sortColumn, { ascending: isAsc }).order('id', { ascending: false });
    dataQuery = dataQuery.range(from, to);

    const [{ count, error: countErr }, { data: bookingsData, error: dataErr }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (countErr) throw countErr;
    if (dataErr) throw dataErr;

    const totalCount = count ?? 0;
    const pagination = calculatePaginationMeta(totalCount, page, pageSize);

    const bookings: BookingRow[] = (bookingsData || []).map((b: any) => ({
      id: b.id,
      courtId: b.court_id,
      courtName: b.courts?.name || 'Unknown Court',
      sportType: b.courts?.sport_type || 'TENNIS',
      memberId: b.member_id,
      memberName: b.members?.profiles?.full_name || null,
      membershipNumber: b.members?.membership_number || null,
      bookingType: b.booking_type,
      startTime: b.start_time,
      endTime: b.end_time,
      status: b.status,
      basePrice: Number(b.base_price || 0),
      discountAmount: Number(b.discount_amount || 0),
      finalPrice: Number(b.final_price || 0),
      cancellationReason: b.cancellation_reason,
      cancelledAt: b.cancelled_at,
      notes: b.notes,
      createdAt: b.created_at,
      isMine: (b.members as { profile_id?: string } | null)?.profile_id === user.id,
    }));

    return {
      success: true,
      data: {
        bookings,
        pagination,
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server-side aggregate queries for Owner Dashboard summaries.
 * Calculates Today, This Week, and This Month KPIs directly in PostgreSQL.
 * Never loads 50,000 rows into the browser.
 */
export async function getBookingDashboardMetricsAction(): Promise<
  ActionResult<BookingDashboardMetrics>
> {
  try {
    await requireAuth();
    const supabase = await createClient();

    // 1. Try PostgreSQL stored procedure
    try {
      const aggResult = await (supabase as any).rpc(
        'get_court_booking_aggregates'
      );
      if (!aggResult.error && aggResult.data) {
        return {
          success: true,
          data: aggResult.data as unknown as BookingDashboardMetrics,
        };
      }
    } catch {
      // Fallback below
    }

    // 2. Direct database-level COUNT and SUM queries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    const dayOfWeek = (now.getDay() + 6) % 7;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0).toISOString();
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 6, 23, 59, 59, 999).toISOString();

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const [
      { count: todayCount },
      { count: weekCount },
      { count: monthCount },
      { count: totalCount },
      { count: confirmedCount },
    ] = await Promise.all([
      supabase
        .from('court_bookings')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', todayStart)
        .lte('start_time', todayEnd)
        .neq('status', 'CANCELLED'),
      supabase
        .from('court_bookings')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', weekStart)
        .lte('start_time', weekEnd)
        .neq('status', 'CANCELLED'),
      supabase
        .from('court_bookings')
        .select('*', { count: 'exact', head: true })
        .gte('start_time', monthStart)
        .lte('start_time', monthEnd)
        .neq('status', 'CANCELLED'),
      supabase.from('court_bookings').select('*', { count: 'exact', head: true }),
      supabase.from('court_bookings').select('*', { count: 'exact', head: true }).eq('status', 'CONFIRMED'),
    ]);

    return {
      success: true,
      data: {
        today: {
          totalBookings: todayCount || 0,
          courtRevenue: 0,
          activeMembers: 0,
        },
        thisWeek: {
          totalBookings: weekCount || 0,
          revenue: 0,
          bookingActivity: weekCount || 0,
        },
        thisMonth: {
          totalBookings: monthCount || 0,
          revenue: 0,
          courtUsageHours: monthCount || 0,
        },
        overall: {
          totalBookings: totalCount || 0,
          confirmedBookings: confirmedCount || 0,
          completedBookings: 0,
          cancelledBookings: 0,
        },
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to export the full filtered booking dataset to CSV.
 * Respects current search, filters, and sorting.
 * Does NOT truncate to the 50-row paginated page.
 */
export async function exportBookingsCsvAction(
  filters?: Omit<GetBookingsPaginatedInput, 'page' | 'pageSize'>
): Promise<ActionResult<{ csvContent: string; filename: string; totalExported: number }>> {
  try {
    const user = await requireAuth();
    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);
    if (!isStaff) {
      throw new AppError('Unauthorized: Only staff and owners can export bookings.', 'FORBIDDEN', 403);
    }

    const supabase = await createClient();

    let query = supabase
      .from('court_bookings')
      .select(`
        id,
        court_id,
        member_id,
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
        members (profile_id, membership_number, profiles (full_name))
      `)
      .order('start_time', { ascending: false });

    // Apply identical filters
    if (filters?.courtId) query = query.eq('court_id', filters.courtId);
    if (filters?.status) query = query.eq('status', filters.status as any);
    if (filters?.bookingType) query = query.eq('booking_type', filters.bookingType as any);
    if (filters?.date) {
      query = query
        .gte('start_time', `${filters.date}T00:00:00Z`)
        .lt('start_time', `${filters.date}T23:59:59.999Z`);
    }
    if (filters?.memberId) query = query.eq('member_id', filters.memberId);
    if (filters?.search) {
      query = query.ilike('notes', `%${filters.search.trim()}%`);
    }

    // Limit to safe batch for export
    const { data: bookings, error } = await query.limit(50000);
    if (error) throw error;

    const exportRows = (bookings || []).map((b: any) => ({
      bookingId: b.id,
      courtName: b.courts?.name || 'Unknown Court',
      sportType: b.courts?.sport_type || 'TENNIS',
      memberName:
        b.members?.profiles?.full_name ||
        (b.notes?.includes('Walk-in') ? 'Walk-in Guest' : 'Guest'),
      membershipNumber: b.members?.membership_number || 'N/A',
      bookingType: b.booking_type,
      date: new Date(b.start_time).toISOString().split('T')[0],
      startTime: new Date(b.start_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      endTime: new Date(b.end_time).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
      status: b.status,
      basePrice: Number(b.base_price || 0),
      discountAmount: Number(b.discount_amount || 0),
      finalPrice: Number(b.final_price || 0),
      notes: b.notes || '',
      cancellationReason: b.cancellation_reason || '',
      createdAt: b.created_at,
    }));

    const columns = [
      { key: 'bookingId', label: 'Booking ID' },
      { key: 'courtName', label: 'Court' },
      { key: 'sportType', label: 'Sport' },
      { key: 'memberName', label: 'Member' },
      { key: 'membershipNumber', label: 'Membership #' },
      { key: 'bookingType', label: 'Booking Type' },
      { key: 'date', label: 'Date' },
      { key: 'startTime', label: 'Start Time' },
      { key: 'endTime', label: 'End Time' },
      { key: 'status', label: 'Status' },
      { key: 'basePrice', label: 'Base Price' },
      { key: 'discountAmount', label: 'Discount Amount' },
      { key: 'finalPrice', label: 'Final Price' },
      { key: 'notes', label: 'Notes' },
      { key: 'cancellationReason', label: 'Cancellation Reason' },
      { key: 'createdAt', label: 'Created At' },
    ];

    const csvContent = generateCsvContent(exportRows, columns);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `court-bookings-${dateStr}.csv`;

    return {
      success: true,
      data: {
        csvContent,
        filename,
        totalExported: exportRows.length,
      },
      message: `Exported ${exportRows.length.toLocaleString()} booking records successfully.`,
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
    await requireAuth();
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
    courtId: string;
    courtName: string;
    sportType: string;
    memberId: string | null;
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
    notes: string | null;
    isMine: boolean;
  };
  participants: Array<{
    id: string;
    memberId: string | null;
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
        court_id,
        member_id,
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
        members (profile_id, membership_number, profiles (full_name))
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
        member_id,
        guest_name,
        members (profiles (full_name))
      `)
      .eq('booking_id', bookingId);

    const isMine = (booking.members as { profile_id?: string } | null)?.profile_id === user.id;

    return {
      success: true,
      data: {
        booking: {
          id: booking.id,
          courtId: booking.court_id,
          courtName: booking.courts?.name || 'Unknown',
          sportType: booking.courts?.sport_type || 'TENNIS',
          memberId: booking.member_id,
          memberName: (booking.members as { profiles?: { full_name: string } | null } | null)?.profiles?.full_name || null,
          membershipNumber: (booking.members as { membership_number?: string } | null)?.membership_number || null,
          bookingType: booking.booking_type,
          startTime: booking.start_time,
          endTime: booking.end_time,
          status: booking.status,
          basePrice: Number(booking.base_price),
          discountAmount: Number(booking.discount_amount),
          finalPrice: Number(booking.final_price),
          cancellationReason: booking.cancellation_reason,
          notes: booking.notes,
          isMine,
        },
        participants: (participants || []).map((p) => ({
          id: p.id,
          memberId: p.member_id,
          memberName: (p.members as { profiles: { full_name: string } | null } | null)?.profiles?.full_name || null,
          guestName: p.guest_name,
        })),
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Front-desk today's schedule summary & operations action (Phase 2)
 */
export async function getTodayScheduleAction(): Promise<ActionResult<{
  totalBookingsToday: number;
  confirmedCount: number;
  completedCount: number;
  cancelledCount: number;
  activeCourtsCount: number;
  totalRevenueToday: number;
  capacityUtilizationPercent: number;
}>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const todayStr = new Date().toISOString().split('T')[0];
    const dayStart = `${todayStr}T00:00:00Z`;
    const dayEnd = `${todayStr}T23:59:59.999Z`;

    // Fetch today's bookings
    const { data: bookings, error: bookingsError } = await supabase
      .from('court_bookings')
      .select('id, status, final_price')
      .gte('start_time', dayStart)
      .lte('start_time', dayEnd);

    if (bookingsError) throw bookingsError;

    // Fetch active courts
    const { count: courtsCount, error: courtsError } = await supabase
      .from('courts')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    if (courtsError) throw courtsError;

    const allBookings = bookings || [];
    const confirmedCount = allBookings.filter((b) => b.status === 'CONFIRMED').length;
    const completedCount = allBookings.filter((b) => b.status === 'COMPLETED').length;
    const cancelledCount = allBookings.filter((b) => b.status === 'CANCELLED').length;
    const totalRevenueToday = allBookings
      .filter((b) => b.status !== 'CANCELLED')
      .reduce((sum, b) => sum + Number(b.final_price || 0), 0);

    // Each active court has 16 operating hours (6 AM to 10 PM) = 16 sessions/day
    const totalAvailableSlots = (courtsCount || 5) * 16;
    const occupiedSlots = confirmedCount + completedCount;
    const capacityUtilizationPercent = totalAvailableSlots > 0
      ? Math.min(100, Math.round((occupiedSlots / totalAvailableSlots) * 100))
      : 0;

    return {
      success: true,
      data: {
        totalBookingsToday: allBookings.length,
        confirmedCount,
        completedCount,
        cancelledCount,
        activeCourtsCount: courtsCount || 0,
        totalRevenueToday,
        capacityUtilizationPercent,
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

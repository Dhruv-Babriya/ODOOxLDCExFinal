'use server';

import { createClient } from '@/lib/supabase/server';
import { courtBookingCreateSchema, bookingCancellationSchema, type CourtBookingCreateInput, type BookingCancellationInput } from '@/lib/validations/booking';
import { handleActionError, BookingConcurrencyError, AppError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth/session';
import { calculateCourtPrice } from '@/lib/pricing';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';

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

    // 2. Fetch member and membership plan if memberId provided or if user is a member
    const memberId = validated.memberId || user.memberId || null;
    let planData = null;
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
        planData = {
          tier: member.membership_plans.tier,
          courtDiscountPercent: Number(member.membership_plans.court_discount_percent),
          freeCourtHoursPerDay: member.membership_plans.free_court_hours_per_day,
        };

        // Count how many bookings member has already completed or confirmed today
        const bookingDate = new Date(validated.startTime).toISOString().split('T')[0];
        const { count } = await supabase
          .from('court_bookings')
          .select('id', { count: 'exact', head: true })
          .eq('member_id', memberId)
          .gte('start_time', `${bookingDate}T00:00:00Z`)
          .lte('start_time', `${bookingDate}T23:59:59Z`)
          .neq('status', 'CANCELLED');

        hoursBookedToday = count || 0;
      }
    }

    // 3. Compute price with member discounts
    const pricing = calculateCourtPrice({
      hourlyRate: Number(court.hourly_rate),
      plan: planData,
      hoursBookedToday,
    });

    // 4. Call atomic database stored procedure
    // This executes inside a PostgreSQL transaction and relies on:
    // EXCLUDE USING gist (court_id WITH =, tstzrange(start_time, end_time, '[)') WITH &&)
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
      if (rpcError.message.includes('MEMBER_DAILY_LIMIT_EXCEEDED')) {
        throw new AppError('Daily booking limit reached: Members can play at most twice per day.', 'DAILY_LIMIT_EXCEEDED', 400);
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

    // Verify booking belongs to user or user has staff role
    const { data: booking, error: fetchError } = await supabase
      .from('court_bookings')
      .select('id, member_id, status, members(profile_id)')
      .eq('id', validated.bookingId)
      .single();

    if (fetchError || !booking) {
      throw new AppError('Booking not found', 'NOT_FOUND', 404);
    }

    const isOwner = booking.members?.profile_id === user.id;
    const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(user.role);

    if (!isOwner && !isStaff) {
      throw new AppError('Unauthorized to cancel this booking', 'FORBIDDEN', 403);
    }

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

    return {
      success: true,
      data: { bookingId: validated.bookingId },
      message: 'Booking cancelled successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

'use server';

import { createClient } from '@/lib/supabase/server';
import {
  staffCreateSchema,
  staffShiftSchema,
  leaveRequestSchema,
  type StaffCreateInput,
  type StaffShiftInput,
  type LeaveRequestInput,
} from '@/lib/validations/staff';
import { handleActionError } from '@/lib/errors';
import { requirePermission, requireAuth } from '@/lib/auth/session';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Staff CRUD
// ---------------------------------------------------------------------------

/**
 * Create a new staff record linked to an existing user profile
 */
export async function createStaffAction(
  input: StaffCreateInput
): Promise<ActionResult<{ staffId: string }>> {
  try {
    const user = await requirePermission('staff:manage');
    const validated = staffCreateSchema.parse(input);
    const supabase = await createClient();

    const { data: staff, error } = await supabase
      .from('staff')
      .insert({
        profile_id: validated.profileId,
        employee_code: validated.employeeCode,
        department: validated.department,
        position: validated.position,
        hourly_rate: validated.hourlyRate,
        salary_monthly: validated.salaryMonthly,
        hire_date: validated.hireDate,
        is_active: validated.isActive,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/staff');
    return { success: true, data: { staffId: staff.id }, message: 'Staff member created successfully.' };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Update an existing staff record
 */
export async function updateStaffAction(
  staffId: string,
  input: Partial<StaffCreateInput>
): Promise<ActionResult<{ staffId: string }>> {
  try {
    await requirePermission('staff:manage');
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};
    if (input.department) updateData.department = input.department;
    if (input.position) updateData.position = input.position;
    if (input.hourlyRate !== undefined) updateData.hourly_rate = input.hourlyRate;
    if (input.salaryMonthly !== undefined) updateData.salary_monthly = input.salaryMonthly;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const { error } = await supabase
      .from('staff')
      .update(updateData)
      .eq('id', staffId);

    if (error) throw error;

    revalidatePath('/dashboard/staff');
    return { success: true, data: { staffId }, message: 'Staff record updated.' };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Shifts
// ---------------------------------------------------------------------------

/**
 * Create a new staff shift
 */
export async function createShiftAction(
  input: StaffShiftInput
): Promise<ActionResult<{ shiftId: string }>> {
  try {
    await requirePermission('shifts:manage');
    const validated = staffShiftSchema.parse(input);
    const supabase = await createClient();

    const { data: shift, error } = await supabase
      .from('staff_shifts')
      .insert({
        staff_id: validated.staffId,
        shift_date: validated.shiftDate,
        start_time: validated.startTime,
        end_time: validated.endTime,
        status: validated.status,
        notes: validated.notes || null,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/staff');
    return { success: true, data: { shiftId: shift.id }, message: 'Shift created successfully.' };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Update shift status
 */
export async function updateShiftStatusAction(
  shiftId: string,
  status: string
): Promise<ActionResult<{ shiftId: string }>> {
  try {
    await requirePermission('shifts:manage');
    const supabase = await createClient();

    const { error } = await supabase
      .from('staff_shifts')
      .update({ status })
      .eq('id', shiftId);

    if (error) throw error;

    revalidatePath('/dashboard/staff');
    return { success: true, data: { shiftId }, message: 'Shift status updated.' };
  } catch (err) {
    return handleActionError(err);
  }
}

// ---------------------------------------------------------------------------
// Leave Requests
// ---------------------------------------------------------------------------

/**
 * Submit a new leave request (any staff member can submit for themselves)
 */
export async function submitLeaveRequestAction(
  input: LeaveRequestInput
): Promise<ActionResult<{ leaveId: string }>> {
  try {
    await requirePermission('leave:submit');
    const validated = leaveRequestSchema.parse(input);
    const supabase = await createClient();

    const { data: leave, error } = await supabase
      .from('leave_requests')
      .insert({
        staff_id: validated.staffId,
        leave_type: validated.leaveType,
        start_date: validated.startDate,
        end_date: validated.endDate,
        reason: validated.reason,
        status: 'PENDING',
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/staff');
    return { success: true, data: { leaveId: leave.id }, message: 'Leave request submitted.' };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Approve or reject a leave request (Owner/Admin only)
 */
export async function reviewLeaveRequestAction(
  leaveId: string,
  decision: 'APPROVED' | 'REJECTED',
  reviewNotes?: string
): Promise<ActionResult<{ leaveId: string }>> {
  try {
    const user = await requirePermission('leave:approve');
    const supabase = await createClient();

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
      })
      .eq('id', leaveId)
      .eq('status', 'PENDING'); // Only allow review of pending requests

    if (error) throw error;

    revalidatePath('/dashboard/staff');
    return { success: true, data: { leaveId }, message: `Leave request ${decision.toLowerCase()}.` };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Cancel a leave request (only if still PENDING)
 */
export async function cancelLeaveRequestAction(
  leaveId: string
): Promise<ActionResult<{ leaveId: string }>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase
      .from('leave_requests')
      .update({ status: 'CANCELLED' })
      .eq('id', leaveId)
      .eq('status', 'PENDING');

    if (error) throw error;

    revalidatePath('/dashboard/staff');
    return { success: true, data: { leaveId }, message: 'Leave request cancelled.' };
  } catch (err) {
    return handleActionError(err);
  }
}

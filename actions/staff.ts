'use server';

import { createClient } from '@/lib/supabase/server';
import {
  staffCreateSchema,
  staffOnboardSchema,
  staffShiftSchema,
  leaveRequestSchema,
  type StaffCreateInput,
  type StaffOnboardInput,
  type StaffShiftInput,
  type LeaveRequestInput,
} from '@/lib/validations/staff';
import { handleActionError } from '@/lib/errors';
import { requirePermission, requireAuth, requireRole } from '@/lib/auth/session';
import type { ActionResult } from '@/types/shared';
import type { Database } from '@/types/database.types';
import { revalidatePath } from 'next/cache';
import type { StaffMember, StaffShift, StaffLeave } from '@/components/dashboard/staff/StaffDashboardClient';

// ---------------------------------------------------------------------------
// Staff CRUD & Manager Provisioning
// ---------------------------------------------------------------------------

/**
 * Onboard a new staff member (Manager / Owner account only).
 * Provisions the user credentials, sets role (FRONT_DESK, SHOP_STAFF, BAR_STAFF, ADMIN),
 * and creates the employee record in public.staff.
 */
export async function onboardStaffAction(
  input: StaffOnboardInput
): Promise<ActionResult<{ staffId: string; profileId: string; email: string }>> {
  try {
    await requirePermission('staff:manage');
    const validated = staffOnboardSchema.parse(input);
    const supabase = await createClient();

    const rpcClient = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>
    ) => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;

    const { data: result, error: rpcError } = await rpcClient('onboard_staff_direct', {
      p_email: validated.email,
      p_password: validated.password,
      p_full_name: validated.fullName,
      p_phone: validated.phone || null,
      p_role: validated.role,
      p_employee_code: validated.employeeCode,
      p_department: validated.department,
      p_position: validated.position,
      p_hourly_rate: validated.hourlyRate,
      p_salary_monthly: validated.salaryMonthly,
      p_hire_date: validated.hireDate,
    });

    if (rpcError) {
      return {
        success: false,
        error: rpcError.message,
        code: 'STAFF_ONBOARD_FAILED',
      };
    }

    revalidatePath('/dashboard/staff');
    return {
      success: true,
      data: {
        staffId: (result?.staff_id as string) || '',
        profileId: (result?.profile_id as string) || '',
        email: validated.email,
      },
      message: `Staff member ${validated.fullName} (${validated.role}) onboarded successfully!`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Create a new staff record linked to an existing user profile
 */
export async function createStaffAction(
  input: StaffCreateInput
): Promise<ActionResult<{ staffId: string }>> {
  try {
    await requirePermission('staff:manage');
    const validated = staffCreateSchema.parse(input);
    const supabase = await createClient();

    const { data: staff, error } = await supabase
      .from('staff')
      .insert({
        profile_id: validated.profileId,
        employee_code: validated.employeeCode,
        department: validated.department as Database['public']['Enums']['app_department'],
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

    const updateData: Database['public']['Tables']['staff']['Update'] = {};
    if (input.department) updateData.department = input.department as Database['public']['Enums']['app_department'];
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
        status: validated.status as Database['public']['Enums']['app_shift_status'],
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
      .update({ status: status as Database['public']['Enums']['app_shift_status'] })
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
        leave_type: validated.leaveType as Database['public']['Enums']['app_leave_type'],
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

// ---------------------------------------------------------------------------
// Staff Operational Queries & Approvals
// ---------------------------------------------------------------------------

export interface StaffDashboardData {
  staff: StaffMember[];
  shifts: StaffShift[];
  leaves: StaffLeave[];
}

export async function getStaffDashboardDataAction(): Promise<ActionResult<StaffDashboardData>> {
  try {
    await requirePermission('shifts:read');
    const supabase = await createClient();

    // 1. Fetch Staff with Profiles
    const { data: staff, error: staffError } = await supabase
      .from('staff')
      .select(`
        id, employee_code, department, position, is_active,
        profile:profiles(id, full_name, email, role)
      `)
      .order('created_at', { ascending: false });
    if (staffError) throw staffError;

    // 2. Fetch Shifts (Today and Upcoming)
    const today = new Date().toISOString().split('T')[0];
    const { data: shifts, error: shiftsError } = await supabase
      .from('staff_shifts')
      .select(`
        id, shift_date, start_time, end_time, status, notes,
        staff:staff(id, employee_code, profile:profiles(full_name))
      `)
      .gte('shift_date', today)
      .order('shift_date', { ascending: true })
      .order('start_time', { ascending: true });
    if (shiftsError) throw shiftsError;

    // 3. Fetch Leaves
    const { data: leaves, error: leavesError } = await supabase
      .from('leave_requests')
      .select(`
        id, leave_type, start_date, end_date, reason, status,
        staff:staff(id, employee_code, profile:profiles(full_name))
      `)
      .order('created_at', { ascending: false });
    if (leavesError) throw leavesError;

    return {
      success: true,
      data: {
        staff: (staff || []) as unknown as StaffMember[],
        shifts: (shifts || []) as unknown as StaffShift[],
        leaves: (leaves || []) as unknown as StaffLeave[],
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}

export async function updateLeaveStatusAction(leaveId: string, status: 'APPROVED' | 'REJECTED') {
  try {
    const user = await requireRole(['ADMIN', 'OWNER']);
    const supabase = await createClient();

    const { error } = await supabase
      .from('leave_requests')
      .update({ status, reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', leaveId);
      
    if (error) throw error;
    revalidatePath('/dashboard/staff');
    return { success: true, data: { id: leaveId } };
  } catch (error) {
    return handleActionError(error);
  }
}

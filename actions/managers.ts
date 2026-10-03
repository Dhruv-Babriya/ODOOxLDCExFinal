'use server';

import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth/session';
import { handleActionError } from '@/lib/errors';
import type { ActionResult } from '@/types/shared';
import type { Database } from '@/types/database.types';
import { revalidatePath } from 'next/cache';
import {
  managerCreateSchema,
  managerUpdateSchema,
  type ManagerCreateInput,
  type ManagerUpdateInput,
} from '@/lib/validations/manager';

export interface ManagerItem {
  id: string; // profile id
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  staffRecord?: {
    id: string;
    employeeCode: string;
    department: string;
    position: string;
    salaryMonthly: number;
    hireDate: string;
    isActive: boolean;
  } | null;
}

export interface PaginatedManagersResult {
  managers: ManagerItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get all Club Managers (role = ADMIN) with pagination and optional search filter.
 * Strictly restricted to Club Owner.
 */
export async function getManagersAction(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
}): Promise<ActionResult<PaginatedManagersResult>> {
  try {
    await requireRole(['OWNER']);
    const supabase = await createClient();

    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, Math.min(params?.pageSize || 5, 50));
    const search = params?.search?.trim().toLowerCase() || '';

    // Build query for profiles with role = ADMIN
    let query = supabase
      .from('profiles')
      .select(
        `
        id, email, full_name, phone, role, is_active, created_at,
        staff:staff(id, employee_code, department, position, salary_monthly, hire_date, is_active)
      `,
        { count: 'exact' }
      )
      .eq('role', 'ADMIN')
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);
    if (error) throw error;

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize) || 1;

    const managers: ManagerItem[] = (data || []).map((row) => {
      // row.staff is either an array or single object depending on relation
      const staffArr = Array.isArray(row.staff) ? row.staff : row.staff ? [row.staff] : [];
      const staffRec = staffArr[0] as
        | {
            id: string;
            employee_code: string;
            department: string;
            position: string;
            salary_monthly: number;
            hire_date: string;
            is_active: boolean;
          }
        | undefined;

      return {
        id: row.id,
        email: row.email,
        fullName: row.full_name || 'Club Manager',
        phone: row.phone,
        role: row.role,
        isActive: row.is_active,
        createdAt: row.created_at,
        staffRecord: staffRec
          ? {
              id: staffRec.id,
              employeeCode: staffRec.employee_code,
              department: staffRec.department,
              position: staffRec.position,
              salaryMonthly: Number(staffRec.salary_monthly || 0),
              hireDate: staffRec.hire_date,
              isActive: staffRec.is_active,
            }
          : null,
      };
    });

    return {
      success: true,
      data: {
        managers,
        total,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Add a new Club Manager.
 * Strictly assigns role = ADMIN and department = MANAGEMENT.
 * Only the Club Owner can invoke this.
 */
export async function createManagerAction(
  input: ManagerCreateInput
): Promise<ActionResult<{ managerId: string; email: string }>> {
  try {
    await requireRole(['OWNER']);
    const validated = managerCreateSchema.parse(input);
    const supabase = await createClient();

    // Ensure session is active and auth headers are attached for PostgREST RPC
    const {
      data: { user: authUser },
      error: userAuthError,
    } = await supabase.auth.getUser();

    if (userAuthError || !authUser) {
      return {
        success: false,
        error: 'Your session has expired or is invalid. Please sign in again as Club Owner.',
        code: 'UNAUTHENTICATED',
      };
    }

    const { data: result, error: rpcError } = await (supabase as any).rpc('onboard_staff_direct', {
      p_email: validated.email.trim().toLowerCase(),
      p_password: validated.password,
      p_full_name: validated.fullName.trim(),
      p_phone: validated.phone?.trim() || null,
      p_role: 'ADMIN', // Strictly ADMIN role
      p_employee_code: validated.employeeCode.trim(),
      p_department: validated.department,
      p_position: validated.position.trim(),
      p_hourly_rate: 0,
      p_salary_monthly: validated.salaryMonthly,
      p_hire_date: validated.hireDate,
    });

    if (rpcError) {
      let friendlyError = rpcError.message;
      const lowerMsg = (rpcError.message || '').toLowerCase();
      const lowerDetails = (rpcError.details || '').toLowerCase();

      if (rpcError.code === '23505' || lowerMsg.includes('duplicate key') || lowerMsg.includes('unique constraint')) {
        if (lowerDetails.includes('email') || lowerMsg.includes('email')) {
          friendlyError = `A user or manager with email "${validated.email}" already exists.`;
        } else if (lowerDetails.includes('employee_code') || lowerMsg.includes('employee_code')) {
          friendlyError = `Employee code "${validated.employeeCode}" is already in use. Please enter a different code.`;
        } else {
          friendlyError = 'A record with this identifier already exists.';
        }
      } else if (rpcError.code === '42501' || lowerMsg.includes('access denied')) {
        friendlyError = 'Access denied: Only authenticated Club Owners can provision new managers.';
      }

      return {
        success: false,
        error: friendlyError,
        code: rpcError.code || 'MANAGER_CREATION_FAILED',
      };
    }

    revalidatePath('/dashboard/managers');
    revalidatePath('/dashboard/staff');
    return {
      success: true,
      data: {
        managerId: (result?.profile_id as string) || '',
        email: validated.email,
      },
      message: `Club Manager "${validated.fullName}" created successfully!`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Update an existing Club Manager's details.
 * Owner can update name, phone, position, department, monthly salary, and active status.
 */
export async function updateManagerAction(
  managerId: string,
  input: ManagerUpdateInput
): Promise<ActionResult<{ managerId: string }>> {
  try {
    await requireRole(['OWNER']);
    const validated = managerUpdateSchema.parse(input);
    const supabase = await createClient();

    // 1. Verify target is a Manager (role = ADMIN)
    const { data: targetProfile, error: profileFetchError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', managerId)
      .single();

    if (profileFetchError || !targetProfile || targetProfile.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Target user is not a Club Manager or does not exist.',
        code: 'INVALID_TARGET',
      };
    }

    // 2. Update profile
    const profileUpdate: Database['public']['Tables']['profiles']['Update'] = {};
    if (validated.fullName !== undefined) profileUpdate.full_name = validated.fullName;
    if (validated.phone !== undefined) profileUpdate.phone = validated.phone || null;
    if (validated.isActive !== undefined) profileUpdate.is_active = validated.isActive;

    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', managerId);
      if (profileError) throw profileError;
    }

    // 3. Update staff record if exists
    const staffUpdate: Database['public']['Tables']['staff']['Update'] = {};
    if (validated.position !== undefined) staffUpdate.position = validated.position;
    if (validated.department !== undefined) staffUpdate.department = validated.department as Database['public']['Enums']['app_department'];
    if (validated.salaryMonthly !== undefined) staffUpdate.salary_monthly = validated.salaryMonthly;
    if (validated.isActive !== undefined) staffUpdate.is_active = validated.isActive;

    if (Object.keys(staffUpdate).length > 0) {
      await supabase
        .from('staff')
        .update(staffUpdate)
        .eq('profile_id', managerId);
    }

    revalidatePath('/dashboard/managers');
    revalidatePath('/dashboard/staff');
    return {
      success: true,
      data: { managerId },
      message: 'Manager details updated successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Delete or Deactivate a Club Manager.
 * Strictly restricted to Club Owner.
 */
export async function deleteManagerAction(
  managerId: string,
  hardDelete = false
): Promise<ActionResult<{ managerId: string }>> {
  try {
    const owner = await requireRole(['OWNER']);
    if (owner.id === managerId) {
      return {
        success: false,
        error: 'You cannot delete or deactivate your own Club Owner account.',
        code: 'SELF_DELETE_FORBIDDEN',
      };
    }

    const supabase = await createClient();

    // Verify target is an ADMIN
    const { data: targetProfile, error: fetchErr } = await supabase
      .from('profiles')
      .select('id, role, full_name')
      .eq('id', managerId)
      .single();

    if (fetchErr || !targetProfile || targetProfile.role !== 'ADMIN') {
      return {
        success: false,
        error: 'Target user is not a Club Manager.',
        code: 'INVALID_TARGET',
      };
    }

    if (hardDelete) {
      // Remove staff record first
      await supabase.from('staff').delete().eq('profile_id', managerId);
      // Mark profile as inactive and revoke admin role to prevent unauthorized access
      await supabase.from('profiles').update({ is_active: false, role: 'MEMBER' }).eq('id', managerId);
    } else {
      // Soft deactivate
      await supabase.from('staff').update({ is_active: false }).eq('profile_id', managerId);
      await supabase.from('profiles').update({ is_active: false }).eq('id', managerId);
    }

    revalidatePath('/dashboard/managers');
    revalidatePath('/dashboard/staff');
    return {
      success: true,
      data: { managerId },
      message: `Club Manager "${targetProfile.full_name || 'Manager'}" has been ${hardDelete ? 'removed' : 'deactivated'}.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

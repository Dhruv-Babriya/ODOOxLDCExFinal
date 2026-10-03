'use server';

import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/database.types';
import {
  memberCreateSchema,
  memberRegisterSchema,
  memberUpdateSchema,
  memberRenewalSchema,
  memberStatusUpdateSchema,
  type MemberCreateInput,
  type MemberRegisterInput,
  type MemberUpdateInput,
  type MemberRenewalInput,
  type MemberStatusUpdateInput,
} from '@/lib/validations/member';
import { handleActionError } from '@/lib/errors';
import { requirePermission } from '@/lib/auth/session';
import {
  calculateMembershipExpiryStatus,
  type ActionResult,
  type MemberWithDetails,
  type MembershipHistoryItem,
} from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Server action to register a new member with full profile details (Front desk & Walk-in registration)
 */
export async function registerMemberAction(
  input: MemberRegisterInput
): Promise<ActionResult<{ memberId: string; membershipNumber: string }>> {
  try {
    const user = await requirePermission('members:manage');
    const validated = memberRegisterSchema.parse(input);
    const supabase = await createClient();

    // 1. Check if profile already exists by email or create new profile
    let profileId: string;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', validated.email)
      .maybeSingle();

    if (existingProfile) {
      profileId = existingProfile.id;

      // Update phone or name if provided
      await supabase
        .from('profiles')
        .update({
          full_name: validated.fullName,
          phone: validated.phone || null,
        })
        .eq('id', profileId);
    } else {
      // Create new profile record with auto-generated UUID
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: crypto.randomUUID(),
          email: validated.email,
          full_name: validated.fullName,
          phone: validated.phone || null,
          role: 'MEMBER',
          is_active: true,
        })
        .select('id')
        .single();

      if (profileError || !newProfile) {
        throw new Error(profileError?.message || 'Failed to create member user profile');
      }
      profileId = newProfile.id;
    }

    // 2. Verify profile does not already have an active member record
    const { data: existingMember } = await supabase
      .from('members')
      .select('id, membership_number')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (existingMember) {
      return {
        success: false,
        error: `This profile is already registered as member #${existingMember.membership_number}`,
        code: 'MEMBER_EXISTS',
      };
    }

    // 3. Insert member record
    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        profile_id: profileId,
        membership_number: validated.membershipNumber,
        current_plan_id: validated.planId,
        status: 'ACTIVE',
        start_date: validated.startDate,
        end_date: validated.endDate,
        emergency_contact: validated.emergencyContact || null,
        notes: validated.notes || null,
      })
      .select('id')
      .single();

    if (memberError || !member) {
      throw memberError || new Error('Failed to create member record');
    }

    // 4. Record initial entry in membership_history
    await supabase.from('membership_history').insert({
      member_id: member.id,
      plan_id: validated.planId,
      start_date: validated.startDate,
      end_date: validated.endDate,
      status: 'ACTIVE',
      changed_by: user.id,
      notes: validated.notes ? `Initial registration: ${validated.notes}` : 'Initial registration',
    });

    revalidatePath('/dashboard/members');
    revalidatePath('/dashboard/membership-plans');

    return {
      success: true,
      data: { memberId: member.id, membershipNumber: validated.membershipNumber },
      message: `Member #${validated.membershipNumber} registered successfully.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to register a member linking directly to an existing profile UUID
 */
export async function createMemberAction(
  input: MemberCreateInput
): Promise<ActionResult<{ memberId: string }>> {
  try {
    const user = await requirePermission('members:manage');
    const validated = memberCreateSchema.parse(input);
    const supabase = await createClient();

    const { data: member, error: memberError } = await supabase
      .from('members')
      .insert({
        profile_id: validated.profileId,
        membership_number: validated.membershipNumber,
        current_plan_id: validated.currentPlanId,
        status: validated.status,
        start_date: validated.startDate,
        end_date: validated.endDate,
        emergency_contact: validated.emergencyContact || null,
        notes: validated.notes || null,
      })
      .select('id')
      .single();

    if (memberError || !member) {
      throw memberError || new Error('Failed to create member record');
    }

    await supabase.from('membership_history').insert({
      member_id: member.id,
      plan_id: validated.currentPlanId,
      start_date: validated.startDate,
      end_date: validated.endDate,
      status: validated.status,
      changed_by: user.id,
      notes: 'Initial registration',
    });

    revalidatePath('/dashboard/members');

    return {
      success: true,
      data: { memberId: member.id },
      message: 'Member registered successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to fetch members with optional search query, status, and tier filters
 */
export async function getMembersAction(params?: {
  query?: string;
  status?: string;
  tier?: string;
}): Promise<ActionResult<MemberWithDetails[]>> {
  try {
    await requirePermission('members:read');
    const supabase = await createClient();

    let queryBuilder = supabase
      .from('members')
      .select(`
        id,
        profile_id,
        membership_number,
        current_plan_id,
        status,
        start_date,
        end_date,
        emergency_contact,
        notes,
        created_at,
        updated_at,
        profiles (
          id,
          email,
          full_name,
          phone,
          role,
          avatar_url,
          is_active
        ),
        membership_plans (
          id,
          name,
          tier,
          description,
          duration_days,
          price,
          court_discount_percent,
          shop_discount_percent,
          bar_discount_percent,
          free_court_hours_per_day,
          max_daily_bookings,
          is_active
        )
      `)
      .order('created_at', { ascending: false });

    if (params?.status && params.status !== 'ALL') {
      queryBuilder = queryBuilder.eq('status', params.status as Database['public']['Enums']['app_membership_status']);
    }

    const { data, error } = await queryBuilder;

    if (error) throw error;

    let items = (data || []).map((raw) => {
      const m = raw as unknown as MemberWithDetails;
      const expiry = calculateMembershipExpiryStatus(m.status, m.end_date);
      return {
        ...m,
        derived_status: expiry.derivedStatus,
        days_remaining: expiry.daysRemaining,
      };
    });

    // Client-side search and tier filtering
    if (params?.query && params.query.trim()) {
      const q = params.query.toLowerCase().trim();
      items = items.filter(
        (m) =>
          m.membership_number.toLowerCase().includes(q) ||
          m.profiles?.full_name?.toLowerCase().includes(q) ||
          m.profiles?.email?.toLowerCase().includes(q) ||
          m.profiles?.phone?.toLowerCase().includes(q)
      );
    }

    if (params?.tier && params.tier !== 'ALL') {
      items = items.filter((m) => m.membership_plans?.tier === params.tier);
    }

    return {
      success: true,
      data: items,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to fetch a member's complete details including membership history
 */
export async function getMemberDetailsAction(memberId: string): Promise<
  ActionResult<{
    member: MemberWithDetails;
    history: MembershipHistoryItem[];
  }>
> {
  try {
    await requirePermission('members:read');
    const supabase = await createClient();

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select(`
        id,
        profile_id,
        membership_number,
        current_plan_id,
        status,
        start_date,
        end_date,
        emergency_contact,
        notes,
        created_at,
        updated_at,
        profiles (
          id,
          email,
          full_name,
          phone,
          role,
          avatar_url,
          is_active
        ),
        membership_plans (
          id,
          name,
          tier,
          description,
          duration_days,
          price,
          court_discount_percent,
          shop_discount_percent,
          bar_discount_percent,
          free_court_hours_per_day,
          max_daily_bookings,
          is_active
        )
      `)
      .eq('id', memberId)
      .single();

    if (memberError || !memberData) {
      return {
        success: false,
        error: 'Member not found',
        code: 'NOT_FOUND',
      };
    }

    const expiry = calculateMembershipExpiryStatus(memberData.status, memberData.end_date);
    const member = {
      ...memberData,
      derived_status: expiry.derivedStatus,
      days_remaining: expiry.daysRemaining,
    } as MemberWithDetails;

    // Fetch history
    const { data: historyData, error: historyError } = await supabase
      .from('membership_history')
      .select(`
        id,
        member_id,
        plan_id,
        start_date,
        end_date,
        status,
        changed_by,
        notes,
        created_at,
        membership_plans (
          name,
          tier,
          price
        ),
        profiles:changed_by (
          full_name,
          email
        )
      `)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });

    if (historyError) {
      console.warn('Could not fetch membership history:', historyError);
    }

    return {
      success: true,
      data: {
        member,
        history: (historyData as unknown as MembershipHistoryItem[]) || [],
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to update member contact info, emergency contact, or notes
 */
export async function updateMemberAction(
  input: MemberUpdateInput
): Promise<ActionResult<{ memberId: string }>> {
  try {
    await requirePermission('members:manage');
    const validated = memberUpdateSchema.parse(input);
    const supabase = await createClient();

    // 1. Fetch member to obtain linked profile_id
    const { data: existing, error: findError } = await supabase
      .from('members')
      .select('profile_id, status')
      .eq('id', validated.id)
      .single();

    if (findError || !existing) {
      return { success: false, error: 'Member not found', code: 'NOT_FOUND' };
    }

    // 2. Update member table
    const memberUpdates: Database['public']['Tables']['members']['Update'] = {};
    if (validated.emergencyContact !== undefined) memberUpdates.emergency_contact = validated.emergencyContact || null;
    if (validated.notes !== undefined) memberUpdates.notes = validated.notes || null;
    if (validated.status !== undefined) memberUpdates.status = validated.status;

    if (Object.keys(memberUpdates).length > 0) {
      const { error: updateError } = await supabase
        .from('members')
        .update(memberUpdates)
        .eq('id', validated.id);

      if (updateError) throw updateError;
    }

    // 3. Update profile table if name/phone provided
    const profileUpdates: Database['public']['Tables']['profiles']['Update'] = {};
    if (validated.fullName) profileUpdates.full_name = validated.fullName;
    if (validated.phone !== undefined) profileUpdates.phone = validated.phone || null;

    if (Object.keys(profileUpdates).length > 0 && existing.profile_id) {
      await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', existing.profile_id);
    }

    revalidatePath('/dashboard/members');
    revalidatePath(`/dashboard/members/${validated.id}`);

    return {
      success: true,
      data: { memberId: validated.id },
      message: 'Member details updated successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to renew or change a member's membership plan
 * Preserves audit trail in membership_history
 */
export async function renewMembershipAction(
  input: MemberRenewalInput
): Promise<ActionResult<{ memberId: string }>> {
  try {
    const user = await requirePermission('members:manage');
    const validated = memberRenewalSchema.parse(input);
    const supabase = await createClient();

    // 1. Fetch current member and plan
    const { data: member, error: memberError } = await supabase
      .from('members')
      .select('id, current_plan_id, status, end_date')
      .eq('id', validated.memberId)
      .single();

    if (memberError || !member) {
      return { success: false, error: 'Member record not found', code: 'NOT_FOUND' };
    }

    // 2. Update member plan and dates
    const { error: updateError } = await supabase
      .from('members')
      .update({
        current_plan_id: validated.planId,
        start_date: validated.startDate,
        end_date: validated.endDate,
        status: 'ACTIVE',
      })
      .eq('id', validated.memberId);

    if (updateError) throw updateError;

    // 3. Insert audit entry in membership_history
    const isPlanChange = member.current_plan_id !== validated.planId;
    const historyNote = validated.notes
      ? `${isPlanChange ? 'Plan upgraded/changed' : 'Membership renewed'}: ${validated.notes}`
      : isPlanChange
      ? 'Membership plan changed'
      : 'Membership renewed for another term';

    await supabase.from('membership_history').insert({
      member_id: validated.memberId,
      plan_id: validated.planId,
      start_date: validated.startDate,
      end_date: validated.endDate,
      status: 'ACTIVE',
      changed_by: user.id,
      notes: historyNote,
    });

    revalidatePath('/dashboard/members');
    revalidatePath(`/dashboard/members/${validated.memberId}`);

    return {
      success: true,
      data: { memberId: validated.memberId },
      message: isPlanChange
        ? 'Membership plan updated and logged.'
        : 'Membership renewed successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to update member lifecycle status (e.g. SUSPEND, CANCEL, REACTIVATE)
 * Automatically logs status transition into membership_history
 */
export async function updateMemberStatusAction(
  input: MemberStatusUpdateInput
): Promise<ActionResult<{ memberId: string; status: string }>> {
  try {
    const user = await requirePermission('members:manage');
    const validated = memberStatusUpdateSchema.parse(input);
    const supabase = await createClient();

    const { data: member, error: fetchError } = await supabase
      .from('members')
      .select('id, current_plan_id, start_date, end_date, status')
      .eq('id', validated.memberId)
      .single();

    if (fetchError || !member) {
      return { success: false, error: 'Member not found', code: 'NOT_FOUND' };
    }

    const { error: updateError } = await supabase
      .from('members')
      .update({ status: validated.status })
      .eq('id', validated.memberId);

    if (updateError) throw updateError;

    // Record transition in history
    if (member.current_plan_id) {
      await supabase.from('membership_history').insert({
        member_id: validated.memberId,
        plan_id: member.current_plan_id,
        start_date: member.start_date,
        end_date: member.end_date,
        status: validated.status,
        changed_by: user.id,
        notes: validated.notes || `Status transition from ${member.status} to ${validated.status}`,
      });
    }

    revalidatePath('/dashboard/members');
    revalidatePath(`/dashboard/members/${validated.memberId}`);

    return {
      success: true,
      data: { memberId: validated.memberId, status: validated.status },
      message: `Member status updated to ${validated.status}.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

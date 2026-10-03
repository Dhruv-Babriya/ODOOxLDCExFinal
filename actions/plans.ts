'use server';

import { createClient } from '@/lib/supabase/server';
import {
  membershipPlanSchema,
  membershipPlanUpdateSchema,
  type MembershipPlanInput,
  type MembershipPlanUpdateInput,
} from '@/lib/validations/member';
import { handleActionError } from '@/lib/errors';
import { requirePermission } from '@/lib/auth/session';
import type { ActionResult, MembershipPlanItem } from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Server action to fetch all membership plans with enrolled active member count
 */
export async function getMembershipPlansAction(): Promise<ActionResult<MembershipPlanItem[]>> {
  try {
    const supabase = await createClient();

    // 1. Fetch plans
    const { data: plans, error: plansError } = await supabase
      .from('membership_plans')
      .select('*')
      .order('price', { ascending: false });

    if (plansError) throw plansError;

    // 2. Fetch member counts per plan
    const { data: members, error: membersError } = await supabase
      .from('members')
      .select('current_plan_id, status')
      .eq('status', 'ACTIVE');

    if (membersError) {
      console.warn('Could not fetch member counts for plans:', membersError);
    }

    const counts: Record<string, number> = {};
    for (const m of members || []) {
      if (m.current_plan_id) {
        counts[m.current_plan_id] = (counts[m.current_plan_id] || 0) + 1;
      }
    }

    const planItems: MembershipPlanItem[] = (plans || []).map((p) => ({
      ...p,
      member_count: counts[p.id] || 0,
    }));

    return {
      success: true,
      data: planItems,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to create a new membership plan
 */
export async function createMembershipPlanAction(
  input: MembershipPlanInput
): Promise<ActionResult<{ planId: string }>> {
  try {
    await requirePermission('membership_plans:manage');
    const validated = membershipPlanSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('membership_plans')
      .insert({
        name: validated.name,
        tier: validated.tier,
        description: validated.description || null,
        duration_days: validated.durationDays,
        price: validated.price,
        court_discount_percent: validated.courtDiscountPercent,
        shop_discount_percent: validated.shopDiscountPercent,
        bar_discount_percent: validated.barDiscountPercent,
        free_court_hours_per_day: validated.freeCourtHoursPerDay,
        max_daily_bookings: validated.maxDailyBookings,
        is_active: validated.isActive,
      })
      .select('id')
      .single();

    if (error || !data) {
      throw error || new Error('Failed to create membership plan');
    }

    revalidatePath('/dashboard/membership-plans');
    revalidatePath('/dashboard/members');

    return {
      success: true,
      data: { planId: data.id },
      message: `Membership plan "${validated.name}" created successfully.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to update an existing membership plan's pricing, benefits, and rules
 */
export async function updateMembershipPlanAction(
  input: MembershipPlanUpdateInput
): Promise<ActionResult<{ planId: string }>> {
  try {
    await requirePermission('membership_plans:manage');
    const validated = membershipPlanUpdateSchema.parse(input);
    const supabase = await createClient();

    const { error } = await supabase
      .from('membership_plans')
      .update({
        name: validated.name,
        tier: validated.tier,
        description: validated.description || null,
        duration_days: validated.durationDays,
        price: validated.price,
        court_discount_percent: validated.courtDiscountPercent,
        shop_discount_percent: validated.shopDiscountPercent,
        bar_discount_percent: validated.barDiscountPercent,
        free_court_hours_per_day: validated.freeCourtHoursPerDay,
        max_daily_bookings: validated.maxDailyBookings,
        is_active: validated.isActive,
      })
      .eq('id', validated.id);

    if (error) throw error;

    revalidatePath('/dashboard/membership-plans');
    revalidatePath('/dashboard/members');

    return {
      success: true,
      data: { planId: validated.id },
      message: `Membership plan "${validated.name}" updated successfully.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to toggle plan active status
 */
export async function togglePlanStatusAction(
  planId: string,
  isActive: boolean
): Promise<ActionResult<null>> {
  try {
    await requirePermission('membership_plans:manage');
    const supabase = await createClient();

    const { error } = await supabase
      .from('membership_plans')
      .update({ is_active: isActive })
      .eq('id', planId);

    if (error) throw error;

    revalidatePath('/dashboard/membership-plans');

    return {
      success: true,
      data: null,
      message: `Plan ${isActive ? 'activated' : 'archived'} successfully.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

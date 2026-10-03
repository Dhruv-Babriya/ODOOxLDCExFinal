'use server';

import { createClient } from '@/lib/supabase/server';
import { memberCreateSchema, type MemberCreateInput } from '@/lib/validations/member';
import { handleActionError } from '@/lib/errors';
import { requirePermission } from '@/lib/auth/session';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Server action to register a new member with an assigned plan
 */
export async function createMemberAction(
  input: MemberCreateInput
): Promise<ActionResult<{ memberId: string }>> {
  try {
    // Only staff with members:manage permission can register a member
    const user = await requirePermission('members:manage');
    const validated = memberCreateSchema.parse(input);
    const supabase = await createClient();

    // 1. Insert member record
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

    if (memberError) {
      throw memberError;
    }

    // 2. Insert initial entry into membership_history to preserve audit trail
    const { error: historyError } = await supabase
      .from('membership_history')
      .insert({
        member_id: member.id,
        plan_id: validated.currentPlanId,
        start_date: validated.startDate,
        end_date: validated.endDate,
        status: validated.status,
        changed_by: user.id,
        notes: 'Initial registration',
      });

    if (historyError) {
      console.warn('Could not record membership history:', historyError);
    }

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

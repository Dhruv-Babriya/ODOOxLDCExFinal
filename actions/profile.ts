'use server';

import { createClient } from '@/lib/supabase/server';
import { updateProfileSchema, type UpdateProfileInput } from '@/lib/validations/profile';
import { handleActionError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth/session';
import type { ActionResult, MemberWithDetails } from '@/types/shared';
import { revalidatePath } from 'next/cache';

export interface UserProfileWithMembership {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: string;
  avatarUrl: string | null;
  isActive: boolean;
  member: MemberWithDetails | null;
}

/**
 * Server action to get the active user's profile and their membership details if linked
 */
export async function getProfileAction(): Promise<ActionResult<UserProfileWithMembership>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw profileError || new Error('Profile not found');
    }

    // Check if linked to member
    const { data: member } = await supabase
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
      .eq('profile_id', user.id)
      .maybeSingle();

    return {
      success: true,
      data: {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        phone: profile.phone,
        role: profile.role,
        avatarUrl: profile.avatar_url,
        isActive: profile.is_active,
        member: (member as unknown as MemberWithDetails) || null,
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to update user profile information
 */
export async function updateProfileAction(
  input: UpdateProfileInput
): Promise<ActionResult<{ userId: string }>> {
  try {
    const user = await requireAuth();
    const validated = updateProfileSchema.parse(input);
    const supabase = await createClient();

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: validated.fullName,
        phone: validated.phone || null,
        avatar_url: validated.avatarUrl || null,
      })
      .eq('id', user.id);

    if (error) throw error;

    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard');

    return {
      success: true,
      data: { userId: user.id },
      message: 'Profile updated successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

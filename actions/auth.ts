'use server';

import { createClient } from '@/lib/supabase/server';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@/lib/validations/auth';
import { handleActionError } from '@/lib/errors';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Server action to sign in a user with email and password
 */
export async function signInAction(input: LoginInput): Promise<ActionResult<{ userId: string; role?: string; isMember?: boolean }>> {
  try {
    const validated = loginSchema.parse(input);
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        code: 'AUTH_FAILED',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Unable to authenticate. User record not returned.',
        code: 'AUTH_FAILED',
      };
    }

    // Fetch user profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    const role = profile?.role || 'MEMBER';

    revalidatePath('/', 'layout');

    return {
      success: true,
      data: { userId: data.user.id, role, isMember: role === 'MEMBER' },
      message: 'Signed in successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to register a new user.
 * Hardened: Public self-registration strictly assigns 'MEMBER' role to prevent privilege escalation.
 */
export async function signUpAction(input: RegisterInput): Promise<ActionResult<{ userId: string }>> {
  try {
    const validated = registerSchema.parse(input);
    const supabase = await createClient();

    // In Phase 3 security hardening, all self-registrations are strictly assigned MEMBER role.
    // Privileged roles (ADMIN, FRONT_DESK, etc.) must be provisioned by Club Owners.
    const { data, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          full_name: validated.fullName,
          phone: validated.phone || null,
          role: 'MEMBER',
        },
      },
    });

    if (error) {
      return {
        success: false,
        error: error.message,
        code: 'REGISTRATION_FAILED',
      };
    }

    if (!data.user) {
      return {
        success: false,
        error: 'Registration failed. User record not created.',
        code: 'REGISTRATION_FAILED',
      };
    }

    return {
      success: true,
      data: { userId: data.user.id },
      message: 'Registration successful. You can now log in.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to sign out the active user session
 */
export async function signOutAction(): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidatePath('/', 'layout');
    return {
      success: true,
      data: null,
      message: 'Signed out successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

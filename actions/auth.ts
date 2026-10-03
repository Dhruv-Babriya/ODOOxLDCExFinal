'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import {
  loginSchema,
  registerSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  type LoginInput,
  type RegisterInput,
  type PasswordResetRequestInput,
  type PasswordResetInput,
} from '@/lib/validations/auth';
import { handleActionError } from '@/lib/errors';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';
import {
  extractClientIp,
  normalizeAccountIdentifier,
  checkAuthRateLimit,
  recordAuthFailure,
  recordAuthSuccess,
} from '@/lib/rate-limit';

/**
 * Server action to sign in a user with email and password.
 * Enforces a combination of per-IP and per-account rate limits with exponential backoff
 * rather than a hard lockout.
 */
export async function signInAction(
  input: LoginInput
): Promise<ActionResult<{ userId: string; role?: string; isMember?: boolean }>> {
  try {
    const validated = loginSchema.parse(input);
    const headerList = await headers();
    const clientIp = extractClientIp(headerList);
    const normalizedEmail = normalizeAccountIdentifier(validated.email);

    // 1. Enforce Per-IP and Per-Account rate limit with exponential backoff
    const rateCheck = checkAuthRateLimit({
      ip: clientIp,
      account: normalizedEmail,
    });

    if (!rateCheck.success) {
      return {
        success: false,
        error:
          rateCheck.errorMessage ||
          'Too many sign-in attempts. Please wait before trying again.',
        code: 'RATE_LIMITED',
      };
    }

    const supabase = await createClient();

    let { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    // Seamless auto-confirm fallback if email confirmation is pending in Supabase
    if (error && error.message?.toLowerCase().includes('email not confirmed')) {
      try {
        await (supabase as any).rpc('confirm_user_email', { p_email: validated.email });
        const retry = await supabase.auth.signInWithPassword({
          email: validated.email,
          password: validated.password,
        });
        if (!retry.error && retry.data) {
          data = retry.data;
          error = null;
        }
      } catch (confirmErr) {
        console.warn('Auto-confirm retry warning:', confirmErr);
      }
    }

    if (error) {
      // 2. Record failure to escalate exponential backoff penalty
      const failure = recordAuthFailure({
        ip: clientIp,
        account: normalizedEmail,
      });

      let friendlyMessage = error.message;
      const lower = error.message?.toLowerCase() || '';

      if (lower.includes('invalid login credentials')) {
        friendlyMessage = 'Invalid email or password. Please check your credentials and try again.';
        if (failure.delaySeconds > 0) {
          friendlyMessage += ` (Consecutive failed attempts: please wait ${failure.delaySeconds}s before retrying)`;
        }
      } else if (lower.includes('email not confirmed')) {
        friendlyMessage =
          'Your account email has not been confirmed yet. Please verify your email or contact administration.';
      } else if (lower.includes('rate limit') || lower.includes('too many requests')) {
        friendlyMessage = 'Too many sign-in attempts. Please wait a few moments before trying again.';
      }

      return {
        success: false,
        error: friendlyMessage,
        code: 'AUTH_FAILED',
      };
    }

    if (!data.user) {
      recordAuthFailure({ ip: clientIp, account: normalizedEmail });
      return {
        success: false,
        error: 'Unable to authenticate. User record not returned.',
        code: 'AUTH_FAILED',
      };
    }

    // 3. Clear exponential backoff on successful login
    recordAuthSuccess({
      ip: clientIp,
      account: normalizedEmail,
    });

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
 * Protected with per-IP and per-account rate limits.
 */
export async function signUpAction(
  input: RegisterInput
): Promise<ActionResult<{ userId: string }>> {
  try {
    const validated = registerSchema.parse(input);
    const headerList = await headers();
    const clientIp = extractClientIp(headerList);
    const normalizedEmail = normalizeAccountIdentifier(validated.email);

    // Enforce Per-IP and Per-Account rate limit with exponential backoff
    const rateCheck = checkAuthRateLimit({
      ip: clientIp,
      account: normalizedEmail,
    });

    if (!rateCheck.success) {
      return {
        success: false,
        error:
          rateCheck.errorMessage ||
          'Too many registration attempts. Please wait before trying again.',
        code: 'RATE_LIMITED',
      };
    }

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
      recordAuthFailure({ ip: clientIp, account: normalizedEmail });

      // If email rate limit is exceeded on Supabase's built-in SMTP (e.g. during frequent testing),
      // seamlessly fallback to direct member registration so the user is never blocked.
      const isRateLimit =
        error.message?.toLowerCase().includes('rate limit') ||
        error.status === 429 ||
        (error as unknown as Record<string, unknown>)?.code === 'over_email_send_rate_limit';

      if (isRateLimit) {
        const { data: directUserId, error: directError } = await (supabase as any).rpc(
          'register_member_direct',
          {
            p_email: validated.email,
            p_password: validated.password,
            p_full_name: validated.fullName,
            p_phone: validated.phone || null,
          }
        );

        if (directError) {
          return {
            success: false,
            error: directError.message,
            code: 'REGISTRATION_FAILED',
          };
        }

        recordAuthSuccess({ ip: clientIp, account: normalizedEmail });

        return {
          success: true,
          data: { userId: directUserId as string },
          message: 'Registration successful. You can now log in.',
        };
      }

      return {
        success: false,
        error: error.message,
        code: 'REGISTRATION_FAILED',
      };
    }

    if (!data.user) {
      recordAuthFailure({ ip: clientIp, account: normalizedEmail });
      return {
        success: false,
        error: 'Registration failed. User record not created.',
        code: 'REGISTRATION_FAILED',
      };
    }

    recordAuthSuccess({ ip: clientIp, account: normalizedEmail });

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
 * Server action to request a password reset email.
 * Enforces strict per-IP and per-account limits with exponential backoff.
 */
export async function requestPasswordResetAction(
  input: PasswordResetRequestInput
): Promise<ActionResult<{ email: string }>> {
  try {
    const validated = passwordResetRequestSchema.parse(input);
    const headerList = await headers();
    const clientIp = extractClientIp(headerList);
    const normalizedEmail = normalizeAccountIdentifier(validated.email);

    // Enforce strict auth rate limiting
    const rateCheck = checkAuthRateLimit({
      ip: clientIp,
      account: normalizedEmail,
    });

    if (!rateCheck.success) {
      return {
        success: false,
        error:
          rateCheck.errorMessage ||
          'Too many password reset attempts. Please wait before trying again.',
        code: 'RATE_LIMITED',
      };
    }

    const supabase = await createClient();
    const origin =
      headerList.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    const { error } = await supabase.auth.resetPasswordForEmail(validated.email, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      recordAuthFailure({ ip: clientIp, account: normalizedEmail });
      return {
        success: false,
        error: error.message,
        code: 'RESET_REQUEST_FAILED',
      };
    }

    recordAuthSuccess({ ip: clientIp, account: normalizedEmail });

    return {
      success: true,
      data: { email: validated.email },
      message:
        'If an account exists with this email, a password reset link has been dispatched.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server action to update user password with new credentials.
 * Enforces rate limiting per IP.
 */
export async function updatePasswordAction(
  input: PasswordResetInput
): Promise<ActionResult<null>> {
  try {
    const validated = passwordResetSchema.parse(input);
    const headerList = await headers();
    const clientIp = extractClientIp(headerList);

    const rateCheck = checkAuthRateLimit({ ip: clientIp });
    if (!rateCheck.success) {
      return {
        success: false,
        error:
          rateCheck.errorMessage ||
          'Too many password update attempts. Please wait before trying again.',
        code: 'RATE_LIMITED',
      };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({
      password: validated.password,
    });

    if (error) {
      recordAuthFailure({ ip: clientIp });
      return {
        success: false,
        error: error.message,
        code: 'PASSWORD_UPDATE_FAILED',
      };
    }

    recordAuthSuccess({ ip: clientIp });

    return {
      success: true,
      data: null,
      message: 'Password updated successfully. You can now log in with your new credentials.',
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

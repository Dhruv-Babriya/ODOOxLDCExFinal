import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { AppRole } from '@/types/shared';
import { hasPermission, type Permission } from '@/lib/permissions/rbac';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: AppRole;
  avatarUrl: string | null;
  isActive: boolean;
  memberId?: string | null;
}

/**
 * Cached per-request user session retriever
 */
export const getCurrentUser = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Fetch linked profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, avatar_url, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return {
      id: user.id,
      email: user.email ?? '',
      fullName: user.user_metadata?.full_name ?? user.email ?? 'User',
      phone: user.phone ?? null,
      role: (user.user_metadata?.role as AppRole) ?? 'MEMBER',
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      isActive: true,
    };
  }

  // Check if user is also registered as a member
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('profile_id', profile.id)
    .maybeSingle();

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    phone: profile.phone,
    role: profile.role as AppRole,
    avatarUrl: profile.avatar_url,
    isActive: profile.is_active,
    memberId: member?.id ?? null,
  };
});

import { AppError } from '@/lib/errors';

/**
 * Enforces authentication. Throws if unauthenticated.
 */
export async function requireAuth(): Promise<UserProfile> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AppError('Authentication required. Please sign in to continue.', 'UNAUTHORIZED');
  }
  return user;
}

/**
 * Enforces role membership. Throws if unauthorized.
 */
export async function requireRole(allowedRoles: AppRole[]): Promise<UserProfile> {
  const user = await requireAuth();
  if (!allowedRoles.includes(user.role)) {
    throw new AppError(`Access restricted. Required role: [${allowedRoles.join(', ')}]`, 'FORBIDDEN');
  }
  return user;
}

/**
 * Enforces permission capability. Throws if user lacks permission.
 */
export async function requirePermission(permission: Permission): Promise<UserProfile> {
  const user = await requireAuth();
  if (!hasPermission(user.role, permission)) {
    throw new AppError(`Access restricted. Missing required permission: ${permission}`, 'FORBIDDEN');
  }
  return user;
}

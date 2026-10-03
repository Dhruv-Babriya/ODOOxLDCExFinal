'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAuth } from '@/lib/auth/session';
import { handleActionError } from '@/lib/errors';
import type { ActionResult, NotificationItem, NotificationType } from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Fetch all notifications for the authenticated user
 */
export async function getUserNotificationsAction(): Promise<ActionResult<NotificationItem[]>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) throw error;

    return {
      success: true,
      data: (data || []) as unknown as NotificationItem[],
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Get unread notification count for the authenticated user
 */
export async function getUnreadNotificationCountAction(): Promise<ActionResult<number>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    return {
      success: true,
      data: count || 0,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Mark a single notification as read
 */
export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResult<null>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) throw error;

    revalidatePath('/dashboard', 'layout');

    return {
      success: true,
      data: null,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Mark all notifications as read for current user
 */
export async function markAllNotificationsReadAction(): Promise<ActionResult<null>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    revalidatePath('/dashboard', 'layout');

    return {
      success: true,
      data: null,
      message: 'All notifications marked as read.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Server-side helper to create an in-app notification
 */
export async function createNotificationAction(params: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}): Promise<ActionResult<{ notificationId: string }>> {
  try {
    const adminSupabase = createAdminClient();

    // Deduplication: prevent identical unread notifications within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: existing } = await adminSupabase
      .from('notifications')
      .select('id')
      .eq('user_id', params.userId)
      .eq('title', params.title)
      .eq('is_read', false)
      .gte('created_at', fiveMinutesAgo)
      .limit(1);

    if (existing && existing.length > 0) {
      return {
        success: true,
        data: { notificationId: existing[0].id },
        message: 'Notification already delivered recently (deduplicated).',
      };
    }

    const { data, error } = await adminSupabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || 'INFO',
        link: params.link || null,
        is_read: false,
      })
      .select('id')
      .single();

    if (error) throw error;

    return {
      success: true,
      data: { notificationId: data.id },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

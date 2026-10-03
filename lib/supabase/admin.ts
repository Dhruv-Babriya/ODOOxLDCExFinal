import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

/**
 * Creates an administrative Supabase client using the Service Role Key.
 *
 * CRITICAL SECURITY NOTICE:
 * This client bypasses PostgreSQL Row Level Security (RLS).
 * MUST ONLY be called in trusted server-side code (e.g. system webhooks,
 * background cron workers, privileged seed routines).
 * NEVER expose this or call it directly in client components!
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables.'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

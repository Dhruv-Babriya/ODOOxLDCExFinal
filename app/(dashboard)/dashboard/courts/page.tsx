import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/session';
import { hasPermission } from '@/lib/permissions/rbac';
import { CourtsManager } from '@/components/dashboard/CourtsManager';
import type { AppRole } from '@/types/shared';

export default async function CourtsDashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: courts } = await supabase.from('courts').select('*').order('name');

  const canManage = hasPermission(user?.role as AppRole, 'courts:manage');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Courts Management</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Tennis clay and hard courts, indoor arenas, and cricket pitch management.
          </p>
        </div>
      </div>

      <CourtsManager
        initialCourts={(courts || []).map((c) => ({
          id: c.id,
          name: c.name,
          sport_type: c.sport_type,
          hourly_rate: Number(c.hourly_rate),
          is_indoor: c.is_indoor,
          is_active: c.is_active,
        }))}
        canManage={canManage}
      />
    </div>
  );
}

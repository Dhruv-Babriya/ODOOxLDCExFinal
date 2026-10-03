import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';

export default async function CourtsDashboardPage() {
  const supabase = await createClient();
  const { data: courts } = await supabase.from('courts').select('*').order('name');

  return (
    <DashboardModuleShell
      title="Courts Management"
      subtitle="Tennis clay and hard courts, indoor arenas, and cricket practice pitch management."
      developerOwner="Developer 2"
      developerRole="Courts & Booking Specialist"
      tables={['courts', 'court_bookings']}
      contracts={['Court', 'SportType', 'courtCreateSchema']}
      phase1Roadmap={[
        'Court status toggles (Active, Maintenance, Private Booking)',
        'Hourly base pricing adjustment with automatic audit logging',
        'Court schedule timeline visualization component',
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {courts?.map((c) => (
          <Card key={c.id} className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <Badge variant={c.sport_type === 'TENNIS' ? 'default' : 'warning'}>
                  {c.sport_type}
                </Badge>
                <Badge variant={c.is_active ? 'success' : 'destructive'} className="text-[10px]">
                  {c.is_active ? 'Operational' : 'Maintenance'}
                </Badge>
              </div>
              <CardTitle className="text-base text-white mt-2">{c.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-zinc-400 border-t border-zinc-800/80 pt-3">
              <div className="flex justify-between">
                <span>Hourly Base Rate:</span>
                <span className="font-semibold text-white">{formatCurrency(c.hourly_rate)} / hr</span>
              </div>
              <div className="flex justify-between">
                <span>Facility Type:</span>
                <span className="text-zinc-300">{c.is_indoor ? 'Indoor Arena' : 'Outdoor Court'}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardModuleShell>
  );
}

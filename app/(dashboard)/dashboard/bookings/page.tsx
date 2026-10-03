import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { CalendarDays, ShieldCheck } from 'lucide-react';

export default async function BookingsDashboardPage() {
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from('court_bookings')
    .select(`
      id,
      booking_type,
      start_time,
      end_time,
      status,
      base_price,
      discount_amount,
      final_price,
      courts (name, sport_type),
      members (membership_number, profiles (full_name))
    `)
    .order('start_time', { ascending: false })
    .limit(10);

  return (
    <DashboardModuleShell
      title="Court Bookings & Concurrency Center"
      subtitle="Interactive court reservations, 1-hour sessions with 30-minute intervals, and atomic collision prevention."
      developerOwner="Developer 2"
      developerRole="Courts & Booking Specialist"
      tables={['court_bookings', 'booking_participants', 'courts']}
      contracts={['CourtBooking', 'BookingStatus', 'BookingType', 'courtBookingCreateSchema']}
      phase1Roadmap={[
        'Interactive visual court calendar with 30-minute time grid and 1-hour session blocks',
        'Automatic member discount calculation & free hour benefit application',
        'Friday social play shared-court group registration module',
        'Booking cancellation with automated reason capture and calendar slot release',
      ]}
    >
      <div className="space-y-6">
        {/* Concurrency Banner */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-emerald-300">
              PostgreSQL GIST Exclusion Constraint Active
            </h4>
            <p className="text-xs text-zinc-300">
              Double-bookings are physically impossible at the database engine level. Concurrent bookings are locked and checked atomically via{' '}
              <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono">
                no_overlapping_court_bookings
              </code>{' '}
              and the stored procedure <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono">create_court_booking</code>.
            </p>
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base text-white">Recent Court Reservations</CardTitle>
              <p className="text-xs text-zinc-400">Queried directly from public.court_bookings</p>
            </div>
            <Badge variant="outline">{bookings?.length || 0} Bookings Logged</Badge>
          </CardHeader>
          <CardContent>
            {bookings && bookings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Court</th>
                      <th className="py-2.5 px-3">Player / Member</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Start Time</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Final Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-zinc-800/30">
                        <td className="py-2 px-3 font-sans text-zinc-200">{b.courts?.name}</td>
                        <td className="py-2 px-3 font-sans text-zinc-300">
                          {b.members?.profiles?.full_name || 'Walk-in Guest'}
                        </td>
                        <td className="py-2 px-3 text-zinc-400">{b.booking_type}</td>
                        <td className="py-2 px-3 text-zinc-300">{formatDateTime(b.start_time)}</td>
                        <td className="py-2 px-3">
                          <Badge variant={b.status === 'CONFIRMED' ? 'success' : 'destructive'} className="text-[10px]">
                            {b.status}
                          </Badge>
                        </td>
                        <td className="py-2 px-3 text-emerald-400 font-semibold">
                          {formatCurrency(b.final_price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 space-y-2 text-zinc-400 text-xs">
                <CalendarDays className="h-8 w-8 text-zinc-600 mx-auto" />
                <p>No court bookings recorded yet. Developer 2 will build the interactive slot picker in Phase 1.</p>
                <p className="font-mono text-zinc-500">Atomic server action (createCourtBookingAction) ready in actions/bookings.ts</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardModuleShell>
  );
}

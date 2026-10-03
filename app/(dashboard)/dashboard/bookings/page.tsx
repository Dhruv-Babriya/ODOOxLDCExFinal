import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/session';
import { BookingCalendar } from '@/components/dashboard/BookingCalendar';
import { BookingsList } from '@/components/dashboard/BookingsList';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';

export default async function BookingsDashboardPage() {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Fetch courts for the calendar
  const { data: courts } = await supabase
    .from('courts')
    .select('id, name, sport_type, hourly_rate, is_indoor, is_active')
    .order('name');

  // Fetch recent bookings
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
      cancellation_reason,
      cancelled_at,
      notes,
      created_at,
      courts (name, sport_type),
      members (membership_number, profiles (full_name))
    `)
    .order('start_time', { ascending: false })
    .limit(50);

  const courtsList = (courts || []).map((c) => ({
    id: c.id,
    name: c.name,
    sportType: c.sport_type,
    hourlyRate: Number(c.hourly_rate),
    isIndoor: c.is_indoor,
    isActive: c.is_active,
  }));

  const bookingsList = (bookings || []).map((b) => ({
    id: b.id,
    courtName: b.courts?.name || 'Unknown Court',
    sportType: b.courts?.sport_type || 'TENNIS',
    memberName: b.members?.profiles?.full_name || null,
    membershipNumber: b.members?.membership_number || null,
    bookingType: b.booking_type,
    startTime: b.start_time,
    endTime: b.end_time,
    status: b.status,
    basePrice: Number(b.base_price),
    discountAmount: Number(b.discount_amount),
    finalPrice: Number(b.final_price),
    cancellationReason: b.cancellation_reason,
    cancelledAt: b.cancelled_at,
    notes: b.notes,
    createdAt: b.created_at,
  }));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Court Bookings</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Interactive court reservations with 1-hour sessions, 30-minute intervals, and atomic collision prevention.
          </p>
        </div>
        <Badge variant="success" className="text-[11px] self-start">
          <ShieldCheck className="h-3 w-3 mr-1" />
          GIST Exclusion Active
        </Badge>
      </div>

      {/* Concurrency Banner */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-emerald-300">
            PostgreSQL GIST Exclusion Constraint Active
          </h4>
          <p className="text-xs text-zinc-300">
            Double-bookings are physically impossible at the database engine level. Concurrent booking
            requests are resolved atomically via the{' '}
            <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono">
              no_overlapping_court_bookings
            </code>{' '}
            exclusion constraint and the{' '}
            <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono">
              create_court_booking
            </code>{' '}
            stored procedure.
          </p>
        </div>
      </div>

      {/* Booking Calendar */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Availability & New Booking</h2>
        <BookingCalendar
          courts={courtsList}
          userRole={user?.role || 'MEMBER'}
          userMemberId={user?.memberId || null}
        />
      </section>

      {/* Bookings List */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Booking History</h2>
        <BookingsList
          initialBookings={bookingsList}
          courts={(courts || []).map((c) => ({ id: c.id, name: c.name }))}
          userRole={user?.role || 'MEMBER'}
        />
      </section>
    </div>
  );
}

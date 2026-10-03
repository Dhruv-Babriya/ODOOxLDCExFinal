import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth/session';
import { BookingCalendar } from '@/components/dashboard/BookingCalendar';
import { BookingsList } from '@/components/dashboard/BookingsList';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck } from 'lucide-react';
import {
  getBookingsPaginatedAction,
  getBookingDashboardMetricsAction,
} from '@/actions/bookings';
import { parsePaginationParams } from '@/lib/pagination';

interface BookingsDashboardPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BookingsDashboardPage({
  searchParams,
}: BookingsDashboardPageProps) {
  const user = await getCurrentUser();
  const supabase = await createClient();

  // Await search parameters from URL query string
  const resolvedParams = searchParams ? await searchParams : {};
  const { page, pageSize, search, sortBy } = parsePaginationParams(resolvedParams);
  const courtId = typeof resolvedParams.courtId === 'string' ? resolvedParams.courtId : undefined;
  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined;
  const bookingType = typeof resolvedParams.bookingType === 'string' ? resolvedParams.bookingType : undefined;
  const date = typeof resolvedParams.date === 'string' ? resolvedParams.date : undefined;

  // 1. Fetch courts for both the calendar and court dropdown filters
  const { data: courts } = await supabase
    .from('courts')
    .select('id, name, sport_type, hourly_rate, is_indoor, is_active')
    .order('name');

  // 2. Fetch server-side paginated bookings slice & dashboard metrics concurrently
  const [paginatedResult, metricsResult] = await Promise.all([
    getBookingsPaginatedAction({
      page,
      pageSize,
      search: search || undefined,
      courtId,
      status,
      bookingType,
      date,
      sortBy,
    }),
    getBookingDashboardMetricsAction(),
  ]);

  const courtsList = (courts || []).map((c) => ({
    id: c.id,
    name: c.name,
    sportType: c.sport_type,
    hourlyRate: Number(c.hourly_rate),
    isIndoor: c.is_indoor,
    isActive: c.is_active,
  }));

  const initialBookings = paginatedResult.success ? paginatedResult.data.bookings : [];
  const initialPagination = paginatedResult.success ? paginatedResult.data.pagination : undefined;
  const initialMetrics = metricsResult.success ? metricsResult.data : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Court Bookings & Scheduling</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Real-world court scheduling with atomic concurrency, rescheduling, Friday social play, and daily quota limits.
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
            Double-bookings are physically impossible at the database engine level. Concurrent booking and rescheduling
            requests are resolved atomically via the{' '}
            <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono">
              no_overlapping_court_bookings
            </code>{' '}
            exclusion constraint and the stored procedures{' '}
            <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono">
              create_court_booking
            </code>{' '}
            and{' '}
            <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-emerald-400 font-mono">
              reschedule_court_booking
            </code>.
          </p>
        </div>
      </div>

      {/* Booking Calendar */}
      <section>
        <BookingCalendar
          courts={courtsList}
          userRole={user?.role || 'MEMBER'}
          userMemberId={user?.memberId || null}
        />
      </section>

      {/* Bookings List (Paginated with Server-Side Search, Filters, Sorting & Aggregates) */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Court Reservation Management</h2>
        <BookingsList
          initialBookings={initialBookings}
          initialPagination={initialPagination}
          initialMetrics={initialMetrics}
          courts={(courts || []).map((c) => ({ id: c.id, name: c.name }))}
          userRole={user?.role || 'MEMBER'}
          initialFilters={{
            search,
            courtId,
            status,
            bookingType,
            date,
            sortBy,
          }}
        />
      </section>
    </div>
  );
}

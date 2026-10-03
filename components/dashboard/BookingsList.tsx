'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/ui/pagination';
import { formatCurrency, formatTime } from '@/lib/utils';
import {
  type BookingRow,
  type BookingDashboardMetrics,
  getBookingsPaginatedAction,
  getBookingDashboardMetricsAction,
  exportBookingsCsvAction,
  cancelBookingAction,
  rescheduleBookingAction,
  getBookingDetailsAction,
  addSocialPlayParticipantAction,
  removeSocialPlayParticipantAction,
  recordBookingPaymentAction,
  updateBookingStatusAction,
} from '@/actions/bookings';
import {
  type PaginationMeta,
  DEFAULT_PAGE_SIZE,
  calculatePaginationMeta,
} from '@/lib/pagination';
import {
  Filter,
  XCircle,
  Eye,
  Users,
  AlertTriangle,
  CheckCircle2,
  X,
  CreditCard,
  ArrowRightLeft,
  Trash2,
  UserCheck,
  Search,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  BarChart3,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

interface BookingDetailInfo {
  id: string;
  courtId: string;
  courtName: string;
  sportType: string;
  memberId: string | null;
  memberName: string | null;
  membershipNumber: string | null;
  bookingType: string;
  startTime: string;
  endTime: string;
  status: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  cancellationReason: string | null;
  notes: string | null;
  isMine: boolean;
}

interface CourtInfo {
  id: string;
  name: string;
}

interface BookingsListProps {
  initialBookings: BookingRow[];
  initialPagination?: PaginationMeta;
  initialMetrics?: BookingDashboardMetrics | null;
  courts: CourtInfo[];
  userRole: string;
  initialFilters?: {
    search?: string;
    courtId?: string;
    status?: string;
    date?: string;
    bookingType?: string;
    sortBy?: string;
  };
}

export function BookingsList({
  initialBookings,
  initialPagination,
  initialMetrics,
  courts,
  userRole,
  initialFilters,
}: BookingsListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Booking records & pagination state
  const [bookings, setBookings] = useState<BookingRow[]>(initialBookings);
  const [pagination, setPagination] = useState<PaginationMeta>(() => {
    if (initialPagination) return initialPagination;
    return calculatePaginationMeta(initialBookings.length, 1, DEFAULT_PAGE_SIZE);
  });
  const [metrics, setMetrics] = useState<BookingDashboardMetrics | null>(initialMetrics || null);
  const [showMetrics, setShowMetrics] = useState(true);

  // Filters & Search state
  const [filterSearch, setFilterSearch] = useState(initialFilters?.search || '');
  const [filterCourt, setFilterCourt] = useState(initialFilters?.courtId || '');
  const [filterStatus, setFilterStatus] = useState(initialFilters?.status || '');
  const [filterBookingType, setFilterBookingType] = useState(initialFilters?.bookingType || '');
  const [filterDate, setFilterDate] = useState(initialFilters?.date || '');
  const [sortBy, setSortBy] = useState(initialFilters?.sortBy || 'start_time_desc');

  // UI feedback & async state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState(false);

  // Double-submit guard
  const submittingRef = useRef(false);

  // Auto-dismiss success messages after 6s
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showSuccess = useCallback((msg: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccess(msg);
    successTimerRef.current = setTimeout(() => setSuccess(null), 6000);
  }, []);
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Cancellation Modal State
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Details & Participant Modal State
  const [nowMs] = useState(() => Date.now());
  const [detailBooking, setDetailBooking] = useState<{
    booking: BookingDetailInfo;
    participants: Array<{ id: string; memberId: string | null; memberName: string | null; guestName: string | null }>;
  } | null>(null);
  const [addParticipantGuestName, setAddParticipantGuestName] = useState('');

  // Payment Modal State
  const [paymentBooking, setPaymentBooking] = useState<BookingRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER'>('UPI');
  const [paymentTxnRef, setPaymentTxnRef] = useState('');

  // Rescheduling Modal State
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingRow | null>(null);
  const [newCourtId, setNewCourtId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:00');

  const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(userRole);

  /**
   * Push query parameters into the URL to preserve state on refresh and allow deep-linking
   */
  const syncUrlParams = useCallback(
    (params: {
      page: number;
      pageSize: number;
      search?: string;
      courtId?: string;
      status?: string;
      bookingType?: string;
      date?: string;
      sortBy?: string;
    }) => {
      const urlParams = new URLSearchParams();

      if (params.page > 1) urlParams.set('page', String(params.page));
      if (params.pageSize !== DEFAULT_PAGE_SIZE) urlParams.set('pageSize', String(params.pageSize));
      if (params.search) urlParams.set('search', params.search);
      if (params.courtId) urlParams.set('courtId', params.courtId);
      if (params.status) urlParams.set('status', params.status);
      if (params.bookingType) urlParams.set('bookingType', params.bookingType);
      if (params.date) urlParams.set('date', params.date);
      if (params.sortBy && params.sortBy !== 'start_time_desc') urlParams.set('sort', params.sortBy);

      const queryString = urlParams.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(targetUrl, { scroll: false });
    },
    [pathname, router]
  );

  /**
   * Primary server-side query executor:
   * Slices records at the database level and fetches the current page.
   */
  const fetchPaginatedData = useCallback(
    (page: number, pageSize: number, customFilters?: {
      search?: string;
      courtId?: string;
      status?: string;
      bookingType?: string;
      date?: string;
      sortBy?: string;
    }) => {
      const search = customFilters?.search !== undefined ? customFilters.search : filterSearch;
      const courtId = customFilters?.courtId !== undefined ? customFilters.courtId : filterCourt;
      const status = customFilters?.status !== undefined ? customFilters.status : filterStatus;
      const bookingType = customFilters?.bookingType !== undefined ? customFilters.bookingType : filterBookingType;
      const date = customFilters?.date !== undefined ? customFilters.date : filterDate;
      const currentSort = customFilters?.sortBy !== undefined ? customFilters.sortBy : sortBy;

      startTransition(async () => {
        setError(null);
        const result = await getBookingsPaginatedAction({
          page,
          pageSize,
          search: search || undefined,
          courtId: courtId || undefined,
          status: status || undefined,
          bookingType: bookingType || undefined,
          date: date || undefined,
          sortBy: currentSort,
        });

        if (result.success) {
          setBookings(result.data.bookings);
          setPagination(result.data.pagination);
          syncUrlParams({
            page,
            pageSize,
            search,
            courtId,
            status,
            bookingType,
            date,
            sortBy: currentSort,
          });
        } else {
          setError(result.error);
        }
      });
    },
    [filterSearch, filterCourt, filterStatus, filterBookingType, filterDate, sortBy, syncUrlParams]
  );

  // Handle Search & Filter Submission (Resets page to 1)
  const handleApplyFilters = () => {
    fetchPaginatedData(1, pagination.pageSize);
  };

  // Handle Page Change
  const handlePageChange = (newPage: number) => {
    fetchPaginatedData(newPage, pagination.pageSize);
  };

  // Handle Page Size Change (Resets to page 1)
  const handlePageSizeChange = (newPageSize: number) => {
    fetchPaginatedData(1, newPageSize);
  };

  // Handle Sort Change (Resets to page 1)
  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    fetchPaginatedData(1, pagination.pageSize, { sortBy: newSort });
  };

  // Clear all filters (Resets to page 1)
  const handleClearFilters = () => {
    setFilterSearch('');
    setFilterCourt('');
    setFilterStatus('');
    setFilterBookingType('');
    setFilterDate('');
    setSortBy('start_time_desc');
    fetchPaginatedData(1, pagination.pageSize, {
      search: '',
      courtId: '',
      status: '',
      bookingType: '',
      date: '',
      sortBy: 'start_time_desc',
    });
  };

  // Export full filtered dataset to CSV
  const handleExportCsv = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const result = await exportBookingsCsvAction({
        search: filterSearch || undefined,
        courtId: filterCourt || undefined,
        status: filterStatus || undefined,
        bookingType: filterBookingType || undefined,
        date: filterDate || undefined,
      });

      if (result.success) {
        // Trigger browser file download
        const blob = new Blob([result.data.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', result.data.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showSuccess(result.message || `Exported ${result.data.totalExported.toLocaleString()} records!`);
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to export CSV. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Copy Booking ID
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Refresh Dashboard Metrics
  const handleRefreshMetrics = async () => {
    startTransition(async () => {
      const res = await getBookingDashboardMetricsAction();
      if (res.success) {
        setMetrics(res.data);
      }
    });
  };

  // Cancel Booking
  const handleCancelBooking = () => {
    if (!cancelBookingId || cancelReason.trim().length < 3 || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const result = await cancelBookingAction({
          bookingId: cancelBookingId,
          cancellationReason: cancelReason,
        });

        if (result.success) {
          showSuccess('Booking cancelled successfully. Daily quota restored.');
          setCancelBookingId(null);
          setCancelReason('');
          fetchPaginatedData(pagination.page, pagination.pageSize);
          handleRefreshMetrics();
        } else {
          setError(result.error);
        }
      } finally {
        submittingRef.current = false;
      }
    });
  };

  // View Details
  const handleViewDetails = (bookingId: string) => {
    startTransition(async () => {
      const result = await getBookingDetailsAction(bookingId);
      if (result.success) {
        setDetailBooking({
          booking: result.data.booking,
          participants: result.data.participants,
        });
      } else {
        setError(result.error);
      }
    });
  };

  // Add Participant
  const handleAddParticipant = () => {
    if (!detailBooking || !addParticipantGuestName.trim()) return;

    startTransition(async () => {
      const result = await addSocialPlayParticipantAction({
        bookingId: detailBooking.booking.id,
        guestName: addParticipantGuestName.trim(),
      });

      if (result.success) {
        setAddParticipantGuestName('');
        const refreshed = await getBookingDetailsAction(detailBooking.booking.id);
        if (refreshed.success) {
          setDetailBooking({
            booking: detailBooking.booking,
            participants: refreshed.data.participants,
          });
        }
      } else {
        setError(result.error);
      }
    });
  };

  // Remove Participant
  const handleRemoveParticipant = (participantId: string) => {
    if (!detailBooking) return;

    startTransition(async () => {
      const result = await removeSocialPlayParticipantAction({
        participantId,
        bookingId: detailBooking.booking.id,
      });

      if (result.success) {
        const refreshed = await getBookingDetailsAction(detailBooking.booking.id);
        if (refreshed.success) {
          setDetailBooking({
            booking: detailBooking.booking,
            participants: refreshed.data.participants,
          });
        }
      } else {
        setError(result.error);
      }
    });
  };

  // Record Payment
  const handleRecordPayment = () => {
    if (!paymentBooking || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const result = await recordBookingPaymentAction({
          bookingId: paymentBooking.id,
          amount: paymentBooking.finalPrice > 0 ? paymentBooking.finalPrice : 0.01,
          paymentMethod,
          transactionReference: paymentTxnRef || undefined,
        });

        if (result.success) {
          showSuccess(result.message || 'Payment recorded successfully!');
          setPaymentBooking(null);
          setPaymentTxnRef('');
          fetchPaginatedData(pagination.page, pagination.pageSize);
          handleRefreshMetrics();
        } else {
          setError(result.error);
        }
      } finally {
        submittingRef.current = false;
      }
    });
  };

  // Status Change
  const handleStatusChange = (bookingId: string, status: 'COMPLETED' | 'NO_SHOW') => {
    startTransition(async () => {
      const result = await updateBookingStatusAction(bookingId, status);
      if (result.success) {
        setSuccess(result.message || `Status updated to ${status}`);
        fetchPaginatedData(pagination.page, pagination.pageSize);
        handleRefreshMetrics();
      } else {
        setError(result.error);
      }
    });
  };

  // Reschedule Submit
  const handleRescheduleSubmit = () => {
    if (!rescheduleBooking || !newCourtId || !newDate || !newTime || submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setSuccess(null);

    const startDateTime = new Date(`${newDate}T${newTime}:00Z`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    startTransition(async () => {
      try {
        const result = await rescheduleBookingAction({
          bookingId: rescheduleBooking.id,
          newCourtId,
          newStartTime: startDateTime.toISOString(),
          newEndTime: endDateTime.toISOString(),
        });

        if (result.success) {
          showSuccess('Booking rescheduled successfully!');
          setRescheduleBooking(null);
          fetchPaginatedData(pagination.page, pagination.pageSize);
        } else {
          setError(result.error);
        }
      } finally {
        submittingRef.current = false;
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="success">Confirmed</Badge>;
      case 'COMPLETED':
        return <Badge variant="default">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'NO_SHOW':
        return <Badge variant="warning">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getBookingTypeBadge = (type: string) => {
    switch (type) {
      case 'SOCIAL_PLAY':
        return <Badge variant="warning">Social Play</Badge>;
      case 'COACHING':
        return <Badge variant="default">Coaching</Badge>;
      case 'MAINTENANCE':
        return <Badge variant="destructive">Maintenance</Badge>;
      default:
        return <Badge variant="outline">Standard</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Feedback Messages */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="underline text-rose-400">Dismiss</button>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="underline text-emerald-400">Dismiss</button>
        </div>
      )}

      {/* Owner Dashboard Database Aggregates (Requirement 7) */}
      {isStaff && metrics && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Owner Booking Analytics (Database-Aggregated)</h3>
              <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-700">
                Live Server Totals
              </Badge>
            </div>
            <button
              onClick={() => setShowMetrics(!showMetrics)}
              className="text-xs text-zinc-400 hover:text-zinc-200 underline"
            >
              {showMetrics ? 'Collapse KPI Cards' : 'Expand KPI Cards'}
            </button>
          </div>

          {showMetrics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Today's Summary */}
              <Card className="border-zinc-800 bg-zinc-900/60 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Today</span>
                  <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-400">Total Bookings:</span>
                    <span className="text-base font-bold text-white">{metrics.today.totalBookings}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-400">Court Revenue:</span>
                    <span className="font-semibold text-emerald-400">{formatCurrency(metrics.today.courtRevenue)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-400">Active Members:</span>
                    <span className="text-zinc-300 font-medium">{metrics.today.activeMembers}</span>
                  </div>
                </CardContent>
              </Card>

              {/* This Week's Summary */}
              <Card className="border-zinc-800 bg-zinc-900/60 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">This Week</span>
                  <TrendingUp className="h-3.5 w-3.5 text-sky-400" />
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-400">Total Bookings:</span>
                    <span className="text-base font-bold text-white">{metrics.thisWeek.totalBookings}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-400">Week Revenue:</span>
                    <span className="font-semibold text-sky-400">{formatCurrency(metrics.thisWeek.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-400">Booking Activity:</span>
                    <span className="text-zinc-300 font-medium">{metrics.thisWeek.bookingActivity} sessions</span>
                  </div>
                </CardContent>
              </Card>

              {/* This Month's Summary */}
              <Card className="border-zinc-800 bg-zinc-900/60 shadow-sm">
                <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">This Month</span>
                  <DollarSign className="h-3.5 w-3.5 text-amber-400" />
                </CardHeader>
                <CardContent className="px-4 pb-3 space-y-1 text-xs">
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-400">Total Bookings:</span>
                    <span className="text-base font-bold text-white">{metrics.thisMonth.totalBookings}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-400">Month Revenue:</span>
                    <span className="font-semibold text-amber-400">{formatCurrency(metrics.thisMonth.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-zinc-400">Court Usage:</span>
                    <span className="text-zinc-300 font-medium">{metrics.thisMonth.courtUsageHours} hours</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Search, Filter & Export Control Bar (Requirements 1, 3, 4, 5, 8, 9) */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            {/* Server-Side Search Input */}
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search by member name, court, booking ID, notes..."
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                className="pl-9 h-8 text-xs bg-zinc-950 border-zinc-800 text-zinc-200 placeholder:text-zinc-500 focus:border-emerald-500"
              />
              {filterSearch && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterSearch('');
                    fetchPaginatedData(1, pagination.pageSize, { search: '' });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Action Buttons: Apply, Clear, and Export CSV */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={handleApplyFilters}
                isLoading={isPending}
                className="h-8 text-xs px-3"
              >
                Apply Filters
              </Button>

              {(filterSearch || filterCourt || filterStatus || filterBookingType || filterDate || sortBy !== 'start_time_desc') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  disabled={isPending}
                  className="h-8 text-xs text-zinc-400 hover:text-white"
                >
                  Clear
                </Button>
              )}

              {/* Full Dataset CSV Export Button (Requirement 8) */}
              {isStaff && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  isLoading={isExporting}
                  disabled={isPending || isExporting}
                  className="h-8 text-xs border-zinc-800 bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-800"
                  title="Export filtered dataset to CSV"
                >
                  <Download className="h-3.5 w-3.5 mr-1 text-emerald-400" />
                  <span>Export CSV</span>
                </Button>
              )}
            </div>
          </div>

          {/* Filter Dropdowns Grid */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/60">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 mr-1">
              <Filter className="h-3.5 w-3.5 text-emerald-400" />
              <span>Filters:</span>
            </div>

            {/* Court Filter */}
            <select
              value={filterCourt}
              onChange={(e) => {
                setFilterCourt(e.target.value);
                fetchPaginatedData(1, pagination.pageSize, { courtId: e.target.value });
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="">All Courts</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                fetchPaginatedData(1, pagination.pageSize, { status: e.target.value });
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>

            {/* Booking Type Filter */}
            <select
              value={filterBookingType}
              onChange={(e) => {
                setFilterBookingType(e.target.value);
                fetchPaginatedData(1, pagination.pageSize, { bookingType: e.target.value });
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="">All Types</option>
              <option value="STANDARD">Standard</option>
              <option value="SOCIAL_PLAY">Social Play</option>
              <option value="COACHING">Coaching</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>

            {/* Date Filter */}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                fetchPaginatedData(1, pagination.pageSize, { date: e.target.value });
              }}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
              title="Filter by reservation date"
            />

            {/* Deterministic Sorting Selector (Requirement 5) */}
            <div className="ml-auto flex items-center gap-1.5 text-xs">
              <span className="text-zinc-500 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="start_time_desc">Newest Session Date</option>
                <option value="start_time_asc">Oldest Session Date</option>
                <option value="created_at_desc">Recently Created</option>
                <option value="created_at_asc">Oldest Created</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="price_asc">Price: Low to High</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Owner / Staff Bookings Data Table (Requirement 6) */}
      <Card className="border-zinc-800 bg-zinc-900/50 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[11px] text-zinc-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Booking ID</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Membership</th>
                  <th className="px-4 py-3">Court</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 hidden xl:table-cell">Created At</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {isPending && bookings.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-zinc-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin" />
                        <span className="text-sm font-medium">Loading bookings...</span>
                      </div>
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-zinc-500">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <Calendar className="h-7 w-7 text-zinc-600 mb-1" />
                        <span className="text-sm font-medium text-zinc-400">No bookings found.</span>
                        <span className="text-xs text-zinc-500">Try adjusting your search criteria or clearing active filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const canManageBooking = isStaff || booking.isMine;
                    const isUpcoming = new Date(booking.startTime).getTime() > nowMs;
                    const isConfirmed = booking.status === 'CONFIRMED';
                    const sessionDate = new Date(booking.startTime);

                    return (
                      <tr key={booking.id} className="hover:bg-zinc-850/50 transition-colors">
                        {/* Booking ID with Copy */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[11px] text-zinc-400">
                          <div className="flex items-center gap-1.5">
                            <span title={booking.id}>#{booking.id.slice(0, 8)}</span>
                            <button
                              onClick={() => handleCopyId(booking.id)}
                              className="text-zinc-500 hover:text-zinc-300"
                              title="Copy Full UUID"
                            >
                              {copiedId === booking.id ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Member */}
                        <td className="px-4 py-3">
                          <div className="text-white font-medium">
                            {booking.memberName ||
                              (booking.notes?.includes('Walk-in') ? 'Walk-in Guest' : 'Guest')}
                          </div>
                        </td>

                        {/* Membership */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {booking.membershipNumber ? (
                            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/50">
                              #{booking.membershipNumber}
                            </span>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">Guest</span>
                          )}
                        </td>

                        {/* Court & Sport */}
                        <td className="px-4 py-3">
                          <div className="text-zinc-200 font-medium">{booking.courtName}</div>
                          <div className="text-[10px] text-zinc-400">{booking.sportType}</div>
                        </td>

                        {/* Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-zinc-300">
                          {sessionDate.toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        {/* Time */}
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] font-mono text-zinc-300">
                          {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                        </td>

                        {/* Booking Type */}
                        <td className="px-4 py-3 whitespace-nowrap">{getBookingTypeBadge(booking.bookingType)}</td>

                        {/* Price */}
                        <td className="px-4 py-3 whitespace-nowrap font-semibold text-emerald-400">
                          {booking.finalPrice === 0 ? (
                            <span className="text-amber-400">Free</span>
                          ) : (
                            formatCurrency(booking.finalPrice)
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {getStatusBadge(booking.status)}
                          {booking.status === 'CANCELLED' && booking.cancellationReason && (
                            <div
                              className="text-[10px] text-zinc-500 max-w-[120px] truncate mt-0.5"
                              title={booking.cancellationReason}
                            >
                              {booking.cancellationReason}
                            </div>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="px-4 py-3 whitespace-nowrap text-[11px] text-zinc-400 hidden xl:table-cell">
                          {new Date(booking.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}{' '}
                          <span className="text-zinc-500 font-mono">
                            {new Date(booking.createdAt).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: false,
                            })}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            {/* View / Participant Details */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(booking.id)}
                              className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                              title="View Details & Participants"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>

                            {/* Reschedule Button */}
                            {canManageBooking && isConfirmed && isUpcoming && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setRescheduleBooking(booking);
                                  setNewCourtId(booking.courtId);
                                  const d = new Date(booking.startTime);
                                  setNewDate(d.toISOString().split('T')[0]);
                                  setNewTime(
                                    `${String(d.getUTCHours()).padStart(2, '0')}:${String(
                                      d.getUTCMinutes()
                                    ).padStart(2, '0')}`
                                  );
                                }}
                                className="h-7 text-xs text-amber-400 hover:text-amber-300 px-2"
                                title="Reschedule Session"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                                Reschedule
                              </Button>
                            )}

                            {/* Record Payment (Staff only) */}
                            {isStaff && isConfirmed && booking.finalPrice > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPaymentBooking(booking)}
                                className="h-7 text-xs text-emerald-400 hover:text-emerald-300 px-2"
                                title="Record Finance Payment"
                              >
                                <CreditCard className="h-3.5 w-3.5 mr-1" />
                                Pay
                              </Button>
                            )}

                            {/* Mark Completed (Staff only) */}
                            {isStaff && isConfirmed && !isUpcoming && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStatusChange(booking.id, 'COMPLETED')}
                                className="h-7 text-xs text-blue-400 hover:text-blue-300 px-2"
                                title="Mark Session Completed"
                              >
                                <UserCheck className="h-3.5 w-3.5 mr-1" />
                                Complete
                              </Button>
                            )}

                            {/* Cancel Button */}
                            {canManageBooking && isConfirmed && isUpcoming && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setCancelBookingId(booking.id)}
                                className="h-7 text-xs text-rose-400 hover:text-rose-300 px-2"
                                title="Cancel Booking"
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" />
                                Cancel
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Reusable Server-Side Pagination Bar (Requirements 1, 2, 6, 12) */}
          <div className="border-t border-zinc-800 bg-zinc-950/40 p-3">
            <Pagination
              currentPage={pagination.page}
              pageSize={pagination.pageSize}
              totalCount={pagination.totalCount}
              totalPages={pagination.totalPages}
              fromRecord={pagination.fromRecord}
              toRecord={pagination.toRecord}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              isLoading={isPending}
              itemLabel="bookings"
            />
          </div>
        </CardContent>
      </Card>

      {/* Details & Social Play Participant Modal */}
      {detailBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Booking details"
          onKeyDown={(e) => e.key === 'Escape' && setDetailBooking(null)}
        >
          <Card className="w-full max-w-lg border-zinc-700 bg-zinc-900 shadow-2xl">
            <CardHeader className="pb-3 border-b border-zinc-800 flex flex-row items-center justify-between">
              <CardTitle className="text-sm text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                Booking & Social Play Information
              </CardTitle>
              <button onClick={() => setDetailBooking(null)} className="text-zinc-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block">Court</span>
                  <span className="font-semibold text-white">{detailBooking.booking.courtName}</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block">Session Time</span>
                  <span className="font-semibold text-white">
                    {formatTime(detailBooking.booking.startTime)} - {formatTime(detailBooking.booking.endTime)}
                  </span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block">Session Type</span>
                  <span className="font-semibold text-emerald-400">{detailBooking.booking.bookingType}</span>
                </div>
                <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block">Status / Price</span>
                  <span className="font-semibold text-white">
                    {detailBooking.booking.status} • {formatCurrency(detailBooking.booking.finalPrice)}
                  </span>
                </div>
              </div>

              {/* Social Play Participants Section */}
              <div className="border-t border-zinc-800 pt-3">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-xs font-semibold text-zinc-300">
                    Participants ({detailBooking.participants.length}/12)
                  </h5>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {detailBooking.participants.length === 0 ? (
                    <div className="text-xs text-zinc-500 py-3 text-center bg-zinc-950/60 rounded-lg">
                      No additional participants registered yet.
                    </div>
                  ) : (
                    detailBooking.participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between bg-zinc-950/80 px-3 py-2 rounded-lg border border-zinc-800 text-xs"
                      >
                        <span className="text-zinc-200">
                          {p.memberName ? `👤 Member: ${p.memberName}` : `🎾 Guest: ${p.guestName}`}
                        </span>
                        {isStaff && (
                          <button
                            onClick={() => handleRemoveParticipant(p.id)}
                            className="text-rose-400 hover:text-rose-300"
                            title="Remove participant"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Add Participant Input */}
                {detailBooking.booking.bookingType === 'SOCIAL_PLAY' &&
                  detailBooking.booking.status === 'CONFIRMED' && (
                    <div className="mt-3 flex gap-2">
                      <Input
                        placeholder="Add guest or player name..."
                        value={addParticipantGuestName}
                        onChange={(e) => setAddParticipantGuestName(e.target.value)}
                        className="text-xs h-8 bg-zinc-950"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAddParticipant}
                        isLoading={isPending}
                        disabled={!addParticipantGuestName.trim()}
                        className="text-xs h-8"
                      >
                        Add
                      </Button>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Reschedule booking"
          onKeyDown={(e) => e.key === 'Escape' && setRescheduleBooking(null)}
        >
          <Card className="w-full max-w-md border-amber-600/40 bg-zinc-900 shadow-2xl">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4" />
                Reschedule Court Booking
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs text-zinc-300">
                Rescheduling revalidates court availability and daily member limits atomically.
              </p>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Target Court</label>
                <select
                  value={newCourtId}
                  onChange={(e) => setNewCourtId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none"
                >
                  {courts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">New Date</label>
                  <Input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="text-xs h-8 bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Start Time (:00 / :30)</label>
                  <select
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs text-zinc-200 outline-none h-8"
                  >
                    {[
                      '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
                      '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
                      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
                      '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00',
                    ].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRescheduleSubmit}
                  isLoading={isPending}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Save Reschedule
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setRescheduleBooking(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Payment Modal */}
      {paymentBooking && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Record payment"
          onKeyDown={(e) => e.key === 'Escape' && setPaymentBooking(null)}
        >
          <Card className="w-full max-w-md border-emerald-600/40 bg-zinc-900 shadow-2xl">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm text-emerald-300 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Record Booking Payment (Finance)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Court</span>
                  <span className="text-white font-medium">{paymentBooking.courtName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Amount Due</span>
                  <span className="text-emerald-400 font-bold">
                    {formatCurrency(paymentBooking.finalPrice)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER')
                  }
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CASH">Cash Counter</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Transaction Ref / Receipt #
                </label>
                <Input
                  placeholder="e.g. UPI-REF-992144"
                  value={paymentTxnRef}
                  onChange={(e) => setPaymentTxnRef(e.target.value)}
                  className="text-xs h-8 bg-zinc-950"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleRecordPayment}
                  isLoading={isPending}
                  className="flex-1"
                >
                  Record Payment
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setPaymentBooking(null)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancelBookingId && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Cancel booking"
          onKeyDown={(e) =>
            e.key === 'Escape' && (setCancelBookingId(null), setCancelReason(''))
          }
        >
          <Card className="w-full max-w-md border-rose-600/40 bg-zinc-900 shadow-2xl">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm text-rose-300 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Cancel Court Booking
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs text-zinc-300">
                Are you sure you want to cancel this reservation? The slot will immediately become
                available to other players, and the member quota will be restored.
              </p>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Reason for Cancellation *
                </label>
                <Input
                  placeholder="Reason for audit history..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="text-xs h-8 bg-zinc-950"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancelBooking}
                  isLoading={isPending}
                  disabled={cancelReason.trim().length < 3}
                  className="flex-1"
                >
                  Confirm Cancellation
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCancelBookingId(null);
                    setCancelReason('');
                  }}
                >
                  Back
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency, formatTime } from '@/lib/utils';
import {
  getCourtAvailabilityAction,
  createCourtBookingAction,
  rescheduleBookingAction,
  cancelBookingAction,
  getMembersForBookingAction,
  previewBookingPriceAction,
  getTodayScheduleAction,
  type TimeSlot,
  type CourtAvailability,
  type PricePreviewResult,
} from '@/actions/bookings';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wrench,
  Search,
  Sparkles,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface CourtInfo {
  id: string;
  name: string;
  sportType: string;
  hourlyRate: number;
  isIndoor: boolean;
  isActive: boolean;
}

interface MemberInfo {
  id: string;
  membershipNumber: string;
  fullName: string;
  tier: string;
  status: string;
}

interface BookingCalendarProps {
  courts: CourtInfo[];
  userRole: string;
  userMemberId: string | null;
}

export function BookingCalendar({ courts, userRole, userMemberId }: BookingCalendarProps) {
  const [selectedCourt, setSelectedCourt] = useState<CourtInfo | null>(
    courts.find((c) => c.isActive) || courts[0] || null
  );
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [availability, setAvailability] = useState<CourtAvailability | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Staff & member state
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [isWalkIn, setIsWalkIn] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [bookingType, setBookingType] = useState<'STANDARD' | 'SOCIAL_PLAY' | 'COACHING' | 'MAINTENANCE'>('STANDARD');

  // Live Pricing Preview state
  const [pricePreview, setPricePreview] = useState<PricePreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Rescheduling state
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [rescheduleTargetBooking, setRescheduleTargetBooking] = useState<{
    id: string;
    courtName: string;
    startTime: string;
  } | null>(null);

  // Cancellation state
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Operations stats state
  const [todayStats, setTodayStats] = useState<{
    totalBookingsToday: number;
    confirmedCount: number;
    completedCount: number;
    cancelledCount: number;
    activeCourtsCount: number;
    totalRevenueToday: number;
    capacityUtilizationPercent: number;
  } | null>(null);

  // Status feedback
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(userRole);

  // Refresh availability when court or date changes
  const refreshAvailability = async (courtId: string, date: string) => {
    setLoadingAvailability(true);
    setError(null);
    const result = await getCourtAvailabilityAction(courtId, date);
    if (result.success) {
      setAvailability(result.data);
    } else {
      setError(result.error);
    }
    setLoadingAvailability(false);
  };

  useEffect(() => {
    if (!selectedCourt) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoadingAvailability(true);
        setError(null);
        setSelectedSlot(null);
      }
    });

    getCourtAvailabilityAction(selectedCourt.id, selectedDate).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setAvailability(result.data);
      } else {
        setError(result.error);
      }
      setLoadingAvailability(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCourt, selectedDate]);

  // Load members & stats for staff
  useEffect(() => {
    if (isStaff) {
      getMembersForBookingAction().then((result) => {
        if (result.success) setMembers(result.data);
      });
      getTodayScheduleAction().then((result) => {
        if (result.success) setTodayStats(result.data);
      });
    }
  }, [isStaff]);

  // Calculate live pricing preview when slot or selected member changes
  useEffect(() => {
    let cancelled = false;

    if (!selectedSlot || !selectedCourt || selectedSlot.status !== 'available') {
      Promise.resolve().then(() => {
        if (!cancelled) setPricePreview(null);
      });
      return () => {
        cancelled = true;
      };
    }

    if (bookingType === 'MAINTENANCE') {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setPricePreview({
            hourlyRate: 0,
            basePrice: 0,
            discountAmount: 0,
            finalPrice: 0,
            discountPercent: 0,
            isFreeBenefit: false,
            tier: 'MAINTENANCE',
            hoursBookedToday: 0,
          });
        }
      });
      return () => {
        cancelled = true;
      };
    }

    const memberIdToPreview = isStaff
      ? (isWalkIn ? null : selectedMemberId)
      : userMemberId;

    Promise.resolve().then(() => {
      if (!cancelled) setLoadingPreview(true);
    });

    previewBookingPriceAction({
      courtId: selectedCourt.id,
      memberId: memberIdToPreview,
      startTime: selectedSlot.startTime,
    }).then((res) => {
      if (cancelled) return;
      if (res.success) {
        setPricePreview(res.data);
      }
      setLoadingPreview(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedSlot, selectedCourt, selectedMemberId, isWalkIn, isStaff, userMemberId, bookingType]);

  const handleDateNav = (direction: -1 | 1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleQuickDate = (type: 'today' | 'tomorrow' | 'friday') => {
    const now = new Date();
    if (type === 'today') {
      setSelectedDate(now.toISOString().split('T')[0]);
    } else if (type === 'tomorrow') {
      now.setDate(now.getDate() + 1);
      setSelectedDate(now.toISOString().split('T')[0]);
    } else if (type === 'friday') {
      const day = now.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      now.setDate(now.getDate() + diff);
      setSelectedDate(now.toISOString().split('T')[0]);
    }
  };

  // Perform booking confirmation
  const handleBookSlot = () => {
    if (!selectedSlot || !selectedCourt) return;
    setError(null);
    setSuccessMessage(null);

    const memberId = isStaff
      ? (isWalkIn ? null : selectedMemberId)
      : userMemberId;

    startTransition(async () => {
      const result = await createCourtBookingAction({
        courtId: selectedCourt.id,
        memberId: memberId || undefined,
        guestName: isWalkIn ? guestName : undefined,
        guestPhone: isWalkIn ? guestPhone : undefined,
        bookingType,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: bookingNotes || undefined,
      });

      if (result.success) {
        setSuccessMessage(
          `Court reserved successfully! Confirmed slot: ${formatTime(selectedSlot.startTime)} - ${formatTime(
            selectedSlot.endTime
          )}. Final Price: ${formatCurrency(result.data.finalPrice)}`
        );
        setSelectedSlot(null);
        setBookingNotes('');
        setGuestName('');
        setGuestPhone('');
        setIsWalkIn(false);
        setSelectedMemberId(null);
        setBookingType('STANDARD');
        // Refresh availability & stats
        if (selectedCourt) refreshAvailability(selectedCourt.id, selectedDate);
        if (isStaff) {
          getTodayScheduleAction().then((res) => res.success && setTodayStats(res.data));
        }
      } else {
        setError(result.error);
      }
    });
  };

  // Perform safe rescheduling
  const handleRescheduleConfirm = () => {
    if (!rescheduleTargetBooking || !selectedSlot || !selectedCourt) return;
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await rescheduleBookingAction({
        bookingId: rescheduleTargetBooking.id,
        newCourtId: selectedCourt.id,
        newStartTime: selectedSlot.startTime,
        newEndTime: selectedSlot.endTime,
        notes: bookingNotes || undefined,
      });

      if (result.success) {
        setSuccessMessage(
          `Booking successfully rescheduled to ${selectedCourt.name} on ${selectedDate} at ${formatTime(
            selectedSlot.startTime
          )}. New price: ${formatCurrency(result.data.newFinalPrice)}`
        );
        setIsRescheduling(false);
        setRescheduleTargetBooking(null);
        setSelectedSlot(null);
        setBookingNotes('');
        if (selectedCourt) refreshAvailability(selectedCourt.id, selectedDate);
      } else {
        setError(result.error);
      }
    });
  };

  // Perform cancellation
  const handleCancelBooking = () => {
    if (!cancelBookingId || cancelReason.trim().length < 3) return;
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await cancelBookingAction({
        bookingId: cancelBookingId,
        cancellationReason: cancelReason,
      });

      if (result.success) {
        setSuccessMessage('Booking cancelled. Member daily quota restored and court slot is immediately available.');
        setCancelBookingId(null);
        setCancelReason('');
        if (selectedCourt) refreshAvailability(selectedCourt.id, selectedDate);
        if (isStaff) {
          getTodayScheduleAction().then((res) => res.success && setTodayStats(res.data));
        }
      } else {
        setError(result.error);
      }
    });
  };

  const getDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = d.getTime() - today.getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
  };

  const isFriday = new Date(selectedDate + 'T00:00:00').getDay() === 5;

  const filteredMembers = members.filter((m) => {
    if (!memberSearchQuery) return true;
    const q = memberSearchQuery.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(q) ||
      m.membershipNumber.toLowerCase().includes(q) ||
      m.tier.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Front-Desk Operations KPI Banner */}
      {isStaff && todayStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-400" />
              Today&apos;s Bookings
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-white">{todayStats.totalBookingsToday}</span>
              <span className="text-[11px] text-zinc-500">({todayStats.confirmedCount} active)</span>
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
              Court Utilization
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-white">{todayStats.capacityUtilizationPercent}%</span>
              <span className="text-[11px] text-zinc-500">across {todayStats.activeCourtsCount} courts</span>
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-amber-400" />
              Booked Value
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-white">{formatCurrency(todayStats.totalRevenueToday)}</span>
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3">
            <span className="text-xs text-zinc-400 flex items-center gap-1.5">
              <Wrench className="h-3.5 w-3.5 text-purple-400" />
              Court Status
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-400">{todayStats.activeCourtsCount} Operational</span>
              {courts.length > todayStats.activeCourtsCount && (
                <span className="text-[11px] text-rose-400 font-medium">
                  ({courts.length - todayStats.activeCourtsCount} Inactive)
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rescheduling Notification Banner */}
      {isRescheduling && rescheduleTargetBooking && (
        <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ArrowRightLeft className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <h4 className="text-sm font-semibold text-amber-200">
                Rescheduling Mode Active
              </h4>
              <p className="text-xs text-zinc-300">
                Moving booking originally on <span className="font-medium text-white">{rescheduleTargetBooking.courtName}</span> at{' '}
                <span className="font-medium text-white">{formatTime(rescheduleTargetBooking.startTime)}</span>. Select a new court and available slot below.
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setIsRescheduling(false);
              setRescheduleTargetBooking(null);
              setSelectedSlot(null);
            }}
            className="text-xs text-amber-400 hover:text-amber-200"
          >
            Cancel Reschedule
          </Button>
        </div>
      )}

      {/* Court Selection Bar */}
      <div>
        <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Select Court</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {courts.map((court) => {
            const isSelected = selectedCourt?.id === court.id;
            return (
              <button
                key={court.id}
                onClick={() => setSelectedCourt(court)}
                className={cn(
                  'p-3 rounded-xl text-left transition-all border relative flex flex-col justify-between',
                  isSelected
                    ? 'bg-emerald-950/30 text-emerald-300 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/40'
                    : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700',
                  !court.isActive && 'border-rose-900/40 bg-rose-950/10 opacity-75'
                )}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-xs text-zinc-200 truncate">{court.name}</span>
                    {!court.isActive && (
                      <Badge variant="destructive" className="text-[9px] px-1 py-0">
                        Maintenance
                      </Badge>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    {court.sportType} • {court.isIndoor ? 'Indoor' : 'Outdoor'}
                  </div>
                </div>
                <div className="mt-2 text-[11px] font-semibold text-emerald-400">
                  {formatCurrency(court.hourlyRate)}/hr
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Navigation & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleDateNav(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
            <span className="text-sm font-semibold text-white ml-1">{getDateLabel(selectedDate)}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleDateNav(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Quick Date Shortcuts */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickDate('today')}
            className={cn('text-xs px-2.5 h-8', getDateLabel(selectedDate) === 'Today' && 'bg-zinc-800 text-white font-medium')}
          >
            Today
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickDate('tomorrow')}
            className={cn('text-xs px-2.5 h-8', getDateLabel(selectedDate) === 'Tomorrow' && 'bg-zinc-800 text-white font-medium')}
          >
            Tomorrow
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleQuickDate('friday')}
            className={cn(
              'text-xs px-2.5 h-8 text-amber-400 hover:text-amber-300',
              isFriday && 'bg-amber-950/40 border border-amber-600/40 text-amber-300'
            )}
          >
            <Users className="h-3 w-3 mr-1" />
            Next Friday Social
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/25 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h5 className="text-xs font-semibold text-rose-300">Action Encountered An Issue</h5>
            <p className="text-xs text-rose-200 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-xs text-rose-400 hover:text-white underline">
            Dismiss
          </button>
        </div>
      )}
      {successMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h5 className="text-xs font-semibold text-emerald-300">Operation Successful</h5>
            <p className="text-xs text-emerald-200 mt-0.5">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-xs text-emerald-400 hover:text-white underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Slots Layout + Dynamic Action Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Availability Grid */}
        <div className="lg:col-span-2">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  {selectedCourt?.name} — 30-min Slot Grid (1-Hr Sessions)
                </CardTitle>
                <div className="flex flex-wrap gap-2.5 text-[10px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500/60" /> Available
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500/60" /> Booked
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500/60" /> Social Play
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-purple-500/40 border border-purple-500/60" /> Maintenance
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-zinc-800 border border-zinc-700" /> Past
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {loadingAvailability ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
                  <span className="ml-2 text-xs text-zinc-400">Querying court availability...</span>
                </div>
              ) : availability ? (
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2">
                  {availability.slots.map((slot) => {
                    const startDate = new Date(slot.startTime);
                    const timeLabel = startDate.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });
                    const isSelected = selectedSlot?.startTime === slot.startTime;

                    return (
                      <button
                        key={slot.startTime}
                        disabled={
                          (slot.status === 'past' || slot.status === 'maintenance') && !isStaff
                        }
                        onClick={() => {
                          if (slot.status === 'available') {
                            setSelectedSlot(isSelected ? null : slot);
                            setCancelBookingId(null);
                          } else if (slot.status === 'booked' || slot.status === 'social_play') {
                            if (isStaff || slot.isMine) {
                              setCancelBookingId(slot.bookingId || null);
                              setSelectedSlot(null);
                            }
                          }
                        }}
                        className={cn(
                          'relative rounded-xl p-2 text-[11px] font-medium transition-all border text-center flex flex-col justify-between min-h-[58px]',
                          // Available State
                          slot.status === 'available' && !isSelected &&
                            'bg-emerald-950/20 text-emerald-300 border-emerald-800/40 hover:bg-emerald-900/35 hover:border-emerald-600/60 cursor-pointer shadow-sm',
                          slot.status === 'available' && isSelected &&
                            'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/50 scale-[1.02]',
                          // Booked State
                          slot.status === 'booked' &&
                            'bg-rose-950/30 text-rose-300 border-rose-800/50',
                          (isStaff || slot.isMine) && slot.status === 'booked' &&
                            'cursor-pointer hover:border-rose-500 hover:bg-rose-900/40',
                          // Social Play State
                          slot.status === 'social_play' &&
                            'bg-amber-950/30 text-amber-300 border-amber-800/60',
                          // Maintenance State
                          slot.status === 'maintenance' &&
                            'bg-purple-950/30 text-purple-300 border-purple-800/50 cursor-not-allowed opacity-75',
                          // Past State
                          slot.status === 'past' &&
                            'bg-zinc-900/60 text-zinc-600 border-zinc-800/40 cursor-not-allowed opacity-50'
                        )}
                      >
                        <span className="block font-semibold text-[11px]">{timeLabel}</span>

                        {slot.status === 'available' && (
                          <span className="block text-[9px] text-emerald-400/80 font-medium">Open</span>
                        )}

                        {slot.status === 'booked' && (
                          <span className="block text-[9px] truncate text-rose-200 font-normal">
                            {slot.isMine ? 'You' : slot.bookedBy || 'Booked'}
                          </span>
                        )}

                        {slot.status === 'social_play' && (
                          <span className="block text-[9px] text-amber-300 font-medium">Social ♣</span>
                        )}

                        {slot.status === 'maintenance' && (
                          <span className="block text-[9px] text-purple-400 font-medium">Maint.</span>
                        )}

                        {slot.status === 'past' && (
                          <span className="block text-[9px] text-zinc-600">Past</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 text-zinc-500 text-xs">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                  Select a court to load the availability schedule
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Panel: Booking Confirmation, Rescheduling, or Slot Actions */}
        <div className="space-y-4">
          {/* New Booking / Rescheduling Confirmation Card */}
          {selectedSlot && selectedSlot.status === 'available' && (
            <Card className="border-emerald-600/40 bg-zinc-900/80 shadow-lg">
              <CardHeader className="pb-3 border-b border-zinc-800">
                <CardTitle className="text-sm font-semibold text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {isRescheduling ? (
                      <>
                        <ArrowRightLeft className="h-4 w-4 text-amber-400" />
                        Confirm Reschedule
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        Confirm Court Booking
                      </>
                    )}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    1 Hour Session
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Session Details Summary */}
                <div className="rounded-lg bg-zinc-950/60 p-3 space-y-2 text-xs border border-zinc-800/80">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Court</span>
                    <span className="text-white font-medium">{selectedCourt?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Date</span>
                    <span className="text-white font-medium">{getDateLabel(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Time Window</span>
                    <span className="text-emerald-300 font-semibold">
                      {formatTime(selectedSlot.startTime)} — {formatTime(selectedSlot.endTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Sport</span>
                    <span className="text-zinc-200">{selectedCourt?.sportType}</span>
                  </div>
                </div>

                {/* Booking Type Selector (Staff only) */}
                {isStaff && !isRescheduling && (
                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">Session Type</label>
                    <select
                      value={bookingType}
                      onChange={(e) => setBookingType(e.target.value as 'STANDARD' | 'SOCIAL_PLAY' | 'COACHING' | 'MAINTENANCE')}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                    >
                      <option value="STANDARD">Standard Session</option>
                      {isFriday && <option value="SOCIAL_PLAY">Friday Social Play (Multi-Player)</option>}
                      <option value="COACHING">Coaching Session</option>
                      <option value="MAINTENANCE">Court Maintenance Closure</option>
                    </select>
                  </div>
                )}

                {/* Staff: Member Selector or Walk-in Guest */}
                {isStaff && bookingType !== 'MAINTENANCE' && !isRescheduling && (
                  <div className="space-y-3 pt-1 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">Player Assignment</label>
                      <button
                        type="button"
                        onClick={() => setIsWalkIn(!isWalkIn)}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium"
                      >
                        {isWalkIn ? '← Select Registered Member' : '+ Walk-in Guest'}
                      </button>
                    </div>

                    {!isWalkIn ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
                          <Input
                            placeholder="Search member name or number..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="pl-8 text-xs py-1.5 h-8 bg-zinc-950"
                          />
                        </div>
                        <select
                          value={selectedMemberId || ''}
                          onChange={(e) => setSelectedMemberId(e.target.value || null)}
                          className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
                        >
                          <option value="">Select Member (or choose Walk-in)</option>
                          {filteredMembers.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.fullName} ({m.membershipNumber}) — {m.tier}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800">
                        <Input
                          placeholder="Guest Full Name *"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="text-xs h-8 bg-zinc-950"
                        />
                        <Input
                          placeholder="Contact Phone (Optional)"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="text-xs h-8 bg-zinc-950"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Notes Input */}
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Notes / Instructions</label>
                  <Input
                    placeholder="e.g. Bring own tennis balls / floodlights required"
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    className="text-xs h-8 bg-zinc-950"
                  />
                </div>

                {/* Live Server-Side Pricing Breakdown */}
                <div className="rounded-lg bg-zinc-950/80 p-3 border border-zinc-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400">Base Hourly Rate</span>
                    <span className="text-zinc-200">
                      {formatCurrency(pricePreview?.basePrice ?? selectedCourt?.hourlyRate ?? 0)}
                    </span>
                  </div>

                  {pricePreview && pricePreview.discountAmount > 0 && (
                    <div className="flex items-center justify-between text-xs text-emerald-400">
                      <span>
                        Plan Discount ({pricePreview.tier} - {pricePreview.discountPercent}%)
                      </span>
                      <span>-{formatCurrency(pricePreview.discountAmount)}</span>
                    </div>
                  )}

                  {pricePreview?.isFreeBenefit && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-400 font-medium">
                      <Sparkles className="h-3 w-3" />
                      Free Daily Court Hour (Gold Tier Benefit)
                    </div>
                  )}

                  <div className="border-t border-zinc-800 pt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Final Calculated Price</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-400">
                        {loadingPreview
                          ? 'Calculating...'
                          : formatCurrency(pricePreview?.finalPrice ?? selectedCourt?.hourlyRate ?? 0)}
                      </span>
                      <div className="text-[10px] text-zinc-500">Calculated server-side</div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  {isRescheduling ? (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleRescheduleConfirm}
                      isLoading={isPending}
                      className="flex-1 bg-amber-600 hover:bg-amber-500 text-white"
                    >
                      Confirm Reschedule
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleBookSlot}
                      isLoading={isPending}
                      className="flex-1"
                    >
                      {isPending ? 'Confirming...' : 'Confirm Reservation'}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedSlot(null);
                      setBookingNotes('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Booked Slot Action Drawer (Staff / Owner: Reschedule or Cancel) */}
          {cancelBookingId && (
            <Card className="border-zinc-800 bg-zinc-900/90 shadow-lg">
              <CardHeader className="pb-3 border-b border-zinc-800">
                <CardTitle className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4 text-emerald-400" />
                  Booking Operations
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <p className="text-xs text-zinc-400">
                  You have selected a reserved slot. Choose an action below:
                </p>

                {/* Reschedule Button */}
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-white block">Reschedule Booking</span>
                    <span className="text-[10px] text-zinc-400">Change date, time, or court with conflict checking</span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsRescheduling(true);
                      setRescheduleTargetBooking({
                        id: cancelBookingId,
                        courtName: selectedCourt?.name || 'Current Court',
                        startTime: selectedDate,
                      });
                      setCancelBookingId(null);
                    }}
                    className="text-xs"
                  >
                    Reschedule
                  </Button>
                </div>

                {/* Cancel Booking Section */}
                <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-3">
                  <span className="text-xs font-semibold text-rose-300 block">Cancel Booking</span>
                  <p className="text-[11px] text-zinc-400">
                    Cancelling restores the member&apos;s daily 2-session quota and frees the court slot.
                  </p>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300 mb-1">
                      Cancellation Reason *
                    </label>
                    <Input
                      placeholder="e.g. Member requested cancellation / Rain closure"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="text-xs h-8 bg-zinc-950"
                    />
                  </div>
                  <div className="flex gap-2">
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
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Info & Rules (Default view) */}
          {!selectedSlot && !cancelBookingId && (
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader className="pb-3 border-b border-zinc-800/60">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Scheduling Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2.5 text-xs text-zinc-300">
                <div className="flex items-start gap-2">
                  <Clock className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    Sessions are strictly <strong className="text-white">1 hour</strong>, starting on the hour (:00) or half-hour (:30).
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>
                    Maximum <strong className="text-white">2 bookings per member per day</strong> (freed if cancelled).
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-amber-300">Gold Tier</strong>: 1 free hour daily + 50% discount on additional bookings.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <CalendarDays className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-purple-300">Friday Social Play</strong>: Multi-player open sessions held exclusively on Fridays.
                  </span>
                </div>
                {isStaff && (
                  <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
                    💡 <strong className="text-zinc-200">Staff Tip:</strong> Click any booked slot to easily reschedule or cancel it with full audit tracking.
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

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
  cancelBookingAction,
  getMembersForBookingAction,
  type TimeSlot,
  type CourtAvailability,
} from '@/actions/bookings';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
  const [selectedCourt, setSelectedCourt] = useState<CourtInfo | null>(courts.find(c => c.isActive) || null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [availability, setAvailability] = useState<CourtAvailability | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [bookingNotes, setBookingNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadingAvailability, setLoadingAvailability] = useState(false);

  const activeCourts = courts.filter(c => c.isActive);
  const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(userRole);

  // Load availability when court or date changes
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

  // Load members for staff
  useEffect(() => {
    if (isStaff) {
      getMembersForBookingAction().then((result) => {
        if (result.success) {
          setMembers(result.data);
        }
      });
    }
  }, [isStaff]);

  const handleDateNav = (direction: -1 | 1) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleBookSlot = () => {
    if (!selectedSlot || !selectedCourt) return;
    setError(null);
    setSuccessMessage(null);

    const memberId = isStaff ? selectedMemberId : userMemberId;

    startTransition(async () => {
      const result = await createCourtBookingAction({
        courtId: selectedCourt.id,
        memberId: memberId || undefined,
        bookingType: 'STANDARD',
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        notes: bookingNotes || undefined,
      });

      if (result.success) {
        setSuccessMessage(result.message || 'Booking confirmed!');
        setSelectedSlot(null);
        setBookingNotes('');
        setSelectedMemberId(null);
        // Refresh availability
        const refreshed = await getCourtAvailabilityAction(selectedCourt.id, selectedDate);
        if (refreshed.success) setAvailability(refreshed.data);
      } else {
        setError(result.error);
      }
    });
  };

  const handleCancelBooking = () => {
    if (!cancelBookingId || !cancelReason) return;
    setError(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const result = await cancelBookingAction({
        bookingId: cancelBookingId,
        cancellationReason: cancelReason,
      });

      if (result.success) {
        setSuccessMessage('Booking cancelled successfully.');
        setCancelBookingId(null);
        setCancelReason('');
        // Refresh availability
        if (selectedCourt) {
          const refreshed = await getCourtAvailabilityAction(selectedCourt.id, selectedDate);
          if (refreshed.success) setAvailability(refreshed.data);
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

  const getDayName = (dateStr: string) => {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' });
  };

  const isFriday = getDayName(selectedDate) === 'Friday';

  return (
    <div className="space-y-6">
      {/* Court Selector */}
      <div className="flex gap-2 flex-wrap">
        {activeCourts.map((court) => (
          <button
            key={court.id}
            onClick={() => setSelectedCourt(court)}
            className={cn(
              'px-4 py-2.5 rounded-lg text-xs font-medium transition-all border',
              selectedCourt?.id === court.id
                ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200'
            )}
          >
            <span className="block">{court.name}</span>
            <span className="text-[10px] opacity-70">{court.sportType} • {formatCurrency(court.hourlyRate)}/hr</span>
          </button>
        ))}
      </div>

      {/* Date Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => handleDateNav(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-emerald-400" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
          <span className="text-sm text-zinc-300 font-medium">{getDateLabel(selectedDate)}</span>
          {isFriday && (
            <Badge variant="warning" className="text-[10px]">
              <Users className="h-3 w-3 mr-1" />
              Friday Social Play Available
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => handleDateNav(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-rose-300">{error}</p>
            <button onClick={() => setError(null)} className="text-xs text-rose-400 underline mt-1">Dismiss</button>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-emerald-300">{successMessage}</p>
            <button onClick={() => setSuccessMessage(null)} className="text-xs text-emerald-400 underline mt-1">Dismiss</button>
          </div>
        </div>
      )}

      {/* Main Content: Slots Grid + Booking Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Availability Grid */}
        <div className="lg:col-span-2">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  {selectedCourt?.name || 'Select a Court'} — Time Slots
                </CardTitle>
                <div className="flex gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500/40 border border-emerald-500/60" /> Available</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-rose-500/40 border border-rose-500/60" /> Booked</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-zinc-700 border border-zinc-600" /> Past</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500/40 border border-amber-500/60" /> Social Play</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAvailability ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 text-emerald-400 animate-spin" />
                  <span className="ml-2 text-sm text-zinc-400">Loading availability...</span>
                </div>
              ) : availability ? (
                <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2">
                  {availability.slots.map((slot) => {
                    const startDate = new Date(slot.startTime);
                    const timeLabel = startDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const isSelected = selectedSlot?.startTime === slot.startTime;

                    return (
                      <button
                        key={slot.startTime}
                        disabled={slot.status === 'past' || slot.status === 'booked' || isPending}
                        onClick={() => {
                          if (slot.status === 'available') {
                            setSelectedSlot(isSelected ? null : slot);
                            setCancelBookingId(null);
                          } else if (slot.status === 'social_play') {
                            setSelectedSlot(isSelected ? null : slot);
                            setCancelBookingId(null);
                          } else if (slot.status === 'booked' && slot.bookingId && isStaff) {
                            setCancelBookingId(slot.bookingId);
                            setSelectedSlot(null);
                          }
                        }}
                        title={slot.bookedBy ? `Booked by: ${slot.bookedBy}` : undefined}
                        className={cn(
                          'relative rounded-lg p-2 text-[11px] font-medium transition-all border text-center cursor-pointer',
                          slot.status === 'available' && !isSelected &&
                            'bg-emerald-950/30 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40 hover:border-emerald-600/60',
                          slot.status === 'available' && isSelected &&
                            'bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-900/30 ring-2 ring-emerald-400/50',
                          slot.status === 'booked' &&
                            'bg-rose-950/30 text-rose-300 border-rose-800/50 cursor-default opacity-80',
                          slot.status === 'past' &&
                            'bg-zinc-900/50 text-zinc-600 border-zinc-800/40 cursor-not-allowed opacity-50',
                          slot.status === 'social_play' && !isSelected &&
                            'bg-amber-950/30 text-amber-300 border-amber-800/50 hover:bg-amber-900/40',
                          slot.status === 'social_play' && isSelected &&
                            'bg-amber-600 text-white border-amber-500 shadow-lg ring-2 ring-amber-400/50',
                          isStaff && slot.status === 'booked' && 'cursor-pointer hover:border-rose-600',
                        )}
                      >
                        <span className="block">{timeLabel}</span>
                        {slot.status === 'booked' && (
                          <span className="block text-[9px] opacity-70 truncate mt-0.5">{slot.bookedBy}</span>
                        )}
                        {slot.status === 'social_play' && (
                          <span className="block text-[9px] opacity-70 mt-0.5">Social ♣</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-zinc-500 text-sm">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                  Select a court to view availability
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Form / Details Panel */}
        <div className="space-y-4">
          {/* New Booking Panel */}
          {selectedSlot && selectedSlot.status === 'available' && (
            <Card className="border-emerald-800/50 bg-emerald-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Court</span>
                    <span className="text-white font-medium">{selectedCourt?.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Date</span>
                    <span className="text-white">{getDateLabel(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Time</span>
                    <span className="text-white">
                      {formatTime(selectedSlot.startTime)} — {formatTime(selectedSlot.endTime)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Duration</span>
                    <span className="text-white">1 Hour</span>
                  </div>
                  <div className="flex justify-between border-t border-zinc-800 pt-2">
                    <span className="text-zinc-400">Base Rate</span>
                    <span className="text-emerald-400 font-semibold">
                      {formatCurrency(selectedCourt?.hourlyRate || 0)}
                    </span>
                  </div>
                </div>

                {/* Member selector (staff only) */}
                {isStaff && (
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Book for Member</label>
                    <select
                      value={selectedMemberId || ''}
                      onChange={(e) => setSelectedMemberId(e.target.value || null)}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">Walk-in / Guest</option>
                      {members.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.fullName} ({m.membershipNumber}) — {m.tier}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Notes (optional)</label>
                  <Input
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="Any special requirements..."
                    className="text-xs"
                  />
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBookSlot}
                  isLoading={isPending}
                  className="w-full"
                >
                  {isPending ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Cancel Booking Panel (staff only) */}
          {cancelBookingId && isStaff && (
            <Card className="border-rose-800/50 bg-rose-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-rose-300 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Cancel Booking
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-zinc-400">
                  This will cancel the booking and free the time slot. The booking record will be preserved for history.
                </p>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Cancellation Reason *</label>
                  <Input
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Reason for cancellation..."
                    className="text-xs"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleCancelBooking}
                    isLoading={isPending}
                    disabled={cancelReason.length < 3}
                    className="flex-1"
                  >
                    Cancel Booking
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
              </CardContent>
            </Card>
          )}

          {/* Friday Social Play Quick Info */}
          {isFriday && (
            <Card className="border-amber-800/50 bg-amber-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-amber-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Friday Social Play
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 space-y-2">
                <p>
                  It&apos;s Friday! Social play sessions allow multiple participants to share a court.
                  Staff can create a Social Play booking and add participants.
                </p>
                <p className="text-amber-300/80">
                  Social play bookings appear in amber. Individual players are tracked via the participant system.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Booking Info Panel (when no slot selected) */}
          {!selectedSlot && !cancelBookingId && (
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-zinc-300">Booking Information</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400 space-y-2">
                <p>• Sessions are <strong className="text-zinc-200">1 hour</strong> long</p>
                <p>• New slots start every <strong className="text-zinc-200">30 minutes</strong></p>
                <p>• Maximum <strong className="text-zinc-200">2 bookings per day</strong> per member</p>
                <p>• Gold members: <strong className="text-amber-300">1 free hour/day</strong> + 50% discount</p>
                <p>• Silver members: <strong className="text-zinc-200">25% discount</strong></p>
                <p>• Junior members: <strong className="text-zinc-200">30% discount</strong></p>
                {isStaff && (
                  <p className="pt-2 border-t border-zinc-800 text-emerald-400">
                    Staff: Click a booked slot to view cancellation options.
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

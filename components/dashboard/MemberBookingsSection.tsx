'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatTime, formatDate } from '@/lib/utils';
import { cancelBookingAction } from '@/actions/bookings';
import {
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

interface MemberBooking {
  id: string;
  courtName: string;
  sportType: string;
  startTime: string;
  endTime: string;
  status: string;
  finalPrice: number;
  cancellationReason?: string | null;
  notes?: string | null;
}

interface MemberBookingsSectionProps {
  bookings: MemberBooking[];
}

export function MemberBookingsSection({ bookings: initialBookings }: MemberBookingsSectionProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Double-submit guard
  const submittingRef = useRef(false);

  // Auto-dismiss success timer
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

  const now = new Date().getTime();
  const upcoming = bookings.filter(
    (b) => new Date(b.startTime).getTime() > now && b.status === 'CONFIRMED'
  );
  const pastOrCancelled = bookings.filter(
    (b) => new Date(b.startTime).getTime() <= now || b.status !== 'CONFIRMED'
  );

  const handleCancel = () => {
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
          showSuccess('Booking cancelled successfully. Your daily quota is restored.');
          setBookings((prev) =>
            prev.map((b) =>
              b.id === cancelBookingId
                ? { ...b, status: 'CANCELLED', cancellationReason: cancelReason }
                : b
            )
          );
          setCancelBookingId(null);
          setCancelReason('');
        } else {
          setError(result.error);
        }
      } finally {
        submittingRef.current = false;
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Feedback Alerts */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          {success}
        </div>
      )}

      {/* Upcoming Bookings */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="pb-3 border-b border-zinc-800/80 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-emerald-400" />
              Upcoming Court Sessions
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400 mt-0.5">
              Active court reservations. You can cancel or reschedule up to your session start.
            </CardDescription>
          </div>
          <Link href="/dashboard/bookings">
            <Button variant="secondary" size="sm" className="text-xs h-7">
              Book a Court <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="pt-4">
          {upcoming.length === 0 ? (
            <div className="text-center py-8 text-zinc-500 text-xs">
              <CalendarDays className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
              You have no upcoming court reservations.
              <div className="mt-2">
                <Link href="/dashboard/bookings" className="text-emerald-400 hover:underline">
                  Browse Court Availability →
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {upcoming.map((b) => (
                <div
                  key={b.id}
                  className="rounded-xl p-3.5 bg-zinc-950/70 border border-zinc-800 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-xs text-white">{b.courtName}</span>
                      <Badge variant="success" className="text-[10px]">
                        Confirmed
                      </Badge>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-1">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      <span>{formatDate(b.startTime)} • {formatTime(b.startTime)} - {formatTime(b.endTime)}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400">
                      {b.finalPrice === 0 ? 'Free (Gold Benefit)' : formatCurrency(b.finalPrice)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCancelBookingId(b.id)}
                      className="text-xs h-7 text-rose-400 hover:text-rose-300"
                    >
                      <XCircle className="h-3.5 w-3.5 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past / Cancelled History */}
      {pastOrCancelled.length > 0 && (
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-3 border-b border-zinc-800/60">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Past Reservations & History
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="divide-y divide-zinc-800/60 text-xs">
              {pastOrCancelled.slice(0, 10).map((b) => (
                <div key={b.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-zinc-200 block">{b.courtName}</span>
                    <span className="text-[10px] text-zinc-500">
                      {formatDate(b.startTime)} • {formatTime(b.startTime)}
                    </span>
                    {b.status === 'CANCELLED' && b.cancellationReason && (
                      <span className="block text-[10px] text-rose-400/80 mt-0.5">
                        Cancelled: {b.cancellationReason}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={
                        b.status === 'COMPLETED'
                          ? 'default'
                          : b.status === 'CANCELLED'
                          ? 'destructive'
                          : 'outline'
                      }
                      className="text-[10px]"
                    >
                      {b.status}
                    </Badge>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {formatCurrency(b.finalPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Modal */}
      {cancelBookingId && (
        <div
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Cancel reservation"
          onKeyDown={(e) => e.key === 'Escape' && (setCancelBookingId(null), setCancelReason(''))}
        >
          <Card className="w-full max-w-sm border-rose-600/40 bg-zinc-900 shadow-2xl">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm text-rose-300 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Cancel Reservation
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <p className="text-xs text-zinc-300">
                Are you sure you want to cancel this booking? Your daily booking limit quota will be restored immediately.
              </p>
              <Input
                placeholder="Reason for cancellation..."
                aria-label="Reason for cancellation"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="text-xs h-8 bg-zinc-950"
              />
              <div className="flex gap-2 pt-1">
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleCancel}
                  isLoading={isPending}
                  disabled={cancelReason.trim().length < 3}
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
                  Keep
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

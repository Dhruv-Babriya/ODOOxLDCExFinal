'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatTime } from '@/lib/utils';
import {
  getBookingsAction,
  cancelBookingAction,
  rescheduleBookingAction,
  getBookingDetailsAction,
  addSocialPlayParticipantAction,
  removeSocialPlayParticipantAction,
  recordBookingPaymentAction,
  updateBookingStatusAction,
} from '@/actions/bookings';
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
} from 'lucide-react';

interface BookingRow {
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
  cancelledAt: string | null;
  notes: string | null;
  createdAt: string;
  isMine: boolean;
}

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
  courts: CourtInfo[];
  userRole: string;
}

export function BookingsList({ initialBookings, courts, userRole }: BookingsListProps) {
  const [bookings, setBookings] = useState(initialBookings);
  const [filterCourt, setFilterCourt] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Cancellation Modal State
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  // Details & Participant Modal State
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
  const [currentTime] = useState(() => Date.now());

  const isStaff = ['OWNER', 'ADMIN', 'FRONT_DESK'].includes(userRole);

  const handleFilter = () => {
    startTransition(async () => {
      const result = await getBookingsAction({
        courtId: filterCourt || undefined,
        status: filterStatus || undefined,
        date: filterDate || undefined,
      });

      if (result.success) {
        setBookings(result.data);
      } else {
        setError(result.error);
      }
    });
  };

  const handleCancelBooking = () => {
    if (!cancelBookingId || cancelReason.trim().length < 3) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await cancelBookingAction({
        bookingId: cancelBookingId,
        cancellationReason: cancelReason,
      });

      if (result.success) {
        setSuccess('Booking cancelled successfully.');
        setCancelBookingId(null);
        setCancelReason('');
        handleFilter();
      } else {
        setError(result.error);
      }
    });
  };

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

  const handleAddParticipant = () => {
    if (!detailBooking || !addParticipantGuestName.trim()) return;

    startTransition(async () => {
      const result = await addSocialPlayParticipantAction({
        bookingId: detailBooking.booking.id,
        guestName: addParticipantGuestName.trim(),
      });

      if (result.success) {
        setAddParticipantGuestName('');
        // Refresh details
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

  const handleRecordPayment = () => {
    if (!paymentBooking) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await recordBookingPaymentAction({
        bookingId: paymentBooking.id,
        amount: paymentBooking.finalPrice > 0 ? paymentBooking.finalPrice : 0.01,
        paymentMethod,
        transactionReference: paymentTxnRef || undefined,
      });

      if (result.success) {
        setSuccess(result.message || 'Payment recorded successfully!');
        setPaymentBooking(null);
        setPaymentTxnRef('');
        handleFilter();
      } else {
        setError(result.error);
      }
    });
  };

  const handleStatusChange = (bookingId: string, status: 'COMPLETED' | 'NO_SHOW') => {
    startTransition(async () => {
      const result = await updateBookingStatusAction(bookingId, status);
      if (result.success) {
        setSuccess(result.message || `Status updated to ${status}`);
        handleFilter();
      } else {
        setError(result.error);
      }
    });
  };

  const handleRescheduleSubmit = () => {
    if (!rescheduleBooking || !newCourtId || !newDate || !newTime) return;
    setError(null);
    setSuccess(null);

    const startDateTime = new Date(`${newDate}T${newTime}:00Z`);
    const endDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);

    startTransition(async () => {
      const result = await rescheduleBookingAction({
        bookingId: rescheduleBooking.id,
        newCourtId,
        newStartTime: startDateTime.toISOString(),
        newEndTime: endDateTime.toISOString(),
      });

      if (result.success) {
        setSuccess('Booking rescheduled successfully!');
        setRescheduleBooking(null);
        handleFilter();
      } else {
        setError(result.error);
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
    <div className="space-y-4">
      {/* Messages */}
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-3 flex items-center justify-between text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            {error}
          </div>
          <button onClick={() => setError(null)} className="underline text-rose-400">Dismiss</button>
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            {success}
          </div>
          <button onClick={() => setSuccess(null)} className="underline text-emerald-400">Dismiss</button>
        </div>
      )}

      {/* Filter Bar */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Filter className="h-3.5 w-3.5 text-emerald-400" />
              <span>Filters:</span>
            </div>

            <select
              value={filterCourt}
              onChange={(e) => setFilterCourt(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="">All Courts</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            >
              <option value="">All Statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="NO_SHOW">No Show</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:ring-1 focus:ring-emerald-500 outline-none"
            />

            <Button variant="secondary" size="sm" onClick={handleFilter} isLoading={isPending} className="h-7 text-xs">
              Apply Filter
            </Button>
            {(filterCourt || filterStatus || filterDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterCourt('');
                  setFilterStatus('');
                  setFilterDate('');
                  startTransition(async () => {
                    const res = await getBookingsAction();
                    if (res.success) setBookings(res.data);
                  });
                }}
                className="h-7 text-xs text-zinc-400"
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-950/70 border-b border-zinc-800 text-[11px] text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Court / Sport</th>
                  <th className="px-4 py-3">Reserved By</th>
                  <th className="px-4 py-3">Session Time</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {bookings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                      No court bookings match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => {
                    const canManageBooking = isStaff || booking.isMine;
                    const isUpcoming = new Date(booking.startTime).getTime() > currentTime;
                    const isConfirmed = booking.status === 'CONFIRMED';

                    return (
                      <tr key={booking.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-white">
                          <div>{booking.courtName}</div>
                          <div className="text-[10px] text-zinc-400 font-normal">{booking.sportType}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-zinc-200">
                            {booking.memberName || (booking.notes?.includes('Walk-in') ? 'Walk-in Guest' : 'Guest')}
                          </div>
                          {booking.membershipNumber && (
                            <div className="text-[10px] text-zinc-500 font-mono">
                              #{booking.membershipNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-zinc-200">
                            {new Date(booking.startTime).toLocaleDateString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono">
                            {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                          </div>
                        </td>
                        <td className="px-4 py-3">{getBookingTypeBadge(booking.bookingType)}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-400">
                          {booking.finalPrice === 0 ? (
                            <span className="text-amber-400">Free</span>
                          ) : (
                            formatCurrency(booking.finalPrice)
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(booking.status)}
                          {booking.status === 'CANCELLED' && booking.cancellationReason && (
                            <div className="text-[10px] text-zinc-500 max-w-[140px] truncate mt-0.5" title={booking.cancellationReason}>
                              {booking.cancellationReason}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View / Participant details */}
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
                                  setNewTime(`${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`);
                                }}
                                className="h-7 text-xs text-amber-400 hover:text-amber-300"
                                title="Reschedule Session"
                              >
                                <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                                Reschedule
                              </Button>
                            )}

                            {/* Record Payment Button (Staff only) */}
                            {isStaff && isConfirmed && booking.finalPrice > 0 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPaymentBooking(booking)}
                                className="h-7 text-xs text-emerald-400 hover:text-emerald-300"
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
                                className="h-7 text-xs text-blue-400 hover:text-blue-300"
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
                                className="h-7 text-xs text-rose-400 hover:text-rose-300"
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
        </CardContent>
      </Card>

      {/* Details & Social Play Participant Modal */}
      {detailBooking && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
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

                {/* Add participant input */}
                {detailBooking.booking.bookingType === 'SOCIAL_PLAY' && detailBooking.booking.status === 'CONFIRMED' && (
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
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
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
                    {['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'].map((t) => (
                      <option key={t} value={t}>{t}</option>
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
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
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
                  <span className="text-emerald-400 font-bold">{formatCurrency(paymentBooking.finalPrice)}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER')}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none"
                >
                  <option value="UPI">UPI / QR Code</option>
                  <option value="CASH">Cash Counter</option>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Transaction Ref / Receipt #</label>
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
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-rose-600/40 bg-zinc-900 shadow-2xl">
            <CardHeader className="pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm text-rose-300 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Cancel Court Booking
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <p className="text-xs text-zinc-300">
                Are you sure you want to cancel this reservation? The slot will immediately become available to other players, and the member quota will be restored.
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

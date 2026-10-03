'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency, formatDateTime, formatTime } from '@/lib/utils';
import {
  getBookingsAction,
  cancelBookingAction,
  getBookingDetailsAction,
  addSocialPlayParticipantAction,
} from '@/actions/bookings';
import {
  CalendarDays,
  Search,
  Filter,
  XCircle,
  Eye,
  Users,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  X,
} from 'lucide-react';

interface BookingRow {
  id: string;
  courtName: string;
  sportType: string;
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
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [detailBooking, setDetailBooking] = useState<{
    booking: BookingRow;
    participants: Array<{ id: string; memberName: string | null; guestName: string | null }>;
  } | null>(null);
  const [addParticipantGuestName, setAddParticipantGuestName] = useState('');

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
    if (!cancelBookingId || cancelReason.length < 3) return;
    setError(null);

    startTransition(async () => {
      const result = await cancelBookingAction({
        bookingId: cancelBookingId,
        cancellationReason: cancelReason,
      });

      if (result.success) {
        setSuccess('Booking cancelled.');
        setCancelBookingId(null);
        setCancelReason('');
        handleFilter(); // Refresh
      } else {
        setError(result.error);
      }
    });
  };

  const handleViewDetails = (booking: BookingRow) => {
    startTransition(async () => {
      const result = await getBookingDetailsAction(booking.id);
      if (result.success) {
        setDetailBooking({
          booking,
          participants: result.data.participants,
        });
      }
    });
  };

  const handleAddParticipant = () => {
    if (!detailBooking || !addParticipantGuestName) return;

    startTransition(async () => {
      const result = await addSocialPlayParticipantAction({
        bookingId: detailBooking.booking.id,
        guestName: addParticipantGuestName,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return <Badge variant="success" className="text-[10px]">Confirmed</Badge>;
      case 'CANCELLED': return <Badge variant="destructive" className="text-[10px]">Cancelled</Badge>;
      case 'COMPLETED': return <Badge variant="default" className="text-[10px]">Completed</Badge>;
      case 'PENDING': return <Badge variant="warning" className="text-[10px]">Pending</Badge>;
      case 'NO_SHOW': return <Badge variant="destructive" className="text-[10px]">No Show</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const getBookingTypeBadge = (type: string) => {
    switch (type) {
      case 'STANDARD': return <Badge variant="outline" className="text-[10px]">Standard</Badge>;
      case 'SOCIAL_PLAY': return <Badge variant="warning" className="text-[10px]">Social Play</Badge>;
      case 'COACHING': return <Badge variant="default" className="text-[10px]">Coaching</Badge>;
      case 'MAINTENANCE': return <Badge variant="destructive" className="text-[10px]">Maintenance</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 flex items-center gap-2 text-sm text-rose-300">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-rose-400 hover:text-rose-300"><X className="h-3 w-3" /></button>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3 flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
          <button onClick={() => setSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-300"><X className="h-3 w-3" /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Court</label>
          <select
            value={filterCourt}
            onChange={(e) => setFilterCourt(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 h-10"
          >
            <option value="">All Courts</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 h-10"
          >
            <option value="">All Statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="NO_SHOW">No Show</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 h-10 focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
        <Button variant="secondary" size="sm" onClick={handleFilter} isLoading={isPending}>
          <Filter className="h-3.5 w-3.5" />
          Apply Filters
        </Button>
        <Button variant="ghost" size="sm" onClick={() => {
          setFilterCourt('');
          setFilterStatus('');
          setFilterDate('');
          handleFilter();
        }}>
          Clear
        </Button>
      </div>

      {/* Booking Detail Modal */}
      {detailBooking && (
        <Card className="border-sky-800/50 bg-sky-950/10">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-sky-300 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Booking Details
            </CardTitle>
            <button onClick={() => setDetailBooking(null)} className="text-zinc-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-zinc-400">Court:</span> <span className="text-white ml-1">{detailBooking.booking.courtName}</span></div>
              <div><span className="text-zinc-400">Type:</span> <span className="ml-1">{getBookingTypeBadge(detailBooking.booking.bookingType)}</span></div>
              <div><span className="text-zinc-400">Time:</span> <span className="text-white ml-1">{formatTime(detailBooking.booking.startTime)} — {formatTime(detailBooking.booking.endTime)}</span></div>
              <div><span className="text-zinc-400">Status:</span> <span className="ml-1">{getStatusBadge(detailBooking.booking.status)}</span></div>
              <div><span className="text-zinc-400">Member:</span> <span className="text-white ml-1">{detailBooking.booking.memberName || 'Walk-in'}</span></div>
              <div><span className="text-zinc-400">Price:</span> <span className="text-emerald-400 font-semibold ml-1">{formatCurrency(detailBooking.booking.finalPrice)}</span></div>
            </div>

            {/* Participants (for Social Play) */}
            {detailBooking.booking.bookingType === 'SOCIAL_PLAY' && (
              <div className="border-t border-zinc-800 pt-3">
                <h4 className="text-xs font-semibold text-amber-300 mb-2 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Participants ({detailBooking.participants.length})
                </h4>
                <div className="space-y-1">
                  {detailBooking.participants.map((p) => (
                    <div key={p.id} className="text-xs text-zinc-300 bg-zinc-900/50 px-2 py-1 rounded">
                      {p.memberName || p.guestName || 'Unknown'}
                    </div>
                  ))}
                </div>
                {isStaff && detailBooking.booking.status === 'CONFIRMED' && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={addParticipantGuestName}
                      onChange={(e) => setAddParticipantGuestName(e.target.value)}
                      placeholder="Participant name..."
                      className="text-xs flex-1"
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleAddParticipant}
                      isLoading={isPending}
                      disabled={!addParticipantGuestName}
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cancel Modal */}
      {cancelBookingId && (
        <Card className="border-rose-800/50 bg-rose-950/10">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-rose-300 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              Cancel Booking
            </CardTitle>
            <button onClick={() => { setCancelBookingId(null); setCancelReason(''); }} className="text-zinc-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1">Reason for Cancellation *</label>
              <Input
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
                className="text-xs"
              />
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelBooking}
              isLoading={isPending}
              disabled={cancelReason.length < 3}
            >
              Confirm Cancellation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Bookings Table */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-white">Court Reservations</CardTitle>
            <p className="text-xs text-zinc-400 mt-0.5">{bookings.length} bookings found</p>
          </div>
        </CardHeader>
        <CardContent>
          {bookings.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Court</th>
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Date & Time</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-zinc-200">{b.courtName}</td>
                      <td className="py-2.5 px-3 text-zinc-300">
                        {b.memberName || 'Walk-in Guest'}
                        {b.membershipNumber && (
                          <span className="block text-[10px] text-zinc-500 font-mono">{b.membershipNumber}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">{getBookingTypeBadge(b.bookingType)}</td>
                      <td className="py-2.5 px-3 text-zinc-300 font-mono text-[11px]">
                        {formatDateTime(b.startTime)}
                      </td>
                      <td className="py-2.5 px-3">{getStatusBadge(b.status)}</td>
                      <td className="py-2.5 px-3">
                        <span className="text-emerald-400 font-semibold">{formatCurrency(b.finalPrice)}</span>
                        {b.discountAmount > 0 && (
                          <span className="block text-[10px] text-zinc-500 line-through">{formatCurrency(b.basePrice)}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleViewDetails(b)}
                            className="text-zinc-400 hover:text-sky-400 transition-colors p-1"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {b.status === 'CONFIRMED' && isStaff && (
                            <button
                              onClick={() => setCancelBookingId(b.id)}
                              className="text-zinc-400 hover:text-rose-400 transition-colors p-1"
                              title="Cancel Booking"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-2 text-zinc-400 text-xs">
              <CalendarDays className="h-8 w-8 text-zinc-600 mx-auto" />
              <p>No bookings match the current filters.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

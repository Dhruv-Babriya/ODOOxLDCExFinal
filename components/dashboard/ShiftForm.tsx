'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createShiftAction } from '@/actions/staff';
import { CalendarDays, CheckCircle2, X } from 'lucide-react';

interface ShiftFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  defaultStaffId?: string;
}

export function ShiftForm({ onClose, onSuccess, defaultStaffId }: ShiftFormProps) {
  const [staffId, setStaffId] = useState(defaultStaffId || '');
  const [shiftDate, setShiftDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await createShiftAction({
      staffId,
      shiftDate,
      startTime,
      endTime,
      status: 'SCHEDULED',
      notes: notes || undefined,
    });

    setIsSubmitting(false);
    if (result.success) {
      setSuccess(true);
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to schedule shift.');
    }
  };

  if (success) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/70 mt-4">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Shift Scheduled!</h3>
          <p className="text-xs text-zinc-400">The shift has been assigned and added to the roster.</p>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/70 mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-emerald-400" />
          <CardTitle className="text-base">Schedule Shift</CardTitle>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-white" type="button">
            <X className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/50 border border-rose-800 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Staff ID *</label>
            <Input
              required
              placeholder="UUID of staff member"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Date *</label>
              <Input
                required
                type="date"
                value={shiftDate}
                onChange={(e) => setShiftDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Start Time *</label>
              <Input
                required
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">End Time *</label>
              <Input
                required
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Notes (optional)</label>
            <Input
              placeholder="Shift instructions or role specifics"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Assign Shift
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

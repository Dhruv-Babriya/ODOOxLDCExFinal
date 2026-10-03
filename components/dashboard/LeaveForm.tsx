'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { submitLeaveRequestAction } from '@/actions/staff';
import { LEAVE_TYPES } from '@/types/shared';
import { CalendarDays, CheckCircle2, X } from 'lucide-react';

interface LeaveFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  defaultStaffId?: string;
}

export function LeaveForm({ onClose, onSuccess, defaultStaffId }: LeaveFormProps) {
  const [staffId, setStaffId] = useState(defaultStaffId || '');
  const [leaveType, setLeaveType] = useState('SICK');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await submitLeaveRequestAction({
      staffId,
      leaveType: leaveType as 'SICK' | 'VACATION' | 'PERSONAL' | 'UNPAID',
      startDate,
      endDate,
      reason: reason || undefined,
    });

    setIsSubmitting(false);
    if (result.success) {
      setSuccess(true);
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to submit leave request.');
    }
  };

  if (success) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/70 mt-4">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Request Submitted!</h3>
          <p className="text-xs text-zinc-400">Your leave request is now pending approval by management.</p>
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
          <CardTitle className="text-base">Request Leave</CardTitle>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Staff ID *</label>
              <Input
                required
                placeholder="UUID of staff member"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Leave Type *</label>
              <select
                className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Start Date *</label>
              <Input
                required
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">End Date *</label>
              <Input
                required
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Reason (optional)</label>
            <textarea
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 p-3 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={2}
              placeholder="Provide a brief explanation for your request"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Submit Request
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

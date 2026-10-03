'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createStaffAction } from '@/actions/staff';
import { UserCheck, CheckCircle2, X } from 'lucide-react';

interface StaffFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

export function StaffForm({ onClose, onSuccess }: StaffFormProps) {
  const [profileId, setProfileId] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [salaryMonthly, setSalaryMonthly] = useState('');
  const [hireDate, setHireDate] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const result = await createStaffAction({
      profileId,
      employeeCode,
      department,
      position,
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) : 0,
      salaryMonthly: salaryMonthly ? parseFloat(salaryMonthly) : 0,
      hireDate,
      isActive,
    });

    setIsSubmitting(false);
    if (result.success) {
      setSuccess(true);
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to create staff record.');
    }
  };

  if (success) {
    return (
      <Card className="border-zinc-800 bg-zinc-900/70">
        <CardContent className="p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-emerald-950/70 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Staff Record Created!</h3>
          <p className="text-xs text-zinc-400">The employee has been added to the club roster.</p>
          <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-emerald-400" />
          <CardTitle className="text-base">Onboard New Staff</CardTitle>
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
              <label className="text-xs font-medium text-zinc-300">Profile ID *</label>
              <Input
                required
                placeholder="UUID from profiles"
                value={profileId}
                onChange={(e) => setProfileId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Employee Code *</label>
              <Input
                required
                placeholder="EMP-001"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Department *</label>
              <Input
                required
                placeholder="Coaching, Front Desk, etc."
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Position *</label>
              <Input
                required
                placeholder="Senior Coach"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Hourly Rate (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Monthly Salary (₹)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={salaryMonthly}
                onChange={(e) => setSalaryMonthly(e.target.value)}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Hire Date *</label>
              <Input
                required
                type="date"
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 flex items-center pt-6 gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-900/50 text-emerald-500 focus:ring-emerald-500"
              />
              <label htmlFor="isActive" className="text-xs font-medium text-zinc-300">Active Employee</label>
            </div>
          </div>

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Create Record
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { StaffForm } from './StaffForm';
import { ShiftForm } from './ShiftForm';
import { LeaveForm } from './LeaveForm';
import { Plus, CalendarDays } from 'lucide-react';

export function StaffHeaderActions() {
  const [activeForm, setActiveForm] = useState<'staff' | 'shift' | 'leave' | null>(null);

  const closeForm = () => setActiveForm(null);

  return (
    <div className="flex flex-col mb-4 space-y-4">
      {!activeForm ? (
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="outline" onClick={() => setActiveForm('leave')}>
            <CalendarDays className="w-4 h-4 mr-2 text-amber-400" />
            Request Leave
          </Button>
          <Button variant="outline" onClick={() => setActiveForm('shift')}>
            <CalendarDays className="w-4 h-4 mr-2 text-sky-400" />
            Schedule Shift
          </Button>
          <Button variant="primary" onClick={() => setActiveForm('staff')}>
            <Plus className="w-4 h-4 mr-2" />
            Onboard Staff
          </Button>
        </div>
      ) : (
        <div className="w-full max-w-2xl ml-auto">
          {activeForm === 'staff' && <StaffForm onClose={closeForm} onSuccess={closeForm} />}
          {activeForm === 'shift' && <ShiftForm onClose={closeForm} onSuccess={closeForm} />}
          {activeForm === 'leave' && <LeaveForm onClose={closeForm} onSuccess={closeForm} />}
        </div>
      )}
    </div>
  );
}

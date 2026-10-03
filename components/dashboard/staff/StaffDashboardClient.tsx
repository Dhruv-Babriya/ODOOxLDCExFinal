'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { updateLeaveStatusAction } from '@/actions/staff';
import { Users, CalendarClock, CalendarX2, Check, X, Building2 } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';

interface StaffDashboardClientProps {
  staff: any[];
  shifts: any[];
  leaves: any[];
}

export function StaffDashboardClient({ staff, shifts, leaves }: StaffDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<'staff' | 'shifts' | 'leaves'>('shifts');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const handleLeaveAction = async (leaveId: string, status: 'APPROVED' | 'REJECTED') => {
    setIsProcessing(leaveId);
    await updateLeaveStatusAction(leaveId, status);
    setIsProcessing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex border-b border-zinc-800">
        <button
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'shifts' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('shifts')}
        >
          <div className="flex items-center gap-2">
            <CalendarClock className="w-4 h-4" />
            Active Shifts
          </div>
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'leaves' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('leaves')}
        >
          <div className="flex items-center gap-2">
            <CalendarX2 className="w-4 h-4" />
            Leave Requests
          </div>
        </button>
        <button
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'staff' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('staff')}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Staff Roster
          </div>
        </button>
      </div>

      {/* SHIFTS VIEW */}
      {activeTab === 'shifts' && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base text-white">Upcoming & Active Shifts</CardTitle>
          </CardHeader>
          <CardContent>
            {shifts.length === 0 ? (
              <div className="text-zinc-500 text-sm py-4">No upcoming shifts scheduled.</div>
            ) : (
              <div className="space-y-3">
                {shifts.map((shift) => (
                  <div key={shift.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-emerald-950/50 flex items-center justify-center text-emerald-400 font-bold border border-emerald-900/50 shrink-0">
                        {shift.staff?.profile?.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {shift.staff?.profile?.full_name || 'Unknown'}
                          <Badge variant="outline">{shift.staff?.employee_code}</Badge>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
                          <CalendarClock className="w-3.5 h-3.5" />
                          {formatDate(shift.shift_date)} • {shift.start_time} - {shift.end_time}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end gap-2">
                      <Badge variant={shift.status === 'SCHEDULED' ? 'default' : 'warning'}>
                        {shift.status}
                      </Badge>
                      {shift.notes && <span className="text-[11px] text-zinc-500 italic max-w-[200px] truncate">{shift.notes}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* LEAVES VIEW */}
      {activeTab === 'leaves' && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base text-white">Leave Requests & Approvals</CardTitle>
          </CardHeader>
          <CardContent>
            {leaves.length === 0 ? (
              <div className="text-zinc-500 text-sm py-4">No leave requests found.</div>
            ) : (
              <div className="space-y-3">
                {leaves.map((leave) => (
                  <div key={leave.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 gap-4">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-full bg-amber-950/50 flex items-center justify-center text-amber-400 font-bold border border-amber-900/50 shrink-0">
                        {leave.staff?.profile?.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          {leave.staff?.profile?.full_name || 'Unknown'}
                          <Badge variant="outline">{leave.leave_type}</Badge>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {formatDate(leave.start_date)} to {formatDate(leave.end_date)}
                        </div>
                        {leave.reason && <div className="text-[11px] text-zinc-500 mt-1">Reason: {leave.reason}</div>}
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:items-end gap-2 shrink-0">
                      <Badge variant={
                        leave.status === 'APPROVED' ? 'default' : 
                        leave.status === 'REJECTED' ? 'destructive' : 
                        'warning'
                      }>
                        {leave.status}
                      </Badge>
                      
                      {leave.status === 'PENDING' && (
                        <div className="flex gap-2 mt-2">
                          <Button 
                            variant="primary" 
                            size="sm" 
                            className="h-7 text-[11px]"
                            disabled={isProcessing === leave.id}
                            onClick={() => handleLeaveAction(leave.id, 'APPROVED')}
                          >
                            <Check className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-7 text-[11px]"
                            disabled={isProcessing === leave.id}
                            onClick={() => handleLeaveAction(leave.id, 'REJECTED')}
                          >
                            <X className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* STAFF ROSTER VIEW */}
      {activeTab === 'staff' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {staff.length === 0 ? (
            <div className="text-zinc-500 text-sm py-4 col-span-full">No staff members registered.</div>
          ) : (
            staff.map((member) => (
              <Card key={member.id} className="border-zinc-800 bg-zinc-900/40">
                <CardContent className="p-4 flex gap-4">
                  <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold shrink-0">
                    {member.profile?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white truncate">{member.profile?.full_name}</h4>
                      <Badge variant={member.is_active ? 'default' : 'outline'} className="text-[10px]">
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="text-xs text-emerald-400 mt-0.5">{member.position}</div>
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> {member.department}
                      </span>
                      <span>CODE: {member.employee_code}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}

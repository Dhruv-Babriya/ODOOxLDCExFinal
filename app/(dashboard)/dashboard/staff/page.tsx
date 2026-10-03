import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { StaffHeaderActions } from '@/components/dashboard/StaffHeaderActions';
import { UserCheck } from 'lucide-react';

export default async function StaffDashboardPage() {
  const supabase = await createClient();
  const { data: staffMembers } = await supabase
    .from('staff')
    .select(`
      id,
      employee_code,
      department,
      position,
      hire_date,
      is_active,
      profiles (full_name, email, phone)
    `)
    .limit(10);

  return (
    <DashboardModuleShell
      title="Staff Management, Shifts & Leave"
      subtitle="Employee roster, work schedules, department assignments, and leave approvals."
      developerOwner="Developer 4"
      developerRole="Finance, Staff & Analytics Specialist"
      tables={['staff', 'staff_shifts', 'leave_requests']}
      contracts={['Staff', 'Department', 'ShiftStatus', 'LeaveStatus', 'staffShiftSchema']}
      phase1Roadmap={[
        'Staff profile directory and employee code onboarding wizard',
        'Shift calendar scheduler with conflict checks and weekly roster view',
        'Employee leave request submission and manager approval / rejection workflow',
      ]}
    >
      <StaffHeaderActions />
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-white">Employee Roster</CardTitle>
            <p className="text-xs text-zinc-400">Queried from public.staff join public.profiles</p>
          </div>
          <Badge variant="outline">{staffMembers?.length || 0} Staff Members</Badge>
        </CardHeader>
        <CardContent>
          {staffMembers && staffMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Emp Code</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Position</th>
                    <th className="py-2.5 px-3">Hire Date</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {staffMembers.map((s) => (
                    <tr key={s.id} className="hover:bg-zinc-800/30">
                      <td className="py-2 px-3 text-emerald-400">{s.employee_code}</td>
                      <td className="py-2 px-3 font-sans text-zinc-200">{s.profiles?.full_name}</td>
                      <td className="py-2 px-3 font-sans text-zinc-300">{s.department}</td>
                      <td className="py-2 px-3 font-sans text-zinc-400">{s.position}</td>
                      <td className="py-2 px-3 text-zinc-400">{formatDate(s.hire_date)}</td>
                      <td className="py-2 px-3">
                        <Badge variant={s.is_active ? 'success' : 'destructive'} className="text-[10px]">
                          {s.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-zinc-400 text-xs">
              <UserCheck className="h-8 w-8 text-zinc-600 mx-auto" />
              <p>No staff records created yet. Developer 4 will build the staff management portal in Phase 1.</p>
              <p className="font-mono text-zinc-500">Schema and Zod validations ready in lib/validations/staff.ts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModuleShell>
  );
}

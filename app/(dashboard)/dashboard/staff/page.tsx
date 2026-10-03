import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { StaffHeaderActions } from '@/components/dashboard/StaffHeaderActions';
import { getStaffDashboardDataAction } from '@/actions/staff';
import { StaffDashboardClient } from '@/components/dashboard/staff/StaffDashboardClient';

export default async function StaffDashboardPage() {
  const result = await getStaffDashboardDataAction();
  
  if (!result.success || !result.data) {
    return (
      <DashboardModuleShell
        title="Staff Management, Shifts & Leave"
        subtitle="Manage club personnel, schedules, and leave requests."
        developerOwner="Developer 4"
        developerRole="Finance, Staff & Analytics Specialist"
      >
        <div className="p-6 bg-rose-950/20 border border-rose-900 text-rose-400 rounded-lg">
          Failed to load staff data: {result.error || 'Unknown error'}
        </div>
      </DashboardModuleShell>
    );
  }

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
      <StaffDashboardClient 
        staff={result.data.staff || []}
        shifts={result.data.shifts || []}
        leaves={result.data.leaves || []}
      />
    </DashboardModuleShell>
  );
}

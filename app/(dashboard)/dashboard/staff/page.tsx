import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { StaffHeaderActions } from '@/components/dashboard/StaffHeaderActions';
import { getStaffDashboardDataAction } from '@/actions/staff';
import { StaffDashboardClient } from '@/components/dashboard/staff/StaffDashboardClient';

export default async function StaffDashboardPage() {
  const result = await getStaffDashboardDataAction();
  
  if (!result.success) {
    return (
      <DashboardModuleShell
        title="Staff Management, Shifts & Leave"
        subtitle="Manage club personnel, schedules, and leave requests."
      >
        <div className="p-6 bg-rose-950/20 border border-rose-900 text-rose-400 rounded-lg">
          Failed to load staff data: {'error' in result ? String(result.error) : 'Unknown error'}
        </div>
      </DashboardModuleShell>
    );
  }

  return (
    <DashboardModuleShell
      title="Staff Management, Shifts & Leave"
      subtitle="Employee roster, work schedules, department assignments, and leave approvals."
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

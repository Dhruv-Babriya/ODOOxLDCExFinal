import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { getOwnerDashboardMetricsAction } from '@/actions/reports';
import { ReportsDashboardClient } from '@/components/dashboard/reports/ReportsDashboardClient';

export default async function ExecutiveReportsDashboardPage() {
  const result = await getOwnerDashboardMetricsAction();
  
  if (!result.success) {
    return (
      <DashboardModuleShell
        title="Executive Operational & Revenue Analytics"
        subtitle="Consolidated revenue analytics from courts, pro shop, and cafeteria."
      >
        <div className="p-6 bg-rose-950/20 border border-rose-900 text-rose-400 rounded-lg">
          Failed to load dashboard metrics: {!result.success ? result.error : 'Unknown error'}
        </div>
      </DashboardModuleShell>
    );
  }

  return (
    <DashboardModuleShell
      title="Executive Operational & Revenue Analytics"
      subtitle="Consolidated revenue analytics across day, week, and month."
    >
      <ReportsDashboardClient metrics={result.data} />
    </DashboardModuleShell>
  );
}

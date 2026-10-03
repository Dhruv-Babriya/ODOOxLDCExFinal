import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { getOwnerDashboardMetricsAction } from '@/actions/reports';
import { ReportsDashboardClient } from '@/components/dashboard/reports/ReportsDashboardClient';

export default async function ExecutiveReportsDashboardPage() {
  const result = await getOwnerDashboardMetricsAction();
  
  if (!result.success) {
    return (
      <DashboardModuleShell
        title="Executive Operational & Revenue Analytics"
        subtitle="Owner consolidation of money received from courts, pro shop, and cafeteria."
        developerOwner="Developer 4"
        developerRole="Finance, Staff & Analytics Specialist"
        tables={['payments', 'invoices', 'court_bookings', 'shop_orders', 'bar_orders']}
        contracts={['RevenueReport', 'MonthlyRevenueAggregate', 'DepartmentBreakdown']}
        phase1Roadmap={[
          'Recharts interactive trend lines',
          'Revenue distribution donut chart',
          'Daily operational summary',
        ]}
      >
        <div className="p-6 bg-rose-950/20 border border-rose-900 text-rose-400 rounded-lg">
          Failed to load dashboard metrics: {result.error || 'Unknown error'}
        </div>
      </DashboardModuleShell>
    );
  }

  return (
    <DashboardModuleShell
      title="Executive Operational & Revenue Analytics"
      subtitle="Owner consolidation of money received from courts, pro shop, and cafeteria across day/week/month."
      developerOwner="Developer 4"
      developerRole="Finance, Staff & Analytics Specialist"
      tables={['payments', 'invoices', 'court_bookings', 'shop_orders', 'bar_orders']}
      contracts={['RevenueReport', 'MonthlyRevenueAggregate', 'DepartmentBreakdown']}
      phase1Roadmap={[
        'Recharts interactive trend lines',
        'Revenue distribution donut chart',
        'Daily operational summary',
      ]}
    >
      <ReportsDashboardClient metrics={result.data} />
    </DashboardModuleShell>
  );
}

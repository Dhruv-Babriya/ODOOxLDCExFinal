import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { getManagersAction } from '@/actions/managers';
import { ManagersManagerView } from '@/components/dashboard/managers/ManagersManagerView';
import { DashboardModuleShell } from '@/components/dashboard/module-shell';

interface ManagersPageProps {
  searchParams: Promise<{
    page?: string;
    search?: string;
  }>;
}

export default async function ManagersDashboardPage({ searchParams }: ManagersPageProps) {
  const user = await getCurrentUser();

  // Strictly restricted to Club Owner
  if (!user || user.role !== 'OWNER') {
    redirect('/dashboard/unauthorized');
  }

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10) || 1;
  const search = params.search || '';

  const result = await getManagersAction({
    page,
    pageSize: 5,
    search,
  });

  if (!result.success) {
    return (
      <DashboardModuleShell
        title="Club Managers Governance"
        subtitle="Manage club general managers and operational leadership."
      >
        <div className="p-6 bg-rose-950/20 border border-rose-900 text-rose-400 rounded-lg">
          Failed to load managers: {result.error}
        </div>
      </DashboardModuleShell>
    );
  }

  return (
    <DashboardModuleShell
      title="Club Managers Governance"
      subtitle="Provision, update, and manage General Managers who operate the club."
    >
      <ManagersManagerView
        initialManagers={result.data.managers}
        total={result.data.total}
        initialPage={result.data.page}
        pageSize={result.data.pageSize}
        totalPages={result.data.totalPages}
      />
    </DashboardModuleShell>
  );
}

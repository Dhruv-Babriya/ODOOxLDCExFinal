import { DashboardSidebar } from '@/components/dashboard/sidebar';
import { DashboardHeader } from '@/components/dashboard/header';
import { getCurrentUser } from '@/lib/auth/session';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen flex bg-zinc-950 text-zinc-100">
      <DashboardSidebar userRole={user?.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <DashboardHeader
          userEmail={user?.email || 'admin@thechampionsclub.com'}
          userRole={user?.role || 'OWNER'}
        />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

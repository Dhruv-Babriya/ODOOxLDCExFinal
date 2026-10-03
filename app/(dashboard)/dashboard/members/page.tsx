import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getMembersAction } from '@/actions/members';
import { getMembershipPlansAction } from '@/actions/plans';
import { MemberManagementView } from '@/components/dashboard/MemberManagementView';

export default async function MembersDashboardPage() {
  const user = await requireAuth();

  // Exclusively accessible to Owner portal and General Manager
  if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
    redirect('/dashboard/unauthorized');
  }

  const [membersRes, plansRes] = await Promise.all([
    getMembersAction(),
    getMembershipPlansAction(),
  ]);

  const members = membersRes.success ? membersRes.data : [];
  const plans = plansRes.success ? plansRes.data : [];

  return <MemberManagementView initialMembers={members} plans={plans} isOwner={user.role === 'OWNER'} />;
}

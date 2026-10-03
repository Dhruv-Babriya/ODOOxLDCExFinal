import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getMembersAction } from '@/actions/members';
import { getMembershipPlansAction } from '@/actions/plans';
import { MemberManagementView } from '@/components/dashboard/MemberManagementView';

export default async function MembersDashboardPage() {
  const user = await requireAuth();

  // Accessible to Owner, Admin (General Manager), and Front Desk Staff
  if (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'FRONT_DESK') {
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

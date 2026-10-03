import { getMembersAction } from '@/actions/members';
import { getMembershipPlansAction } from '@/actions/plans';
import { MemberManagementView } from '@/components/dashboard/MemberManagementView';

export default async function MembersDashboardPage() {
  const [membersRes, plansRes] = await Promise.all([
    getMembersAction(),
    getMembershipPlansAction(),
  ]);

  const members = membersRes.success ? membersRes.data : [];
  const plans = plansRes.success ? plansRes.data : [];

  return <MemberManagementView initialMembers={members} plans={plans} />;
}

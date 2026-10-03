import { getMembershipPlansAction } from '@/actions/plans';
import { MembershipPlansView } from '@/components/dashboard/MembershipPlansView';
import { getCurrentUser } from '@/lib/auth/session';

export default async function MembershipPlansDashboardPage() {
  const [plansResult, user] = await Promise.all([
    getMembershipPlansAction(),
    getCurrentUser(),
  ]);
  const plans = plansResult.success ? plansResult.data : [];

  return <MembershipPlansView initialPlans={plans} userRole={user?.role} />;
}

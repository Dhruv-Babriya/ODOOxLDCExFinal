import { getMembershipPlansAction } from '@/actions/plans';
import { MembershipPlansView } from '@/components/dashboard/MembershipPlansView';

export default async function MembershipPlansDashboardPage() {
  const result = await getMembershipPlansAction();
  const plans = result.success ? result.data : [];

  return <MembershipPlansView initialPlans={plans} />;
}

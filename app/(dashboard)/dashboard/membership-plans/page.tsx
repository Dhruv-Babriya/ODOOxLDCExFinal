import { redirect } from 'next/navigation';
import { getMembershipPlansAction } from '@/actions/plans';
import { MembershipPlansView } from '@/components/dashboard/MembershipPlansView';
import { getCurrentUser } from '@/lib/auth/session';

export default async function MembershipPlansDashboardPage() {
  const user = await getCurrentUser();

  // Plans & Pricing administration is restricted to Club Owner and Managers
  if (user?.role === 'MEMBER') {
    redirect('/dashboard/portal');
  }

  const plansResult = await getMembershipPlansAction();
  const plans = plansResult.success ? plansResult.data : [];

  return <MembershipPlansView initialPlans={plans} userRole={user?.role} />;
}

import { requireAuth } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { getMembershipPlansAction } from '@/actions/plans';
import { MemberRegistrationView } from '@/components/dashboard/MemberRegistrationView';

export default async function NewMemberRegistrationPage() {
  const user = await requireAuth();

  // Accessible to Owner, Admin (General Manager), and Front Desk Staff
  if (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'FRONT_DESK') {
    redirect('/dashboard/unauthorized');
  }

  const plansRes = await getMembershipPlansAction();
  const plans = plansRes.success ? plansRes.data : [];

  return <MemberRegistrationView plans={plans} userRole={user.role} />;
}

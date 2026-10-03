import { getMemberDetailsAction } from '@/actions/members';
import { getMembershipPlansAction } from '@/actions/plans';
import { MemberDetailView } from '@/components/dashboard/MemberDetailView';
import { notFound, redirect } from 'next/navigation';

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === 'new') {
    redirect('/dashboard/members/new');
  }
  const [detailsRes, plansRes] = await Promise.all([
    getMemberDetailsAction(id),
    getMembershipPlansAction(),
  ]);

  if (!detailsRes.success || !detailsRes.data) {
    notFound();
  }

  const plans = plansRes.success ? plansRes.data : [];

  return (
    <MemberDetailView
      member={detailsRes.data.member}
      history={detailsRes.data.history}
      plans={plans}
    />
  );
}

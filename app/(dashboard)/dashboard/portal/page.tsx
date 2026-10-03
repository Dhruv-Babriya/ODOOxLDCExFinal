import Link from 'next/link';
import { requireAuth } from '@/lib/auth/session';
import { getMemberPortalDataAction } from '@/actions/members';
import { getMembershipPlansAction } from '@/actions/plans';
import { MemberPortalView } from '@/components/dashboard/MemberPortalView';
import { MemberSelfEnrollView } from '@/components/dashboard/MemberSelfEnrollView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Users, LayoutDashboard } from 'lucide-react';

export const metadata = {
  title: 'Plans & Pricing | The Champions Club',
  description: 'Member self-service portal, perks, bookings, orders, and payment history.',
};

export default async function MemberPortalPage() {
  const user = await requireAuth();
  const portalRes = await getMemberPortalDataAction();

  if (!portalRes.success || !portalRes.data) {
    // If user is staff or admin without a member profile, render staff helper card
    if (user.role !== 'MEMBER') {
      return (
        <div className="max-w-2xl mx-auto py-12 px-4">
          <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl text-center">
            <CardHeader className="pb-4">
              <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                <ShieldAlert className="h-6 w-6 text-amber-400" />
              </div>
              <CardTitle className="text-xl text-white">Staff Account Notice</CardTitle>
              <CardDescription className="text-xs text-zinc-400 max-w-md mx-auto">
                You are logged in with staff/admin role ({user.role}) and do not currently have a personal athletic membership profile linked.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-400 text-left space-y-2">
                <p className="font-semibold text-zinc-300">Staff Navigation Options:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Manage registered club members via the Member Directory.</li>
                  <li>View club analytics, bookings, and financial reports from the Operations Dashboard.</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/dashboard/members">
                  <Button variant="primary" className="gap-2 text-xs w-full sm:w-auto">
                    <Users className="h-3.5 w-3.5" />
                    <span>Member Directory</span>
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="secondary" className="gap-2 text-xs w-full sm:w-auto">
                    <LayoutDashboard className="h-3.5 w-3.5" />
                    <span>Operations Dashboard</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // For regular members, present the Self-Service Onboarding flow
    const plansRes = await getMembershipPlansAction();
    const plans = plansRes.success && plansRes.data ? plansRes.data.filter((p) => p.is_active) : [];

    return (
      <MemberSelfEnrollView
        plans={plans}
        userEmail={user.email}
      />
    );
  }

  return <MemberPortalView data={portalRes.data} />;
}

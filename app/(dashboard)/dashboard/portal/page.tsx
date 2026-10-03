import Link from 'next/link';
import { getMemberPortalDataAction } from '@/actions/members';
import { MemberPortalView } from '@/components/dashboard/MemberPortalView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, UserPlus, Home } from 'lucide-react';

export const metadata = {
  title: 'Member Portal | The Champions Club',
  description: 'Member self-service portal, perks, bookings, orders, and payment history.',
};

export default async function MemberPortalPage() {
  const portalRes = await getMemberPortalDataAction();

  if (!portalRes.success || !portalRes.data) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl text-center">
          <CardHeader className="pb-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
              <ShieldAlert className="h-6 w-6 text-amber-400" />
            </div>
            <CardTitle className="text-xl text-white">No Linked Membership Profile</CardTitle>
            <CardDescription className="text-xs text-zinc-400 max-w-md mx-auto">
              Your logged-in account does not currently have an active athletic membership record linked in The Champions Club database.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4 text-xs text-zinc-400 text-left space-y-2">
              <p className="font-semibold text-zinc-300">Why am I seeing this?</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>If you are a <strong>Club Staff or Administrator</strong>, manage member accounts directly via the Member Directory.</li>
                <li>If you are a <strong>New Member</strong>, please visit the front desk or request staff to enroll your membership.</li>
                <li>If your account was registered under a different email, please contact administration to link your profile.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/dashboard/members">
                <Button variant="primary" className="gap-2 text-xs w-full sm:w-auto">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Member Directory</span>
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="secondary" className="gap-2 text-xs w-full sm:w-auto">
                  <Home className="h-3.5 w-3.5" />
                  <span>Return to Dashboard</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <MemberPortalView data={portalRes.data} />;
}

import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { Users } from 'lucide-react';

export default async function MembersDashboardPage() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from('members')
    .select(`
      id,
      membership_number,
      status,
      start_date,
      end_date,
      profiles (
        full_name,
        email,
        phone
      ),
      membership_plans (
        name,
        tier
      )
    `)
    .limit(10);

  return (
    <DashboardModuleShell
      title="Member Management"
      subtitle="Staff member lookup, registration, membership tier assignments, and lifecycle tracking."
      developerOwner="Developer 1"
      developerRole="Core Platform & Membership Specialist"
      tables={['members', 'membership_plans', 'membership_history', 'profiles']}
      contracts={['Member', 'MembershipPlan', 'MembershipTier', 'memberCreateSchema']}
      phase1Roadmap={[
        'Full CRUD member registration form with automatic membership ID generator',
        'Fast searchable member lookup table for front desk staff with status filter',
        'Plan upgrade / renewal workflow with automatic membership_history log',
        'Automated expiry notification and suspension triggers',
      ]}
    >
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-white">Active Member Directory</CardTitle>
            <p className="text-xs text-zinc-400">Sample records from public.members</p>
          </div>
          <Badge variant="outline">{members?.length || 0} Members Registered</Badge>
        </CardHeader>
        <CardContent>
          {members && members.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Member ID</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3">Plan</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Valid Until</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-800/30">
                      <td className="py-2 px-3 text-emerald-400">{m.membership_number}</td>
                      <td className="py-2 px-3 font-sans text-zinc-200">{m.profiles?.full_name}</td>
                      <td className="py-2 px-3 font-sans text-zinc-300">{m.membership_plans?.name}</td>
                      <td className="py-2 px-3">
                        <Badge variant={m.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-[10px]">
                          {m.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-zinc-400">{formatDate(m.end_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-zinc-400 text-xs">
              <Users className="h-8 w-8 text-zinc-600 mx-auto" />
              <p>No members registered yet. Developer 1 will implement the member creation UI in Phase 1.</p>
              <p className="font-mono text-zinc-500">Schema and server action (createMemberAction) ready in actions/members.ts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModuleShell>
  );
}

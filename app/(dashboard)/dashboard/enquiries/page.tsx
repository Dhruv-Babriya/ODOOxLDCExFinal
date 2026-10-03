import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime } from '@/lib/utils';
import { EnquiryHeaderActions } from '@/components/dashboard/EnquiryHeaderActions';
import { MessageSquare } from 'lucide-react';

export default async function EnquiriesDashboardPage() {
  const supabase = await createClient();
  const { data: enquiries } = await supabase
    .from('enquiries')
    .select(`
      id,
      full_name,
      email,
      phone,
      interested_sport,
      requested_trial_date,
      status,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <DashboardModuleShell
      title="Enquiries, Leads & Trial Requests"
      subtitle="Visitor trial bookings from the landing page, follow-up CRM workflows, and quote dispatch."
      developerOwner="Developer 4"
      developerRole="Finance, Staff & Analytics Specialist"
      tables={['enquiries', 'quotes', 'membership_plans']}
      contracts={['Enquiry', 'Quote', 'EnquiryStatus', 'QuoteStatus', 'publicEnquirySchema']}
      phase1Roadmap={[
        'Lead status pipeline: New -> Contacted -> Trial Scheduled -> Quote Sent -> Converted',
        'Staff assignment and follow-up reminders',
        'Official quote generator with custom discount and validity window',
        'One-click conversion of accepted quotes into member records',
      ]}
    >
      <EnquiryHeaderActions />
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-white">Incoming Leads & Inquiries</CardTitle>
            <p className="text-xs text-zinc-400">Queried from public.enquiries</p>
          </div>
          <Badge variant="outline">{enquiries?.length || 0} Inquiries</Badge>
        </CardHeader>
        <CardContent>
          {enquiries && enquiries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Lead Name</th>
                    <th className="py-2.5 px-3">Email & Phone</th>
                    <th className="py-2.5 px-3">Sport Interest</th>
                    <th className="py-2.5 px-3">Trial Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {enquiries.map((e) => (
                    <tr key={e.id} className="hover:bg-zinc-800/30">
                      <td className="py-2 px-3 font-sans font-medium text-zinc-200">{e.full_name}</td>
                      <td className="py-2 px-3 text-zinc-400">
                        <div>{e.email}</div>
                        <div className="text-[10px] text-zinc-500">{e.phone}</div>
                      </td>
                      <td className="py-2 px-3 font-sans text-zinc-300">{e.interested_sport || '-'}</td>
                      <td className="py-2 px-3 text-zinc-300">{e.requested_trial_date || '-'}</td>
                      <td className="py-2 px-3">
                        <Badge variant={e.status === 'NEW' ? 'warning' : 'outline'} className="text-[10px]">
                          {e.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-zinc-500">{formatDateTime(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-zinc-400 text-xs">
              <MessageSquare className="h-8 w-8 text-zinc-600 mx-auto" />
              <p>No enquiries received yet. Try submitting a test trial enquiry from the public website.</p>
              <p className="font-mono text-zinc-500">Public insert policy enabled on public.enquiries</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModuleShell>
  );
}

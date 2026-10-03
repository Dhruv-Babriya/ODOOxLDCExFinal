import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { createClient } from '@/lib/supabase/server';
import { EnquiryHeaderActions } from '@/components/dashboard/EnquiryHeaderActions';
import { EnquiryDashboardClient } from '@/components/dashboard/enquiries/EnquiryDashboardClient';

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
      subtitle="Visitor trial bookings, follow-up CRM workflows, and quote dispatch."
    >
      <EnquiryHeaderActions />
      <EnquiryDashboardClient enquiries={enquiries || []} />
    </DashboardModuleShell>
  );
}

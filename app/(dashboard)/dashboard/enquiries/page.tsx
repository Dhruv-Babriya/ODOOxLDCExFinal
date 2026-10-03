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
      <EnquiryDashboardClient enquiries={enquiries || []} />
    </DashboardModuleShell>
  );
}

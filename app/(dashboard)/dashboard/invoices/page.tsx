import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDate } from '@/lib/utils';
import { InvoiceHeaderActions } from '@/components/dashboard/InvoiceHeaderActions';
import { Receipt } from 'lucide-react';

export default async function InvoicesDashboardPage() {
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      recipient_name,
      recipient_type,
      total_amount,
      paid_amount,
      status,
      due_date
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <DashboardModuleShell
      title="Member & Client Invoicing"
      subtitle="Corporate membership billing, line-item itemized invoices, balance dues, and payment tracking."
      developerOwner="Developer 4"
      developerRole="Finance, Staff & Analytics Specialist"
      tables={['invoices', 'invoice_items', 'payments', 'members']}
      contracts={['Invoice', 'InvoiceItem', 'InvoiceStatus', 'RecipientType', 'invoiceCreateSchema']}
      phase1Roadmap={[
        'Interactive invoice generator with dynamic line items and tax calculation',
        'Business client vs individual member invoicing options',
        'PDF invoice generation and email dispatch service',
        'Aging report for unpaid and overdue invoices',
      ]}
    >
      <InvoiceHeaderActions />
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-white">Invoice Register</CardTitle>
            <p className="text-xs text-zinc-400">Queried from public.invoices</p>
          </div>
          <Badge variant="outline">{invoices?.length || 0} Invoices</Badge>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Recipient</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Total Amount</th>
                    <th className="py-2.5 px-3">Paid Amount</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-zinc-800/30">
                      <td className="py-2 px-3 text-emerald-400">{inv.invoice_number}</td>
                      <td className="py-2 px-3 font-sans text-zinc-200">{inv.recipient_name}</td>
                      <td className="py-2 px-3 font-sans text-zinc-400">{inv.recipient_type}</td>
                      <td className="py-2 px-3 font-bold text-white">{formatCurrency(inv.total_amount)}</td>
                      <td className="py-2 px-3 text-zinc-300">{formatCurrency(inv.paid_amount)}</td>
                      <td className="py-2 px-3 text-zinc-400">{formatDate(inv.due_date)}</td>
                      <td className="py-2 px-3">
                        <Badge variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'destructive' : 'warning'} className="text-[10px]">
                          {inv.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-zinc-400 text-xs">
              <Receipt className="h-8 w-8 text-zinc-600 mx-auto" />
              <p>No invoices created yet. Developer 4 will build the invoicing workflow in Phase 1.</p>
              <p className="font-mono text-zinc-500">Schema and Zod validations ready in lib/validations/payment.ts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModuleShell>
  );
}

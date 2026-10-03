import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { PaymentHeaderActions } from '@/components/dashboard/PaymentHeaderActions';
import { CreditCard } from 'lucide-react';

export default async function PaymentsDashboardPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from('payments')
    .select(`
      id,
      payment_number,
      amount,
      payment_method,
      status,
      created_at,
      members (profiles (full_name))
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <DashboardModuleShell
      title="Payments & Revenue Collection"
      subtitle="Unified ledger for cash, card, UPI, and bank transfer receipts across courts, shop, and bar."
    >
      <PaymentHeaderActions />
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-white">Recent Payment Receipts</CardTitle>
            <p className="text-xs text-zinc-400">Consolidated transaction history and settlement receipts</p>
          </div>
          <Badge variant="outline">{payments?.length || 0} Transactions</Badge>
        </CardHeader>
        <CardContent>
          {payments && payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Receipt #</th>
                    <th className="py-2.5 px-3">Member / Customer</th>
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-zinc-800/30">
                      <td className="py-2 px-3 text-emerald-400">{p.payment_number}</td>
                      <td className="py-2 px-3 font-sans text-zinc-200">{p.members?.profiles?.full_name || 'Counter Walk-in'}</td>
                      <td className="py-2 px-3 font-sans text-zinc-300">{p.payment_method}</td>
                      <td className="py-2 px-3 font-bold text-white">{formatCurrency(p.amount)}</td>
                      <td className="py-2 px-3">
                        <Badge variant={p.status === 'COMPLETED' ? 'success' : 'default'} className="text-[10px]">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-zinc-400">{formatDateTime(p.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-zinc-400 text-xs">
              <CreditCard className="h-8 w-8 text-zinc-600 mx-auto" />
              <p>No payments recorded yet.</p>
              <p className="text-zinc-500">Payments settled via Member Portal, Front Desk POS, or Online Checkout will be listed here.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModuleShell>
  );
}

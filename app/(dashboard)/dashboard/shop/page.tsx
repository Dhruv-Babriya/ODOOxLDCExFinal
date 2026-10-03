import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { ShoppingBag } from 'lucide-react';

export default async function ShopOrdersDashboardPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from('shop_orders')
    .select(`
      id,
      order_number,
      order_channel,
      status,
      subtotal,
      discount_amount,
      total_amount,
      created_at,
      members (profiles (full_name))
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <DashboardModuleShell
      title="Pro Shop & Commerce Orders"
      subtitle="Physical counter sales and online orders drawing from the unified club inventory."
      developerOwner="Developer 3"
      developerRole="Shop & Bar Specialist"
      tables={['shop_orders', 'shop_order_items', 'products', 'inventory']}
      contracts={['ShopOrder', 'OrderStatus', 'OrderChannel', 'shopOrderCreateSchema']}
      phase1Roadmap={[
        'Fast Point-of-Sale (POS) counter interface for front desk & shop staff with barcode/SKU scanner',
        'Online checkout flow for members with automatic plan discount deduction',
        'Atomic stock decrementing via deduct_inventory stored procedure',
        'Thermal receipt / invoice PDF print integration',
      ]}
    >
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-white">Recent Shop Orders</CardTitle>
            <p className="text-xs text-zinc-400">Queried from public.shop_orders</p>
          </div>
          <Badge variant="outline">{orders?.length || 0} Orders</Badge>
        </CardHeader>
        <CardContent>
          {orders && orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Total Amount</th>
                    <th className="py-2.5 px-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-zinc-800/30">
                      <td className="py-2 px-3 text-emerald-400">{o.order_number}</td>
                      <td className="py-2 px-3 font-sans text-zinc-200">{o.members?.profiles?.full_name || 'Walk-in'}</td>
                      <td className="py-2 px-3 font-sans">
                        <Badge variant="outline" className="text-[10px]">
                          {o.order_channel}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <Badge variant={o.status === 'COMPLETED' ? 'success' : 'default'} className="text-[10px]">
                          {o.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-white font-semibold">{formatCurrency(o.total_amount)}</td>
                      <td className="py-2 px-3 text-zinc-400">{formatDateTime(o.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-10 space-y-2 text-zinc-400 text-xs">
              <ShoppingBag className="h-8 w-8 text-zinc-600 mx-auto" />
              <p>No shop orders recorded yet. Developer 3 will implement the POS terminal in Phase 1.</p>
              <p className="font-mono text-zinc-500">Atomic server action (createShopOrderAction) ready in actions/shop.ts</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardModuleShell>
  );
}

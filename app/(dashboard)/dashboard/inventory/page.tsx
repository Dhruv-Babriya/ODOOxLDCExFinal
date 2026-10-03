import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

export default async function InventoryDashboardPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from('products')
    .select(`
      id,
      sku,
      name,
      price,
      low_stock_threshold,
      product_categories (name),
      inventory (quantity_on_hand, updated_at)
    `)
    .order('name');

  return (
    <DashboardModuleShell
      title="Live Inventory & Low-Stock Alerts"
      subtitle="Single source of truth for stock quantities shared across counter point-of-sale and online orders."
      developerOwner="Developer 3"
      developerRole="Shop & Bar Specialist"
      tables={['inventory', 'inventory_transactions', 'products']}
      contracts={['Product', 'InventoryTransaction', 'inventoryAdjustmentSchema']}
      phase1Roadmap={[
        'Real-time low-stock threshold alert cards and push notifications',
        'Stock adjustment modal with reason capture (Receipt, Audit, Breakage, Return)',
        'Traceable transaction audit trail table per SKU',
      ]}
    >
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base text-white">Current Stock Levels</CardTitle>
            <p className="text-xs text-zinc-400">Queried from public.products join public.inventory</p>
          </div>
          <Badge variant="outline">{products?.length || 0} Catalog SKUs</Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">SKU</th>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Unit Price</th>
                  <th className="py-2.5 px-3">Qty on Hand</th>
                  <th className="py-2.5 px-3">Stock Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {products?.map((p) => {
                  const qty = p.inventory?.quantity_on_hand ?? 0;
                  const threshold = p.low_stock_threshold ?? 5;
                  const isLow = qty <= threshold;

                  return (
                    <tr key={p.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3 text-emerald-400">{p.sku}</td>
                      <td className="py-2.5 px-3 font-sans text-zinc-200 font-medium">{p.name}</td>
                      <td className="py-2.5 px-3 font-sans text-zinc-400">
                        {p.product_categories?.name || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300">{formatCurrency(p.price)}</td>
                      <td className="py-2.5 px-3 font-bold text-white text-sm">{qty}</td>
                      <td className="py-2.5 px-3">
                        {isLow ? (
                          <Badge variant="destructive" className="gap-1 text-[10px]">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Low Stock (≤{threshold})</span>
                          </Badge>
                        ) : (
                          <Badge variant="success" className="gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Healthy</span>
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </DashboardModuleShell>
  );
}

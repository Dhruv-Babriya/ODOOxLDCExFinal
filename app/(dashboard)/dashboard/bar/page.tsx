import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { Utensils, Users } from 'lucide-react';

export default async function BarCafeteriaDashboardPage() {
  const supabase = await createClient();
  const { data: tables } = await supabase.from('bar_tables').select('*').order('table_number');
  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .order('name');

  return (
    <DashboardModuleShell
      title="Bar & Nutrition Cafeteria"
      subtitle="Floor table seating, kitchen order tickets, member tabs, and F&B order management."
      developerOwner="Developer 3"
      developerRole="Shop & Bar Specialist"
      tables={['bar_tables', 'customer_tabs', 'bar_orders', 'bar_order_items', 'menu_items']}
      contracts={['BarTable', 'BarOrder', 'KitchenStatus', 'TabStatus', 'barOrderCreateSchema']}
      phase1Roadmap={[
        'Interactive table layout visualizer with quick status toggles (Available, Occupied, Reserved)',
        'Customer Tab opening, item charging, and one-click invoice closure',
        'Live kitchen display screen (KDS) showing pending, preparing, ready, and served orders',
        'Automatic member discount calculation (15% Gold, 10% Silver, 5% Junior)',
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Floor Tables */}
        <Card className="border-zinc-800 bg-zinc-900/50 lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-emerald-400" />
              <span>Cafeteria Tables</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {tables?.map((tbl) => (
                <div key={tbl.id} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-center space-y-1">
                  <div className="text-sm font-bold text-white">{tbl.table_number}</div>
                  <div className="text-[10px] text-zinc-400">{tbl.capacity} seats</div>
                  <Badge variant={tbl.status === 'AVAILABLE' ? 'success' : 'warning'} className="text-[9px]">
                    {tbl.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Menu Catalog */}
        <Card className="border-zinc-800 bg-zinc-900/50 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white flex items-center gap-2">
              <Utensils className="h-4 w-4 text-amber-400" />
              <span>Active Nutrition & Bar Menu</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3">Item Name</th>
                    <th className="py-2 px-3">Category</th>
                    <th className="py-2 px-3">Price</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {menuItems?.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/30">
                      <td className="py-2 px-3 font-sans font-medium text-zinc-200">{item.name}</td>
                      <td className="py-2 px-3 font-sans text-zinc-400">{item.menu_categories?.name}</td>
                      <td className="py-2 px-3 font-semibold text-white">{formatCurrency(item.price)}</td>
                      <td className="py-2 px-3">
                        <Badge variant={item.is_available ? 'success' : 'outline'} className="text-[10px]">
                          {item.is_available ? 'Available' : 'Unavailable'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardModuleShell>
  );
}

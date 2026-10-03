import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, DollarSign, ShoppingBag, Coffee, Activity } from 'lucide-react';

export default async function ExecutiveReportsDashboardPage() {
  const supabase = await createClient();

  // Aggregate financial metrics across courts, shop, and bar
  const { data: payments } = await supabase.from('payments').select('amount, payment_method, status');
  const totalRevenue = payments?.reduce((acc, p) => acc + (p.status === 'COMPLETED' ? Number(p.amount) : 0), 0) || 0;

  const { count: totalMembers } = await supabase.from('members').select('id', { count: 'exact', head: true });
  const { count: totalBookings } = await supabase.from('court_bookings').select('id', { count: 'exact', head: true });
  const { count: totalShopOrders } = await supabase.from('shop_orders').select('id', { count: 'exact', head: true });
  const { count: totalBarOrders } = await supabase.from('bar_orders').select('id', { count: 'exact', head: true });

  return (
    <DashboardModuleShell
      title="Executive Operational & Revenue Analytics"
      subtitle="Owner consolidation of money received from courts, pro shop, and cafeteria across day/week/month."
      developerOwner="Developer 4"
      developerRole="Finance, Staff & Analytics Specialist"
      tables={['payments', 'invoices', 'court_bookings', 'shop_orders', 'bar_orders']}
      contracts={['RevenueReport', 'MonthlyRevenueAggregate', 'DepartmentBreakdown']}
      phase1Roadmap={[
        'Recharts interactive trend lines (Today, Week-to-Date, Month-to-Date revenue comparisons)',
        'Revenue distribution donut chart: Courts vs Pro Shop vs Cafeteria vs Memberships',
        'Daily operational summary: Court occupancy rate, peak playing hours, F&B average tab value',
        'Exportable monthly financial P&L statements (CSV / Excel / PDF)',
      ]}
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Consolidated Revenue</span>
                <DollarSign className="h-4 w-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</div>
              <p className="text-[11px] text-zinc-500 mt-1">From all payment receipts</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Active Members</span>
                <TrendingUp className="h-4 w-4 text-sky-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalMembers || 0}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Enrolled across Gold, Silver & Junior</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Court Sessions</span>
                <Activity className="h-4 w-4 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalBookings || 0}</div>
              <p className="text-[11px] text-zinc-500 mt-1">Tennis & cricket reservations</p>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Commercial Orders</span>
                <ShoppingBag className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{(totalShopOrders || 0) + (totalBarOrders || 0)}</div>
              <p className="text-[11px] text-zinc-500 mt-1">
                {totalShopOrders || 0} Shop / {totalBarOrders || 0} Bar
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown Card */}
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <span>Multi-Stream Revenue Architecture</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Cross-cutting aggregation contract established in Phase 0 for Phase 1 Recharts charts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <Activity className="h-4 w-4 text-sky-400" />
                  <span>Court Bookings Revenue</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  Aggregates standard bookings, coaching fees, and social play fees minus tier discounts.
                </p>
                <div className="text-emerald-400 font-mono text-sm pt-2">Tracked via public.court_bookings</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <ShoppingBag className="h-4 w-4 text-amber-400" />
                  <span>Pro Shop Revenue</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  Aggregates counter POS cash/card receipts and online member gear purchases.
                </p>
                <div className="text-emerald-400 font-mono text-sm pt-2">Tracked via public.shop_orders</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-1">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <Coffee className="h-4 w-4 text-purple-400" />
                  <span>Bar & Nutrition Revenue</span>
                </div>
                <p className="text-zinc-400 text-[11px]">
                  Aggregates direct table orders and settled member customer tabs.
                </p>
                <div className="text-emerald-400 font-mono text-sm pt-2">Tracked via public.bar_orders</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardModuleShell>
  );
}

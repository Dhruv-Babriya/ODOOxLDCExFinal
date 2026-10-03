'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { DollarSign, Activity, ShoppingBag, Coffee, AlertCircle, Clock, Users, Users2, BarChart3 } from 'lucide-react';

interface ReportsDashboardClientProps {
  metrics: OwnerDashboardMetrics;
}

const COLORS = ['#34d399', '#38bdf8', '#fbbf24', '#c084fc']; // emerald, sky, amber, purple

export function ReportsDashboardClient({ metrics }: ReportsDashboardClientProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('month');

  const activeData = metrics[timeRange];

  const pieData = [
    { name: 'Memberships', value: activeData.memberships },
    { name: 'Courts', value: activeData.courts },
    { name: 'Shop', value: activeData.shop },
    { name: 'Bar', value: activeData.bar },
  ].filter(d => d.value > 0);

  // We could also show a trend line if we had daily data, but for now we show a breakdown.
  const barData = [
    {
      name: 'Revenue',
      Memberships: activeData.memberships,
      Courts: activeData.courts,
      Shop: activeData.shop,
      Bar: activeData.bar,
    }
  ];

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Revenue ({timeRange})</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(activeData.total)}</div>
            <p className="text-[11px] text-zinc-500 mt-1">From all payment receipts</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Invoices</span>
              <Clock className="h-4 w-4 text-rose-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(metrics.outstandingInvoices)}</div>
            <p className="text-[11px] text-zinc-500 mt-1">Unpaid or partially paid</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Pending Enquiries</span>
              <Users className="h-4 w-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.pendingEnquiries}</div>
            <p className="text-[11px] text-zinc-500 mt-1">Leads awaiting contact</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Members</span>
              <Users2 className="h-4 w-4 text-sky-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{metrics.activeMembers}</div>
            <p className="text-[11px] text-zinc-500 mt-1">Total active membership plans</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">Revenue Analysis</h3>
        <div className="flex items-center gap-2">
          <Button variant={timeRange === 'today' ? 'primary' : 'outline'} size="sm" onClick={() => setTimeRange('today')}>Today</Button>
          <Button variant={timeRange === 'week' ? 'primary' : 'outline'} size="sm" onClick={() => setTimeRange('week')}>This Week</Button>
          <Button variant={timeRange === 'month' ? 'primary' : 'outline'} size="sm" onClick={() => setTimeRange('month')}>This Month</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm">Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: unknown) => formatCurrency(Number(value || 0))}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                No revenue recorded for this period.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-sm">Consolidated Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" stroke="#a1a1aa" tickFormatter={(value: any) => `₹${value}`} />
                  <YAxis type="category" dataKey="name" stroke="#a1a1aa" hide />
                  <Tooltip 
                    formatter={(value: unknown) => formatCurrency(Number(value || 0))}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="Memberships" stackId="a" fill={COLORS[0]} />
                  <Bar dataKey="Courts" stackId="a" fill={COLORS[1]} />
                  <Bar dataKey="Shop" stackId="a" fill={COLORS[2]} />
                  <Bar dataKey="Bar" stackId="a" fill={COLORS[3]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-zinc-500">
                No revenue recorded for this period.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Operational Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-rose-900/50 bg-rose-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-400" />
              <CardTitle className="text-sm text-rose-200">Action Required</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
             {metrics.lowStockItems > 0 && (
               <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-lg border border-rose-900/50">
                 <span className="text-zinc-300 text-sm">Low Stock Items</span>
                 <Badge variant="destructive">{metrics.lowStockItems}</Badge>
               </div>
             )}
             {metrics.openTabsBalance > 0 && (
               <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-lg border border-rose-900/50">
                 <span className="text-zinc-300 text-sm">Unsettled Tabs (F&B)</span>
                 <span className="text-rose-400 font-bold">{formatCurrency(metrics.openTabsBalance)}</span>
               </div>
             )}
             {metrics.outstandingInvoices > 0 && (
               <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-lg border border-rose-900/50">
                 <span className="text-zinc-300 text-sm">Outstanding Invoices</span>
                 <span className="text-rose-400 font-bold">{formatCurrency(metrics.outstandingInvoices)}</span>
               </div>
             )}
             {metrics.pendingEnquiries > 0 && (
               <div className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-lg border border-rose-900/50">
                 <span className="text-zinc-300 text-sm">Pending Lead Enquiries</span>
                 <Badge variant="warning">{metrics.pendingEnquiries}</Badge>
               </div>
             )}
             {metrics.lowStockItems === 0 && metrics.openTabsBalance === 0 && metrics.outstandingInvoices === 0 && metrics.pendingEnquiries === 0 && (
               <div className="text-sm text-emerald-400 p-3">All operational items are resolved.</div>
             )}
          </CardContent>
        </Card>
        
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader>
            <CardTitle className="text-base text-white flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-400" />
              <span>Multi-Stream Revenue Architecture</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Cross-cutting aggregation contract established in Phase 0
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <Activity className="h-4 w-4 text-sky-400" />
                  <span>Court Bookings Revenue</span>
                </div>
                <div className="text-emerald-400 font-mono text-xs text-right">public.court_bookings</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <ShoppingBag className="h-4 w-4 text-amber-400" />
                  <span>Pro Shop Revenue</span>
                </div>
                <div className="text-emerald-400 font-mono text-xs text-right">public.shop_orders</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <Coffee className="h-4 w-4 text-purple-400" />
                  <span>Bar & Nutrition Revenue</span>
                </div>
                <div className="text-emerald-400 font-mono text-xs text-right">public.bar_orders</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

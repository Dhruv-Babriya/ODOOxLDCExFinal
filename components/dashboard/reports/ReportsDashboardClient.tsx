'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  DollarSign,
  Activity,
  ShoppingBag,
  Coffee,
  AlertCircle,
  Clock,
  Users,
  Users2,
  BarChart3,
  Receipt,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import {
  getPaginatedRevenueLedgerAction,
  type OwnerDashboardMetrics,
  type RevenueTransactionItem,
} from '@/actions/reports';

interface ReportsDashboardClientProps {
  metrics: OwnerDashboardMetrics;
}

const COLORS = ['#34d399', '#38bdf8', '#fbbf24', '#c084fc']; // emerald, sky, amber, purple

export function ReportsDashboardClient({ metrics }: ReportsDashboardClientProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('month');

  // Paginated Revenue Ledger State
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerChannel, setLedgerChannel] = useState<'ALL' | 'MEMBERSHIPS' | 'COURTS' | 'SHOP' | 'BAR'>('ALL');
  const [ledgerItems, setLedgerItems] = useState<RevenueTransactionItem[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerTotalPages, setLedgerTotalPages] = useState(1);
  const [isLoadingLedger, setIsLoadingLedger] = useState(false);

  const fetchLedger = useCallback(async (page: number, channel: string) => {
    setIsLoadingLedger(true);
    const result = await getPaginatedRevenueLedgerAction({
      page,
      pageSize: 10,
      channel,
    });
    if (result.success && result.data) {
      setLedgerItems(result.data.items);
      setLedgerTotal(result.data.total);
      setLedgerTotalPages(result.data.totalPages);
    }
    setIsLoadingLedger(false);
  }, []);

  useEffect(() => {
    fetchLedger(ledgerPage, ledgerChannel);
  }, [fetchLedger, ledgerPage, ledgerChannel]);

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
                  <XAxis type="number" stroke="#a1a1aa" tickFormatter={(value: string | number) => `₹${value}`} />
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
              Automated revenue tracking across all active club operations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <Activity className="h-4 w-4 text-sky-400" />
                  <span>Court Bookings Revenue</span>
                </div>
                <div className="text-emerald-400 font-mono text-xs text-right">Automated Settlement</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <ShoppingBag className="h-4 w-4 text-amber-400" />
                  <span>Pro Shop Revenue</span>
                </div>
                <div className="text-emerald-400 font-mono text-xs text-right">POS / Online Orders</div>
              </div>
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-300 font-semibold">
                  <Coffee className="h-4 w-4 text-purple-400" />
                  <span>Bar & Nutrition Revenue</span>
                </div>
                <div className="text-emerald-400 font-mono text-xs text-right">Table & Member Tabs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PAGINATED REVENUE TRANSACTION LEDGER */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-base text-white">Live Revenue Transaction Ledger</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400 mt-1">
              Paginated ledger of all verified payment receipts across club operations
            </CardDescription>
          </div>

          {/* Channel Filters */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
            {(['ALL', 'MEMBERSHIPS', 'COURTS', 'SHOP', 'BAR'] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => {
                  setLedgerChannel(ch);
                  setLedgerPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                  ledgerChannel === ch
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {ch === 'ALL' ? 'All Channels' : ch}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3">Receipt / ID</th>
                  <th className="py-2.5 px-3">Revenue Stream</th>
                  <th className="py-2.5 px-3">Payment Method</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-900/30">
                {isLoadingLedger ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      Loading revenue transactions...
                    </td>
                  </tr>
                ) : ledgerItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-zinc-500">
                      No revenue transactions found for this period/filter.
                    </td>
                  </tr>
                ) : (
                  ledgerItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-850/40 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-zinc-300">
                        {item.reference || item.id.substring(0, 8)}
                      </td>
                      <td className="py-2.5 px-3">
                        <Badge
                          variant="outline"
                          className={
                            item.channel === 'COURTS'
                              ? 'text-sky-400 border-sky-500/30 bg-sky-950/30 text-[10px]'
                              : item.channel === 'SHOP'
                              ? 'text-amber-400 border-amber-500/30 bg-amber-950/30 text-[10px]'
                              : item.channel === 'BAR'
                              ? 'text-orange-400 border-orange-500/30 bg-orange-950/30 text-[10px]'
                              : 'text-emerald-400 border-emerald-500/30 bg-emerald-950/30 text-[10px]'
                          }
                        >
                          {item.channel}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300 font-mono text-[11px]">
                        {item.paymentMethod}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-400 text-[11px]">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white font-mono">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Badge variant="success" className="text-[10px]">
                          {item.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-zinc-400">
            <div>
              Showing {ledgerTotal > 0 ? (ledgerPage - 1) * 10 + 1 : 0} to{' '}
              {Math.min(ledgerPage * 10, ledgerTotal)} of {ledgerTotal} transactions
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs border-zinc-850"
                disabled={ledgerPage <= 1 || isLoadingLedger}
                onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Previous
              </Button>

              <span className="text-zinc-300 font-medium px-2">
                Page {ledgerPage} of {ledgerTotalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 text-xs border-zinc-850"
                disabled={ledgerPage >= ledgerTotalPages || isLoadingLedger}
                onClick={() => setLedgerPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

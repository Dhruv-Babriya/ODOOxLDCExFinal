import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  CalendarDays,
  ShoppingBag,
  BarChart3,
  ShieldCheck,
  ArrowRight,
  Database,
  Lock,
} from 'lucide-react';

const MODULE_OVERVIEWS = [
  {
    title: 'Core Platform & Memberships',
    dev: 'Developer 1',
    role: 'Core Platform & Membership Lead',
    href: '/dashboard/members',
    icon: Users,
    color: 'text-emerald-400',
    description: 'Member records, profiles, Gold/Silver/Junior plans, status tracking & expiry.',
    tables: ['profiles', 'members', 'membership_plans', 'membership_history'],
  },
  {
    title: 'Courts & Bookings',
    dev: 'Developer 2',
    role: 'Courts & Booking Lead',
    href: '/dashboard/bookings',
    icon: CalendarDays,
    color: 'text-sky-400',
    description: 'Courts schedule, GIST exclusion concurrency, 1hr sessions, Friday social play.',
    tables: ['courts', 'court_bookings', 'booking_participants'],
  },
  {
    title: 'Shop, Inventory & Bar',
    dev: 'Developer 3',
    role: 'Commerce & F&B Lead',
    href: '/dashboard/shop',
    icon: ShoppingBag,
    color: 'text-amber-400',
    description: 'Shared inventory, point-of-sale, online orders, bar tables, menu & kitchen tabs.',
    tables: ['products', 'inventory', 'shop_orders', 'bar_tables', 'menu_items', 'customer_tabs'],
  },
  {
    title: 'Finance, Staff & Reporting',
    dev: 'Developer 4',
    role: 'Finance, Staff & Analytics Lead',
    href: '/dashboard/reports',
    icon: BarChart3,
    color: 'text-purple-400',
    description: 'Consolidated payments, client invoices, staff shifts, leave requests & owner analytics.',
    tables: ['payments', 'invoices', 'staff', 'staff_shifts', 'enquiries', 'quotes'],
  },
];

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">The Champions Club Dashboard</h1>
            <Badge variant="success">Phase 0 Ready</Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            System architectural foundation, PostgreSQL database with RLS, and shared contracts ready for 4-developer parallel feature implementation.
          </p>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <Database className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">Database Status</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-white">28 Normalized Tables</div>
            <p className="text-xs text-zinc-400">Active PostgreSQL 17 schema with RLS on every table</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <Lock className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">Concurrency Guard</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-white">GIST Exclusion Active</div>
            <p className="text-xs text-zinc-400">Mathematical guarantee against double-booking courts</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">Security & RBAC</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-white">6 Granular Roles</div>
            <p className="text-xs text-zinc-400">Owner, Admin, Front Desk, Shop, Bar, Member</p>
          </CardContent>
        </Card>
      </div>

      {/* Module Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Four-Developer Module Scaffolds</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {MODULE_OVERVIEWS.map((mod) => {
            const Icon = mod.icon;
            return (
              <Card key={mod.title} className="border-zinc-800 bg-zinc-900/50 flex flex-col justify-between hover:border-zinc-700 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/80">
                        <Icon className={`h-5 w-5 ${mod.color}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base text-white">{mod.title}</CardTitle>
                        <span className="text-[11px] font-mono text-emerald-400">{mod.dev}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {mod.role.split(' ')[0]}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-zinc-400 pt-2">
                    {mod.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="text-[11px] font-mono text-zinc-500 flex flex-wrap gap-1.5">
                    {mod.tables.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded bg-zinc-950/80 border border-zinc-800 text-zinc-400">
                        {t}
                      </span>
                    ))}
                  </div>
                </CardContent>

                <div className="p-6 pt-0 border-t border-zinc-800/80">
                  <Link href={mod.href} className="w-full">
                    <Button variant="ghost" size="sm" className="w-full justify-between hover:text-emerald-400">
                      <span>Open Module Scaffold</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

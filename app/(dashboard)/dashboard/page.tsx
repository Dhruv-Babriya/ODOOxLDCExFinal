
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  CalendarDays,
  ShoppingBag,
  Coffee,
  Receipt,
  BarChart3,
  ArrowRight,
  PlusCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

const CLUB_MODULES = [
  {
    title: 'Membership & Profiles',
    tag: 'Members & Roster',
    href: '/dashboard/members',
    icon: Users,
    color: 'text-emerald-400',
    description: 'Member directory, account status, Gold & Silver tier plans, renewals, and history.',
    actions: [
      { label: 'Register New Member', href: '/dashboard/members/new' },
      { label: 'Manage Plans & Tiers', href: '/dashboard/membership-plans' },
    ],
  },
  {
    title: 'Courts & Reservations',
    tag: 'Athletic Facilities',
    href: '/dashboard/bookings',
    icon: CalendarDays,
    color: 'text-sky-400',
    description: 'Clay & hard tennis courts, cricket nets, real-time schedule, and session bookings.',
    actions: [
      { label: 'View Court Grid', href: '/dashboard/bookings' },
      { label: 'Court Availability', href: '/courts' },
    ],
  },
  {
    title: 'Pro Shop & Inventory',
    tag: 'Retail & Gear',
    href: '/dashboard/shop',
    icon: ShoppingBag,
    color: 'text-amber-400',
    description: 'Point-of-sale checkout, sports equipment catalog, stock tracking, and orders.',
    actions: [
      { label: 'Open POS Register', href: '/dashboard/shop' },
      { label: 'Inventory Stock', href: '/dashboard/inventory' },
    ],
  },
  {
    title: 'Bar & Nutrition Cafe',
    tag: 'Hospitality & Dining',
    href: '/dashboard/bar',
    icon: Coffee,
    color: 'text-orange-400',
    description: 'Table management, kitchen ordering, member tabs, and artisan nutrition menu.',
    actions: [
      { label: 'Active Tabs & Orders', href: '/dashboard/bar' },
    ],
  },
  {
    title: 'Billing & Invoicing',
    tag: 'Financial Operations',
    href: '/dashboard/invoices',
    icon: Receipt,
    color: 'text-teal-400',
    description: 'Consolidated member invoicing, booking fees, pro shop balances, and receipts.',
    actions: [
      { label: 'Invoice Register', href: '/dashboard/invoices' },
      { label: 'Payment History', href: '/dashboard/payments' },
    ],
  },
  {
    title: 'Analytics & Staff Roster',
    tag: 'Executive Overview',
    href: '/dashboard/reports',
    icon: BarChart3,
    color: 'text-purple-400',
    description: 'Club revenue analytics, court utilization rates, and staff duty rosters.',
    actions: [
      { label: 'Executive Reports', href: '/dashboard/reports' },
      { label: 'Staff Management', href: '/dashboard/staff' },
    ],
  },
];

export default async function DashboardOverviewPage() {
  const user = await getCurrentUser();
  if (user?.role === 'MEMBER') {
    redirect('/dashboard/portal');
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              The Champions Club Management
            </h1>
            <Badge variant="success" className="text-xs">
              {user?.role || 'STAFF'}
            </Badge>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Welcome back, <span className="text-zinc-200 font-semibold">{user?.fullName || 'Club Administrator'}</span>. All facility modules and operational departments are active.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/members/new">
            <Button variant="primary" size="sm" className="gap-2 shadow-lg shadow-emerald-950/40">
              <PlusCircle className="h-4 w-4" />
              <span>Register Member</span>
            </Button>
          </Link>
          <Link href="/dashboard/bookings">
            <Button variant="outline" size="sm" className="gap-2 border-zinc-700">
              <CalendarDays className="h-4 w-4" />
              <span>Book Court</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">Facility Status</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-white">All Courts Operational</div>
            <p className="text-xs text-zinc-400">Floodlit clay & hard courts ready for booking</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <Clock className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">Daily Hours</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-white">06:00 AM – 10:00 PM</div>
            <p className="text-xs text-zinc-400">Courts, Pro Shop, and Nutrition Cafe open</p>
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/40">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <Receipt className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold uppercase tracking-wider">Commerce System</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold text-white">Unified POS & Member Tabs</div>
            <p className="text-xs text-zinc-400">Consolidated checkout with member discount rules</p>
          </CardContent>
        </Card>
      </div>

      {/* Club Operations Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Facility & Operations Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CLUB_MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Card
                key={mod.title}
                className="border-zinc-800 bg-zinc-900/50 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-lg"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-zinc-800/80 border border-zinc-700/80">
                        <Icon className={`h-5 w-5 ${mod.color}`} />
                      </div>
                      <CardTitle className="text-base text-white">{mod.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-400">
                      {mod.tag}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-zinc-400 pt-2 leading-relaxed">
                    {mod.description}
                  </CardDescription>
                </CardHeader>

                <div className="p-6 pt-0 space-y-3 border-t border-zinc-800/80 mt-auto">
                  <div className="flex flex-wrap gap-2 pt-3">
                    {mod.actions.map((act) => (
                      <Link
                        key={act.label}
                        href={act.href}
                        className="text-xs text-zinc-300 hover:text-emerald-400 underline-offset-4 hover:underline"
                      >
                        {act.label}
                      </Link>
                    ))}
                  </div>

                  <Link href={mod.href} className="block pt-2">
                    <Button variant="ghost" size="sm" className="w-full justify-between hover:text-emerald-400 text-xs">
                      <span>Enter Module</span>
                      <ArrowRight className="h-3.5 w-3.5" />
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

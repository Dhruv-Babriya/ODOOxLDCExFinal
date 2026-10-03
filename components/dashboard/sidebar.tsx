'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Shield,
  Activity,
  CalendarDays,
  ShoppingBag,
  Package,
  Coffee,
  UserCheck,
  CreditCard,
  Receipt,
  MessageSquare,
  BarChart3,
  Trophy,
  User,
  Sparkles,
} from 'lucide-react';

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  devOwner: string;
}

const SIDEBAR_SECTIONS: { title: string; items: SidebarItem[] }[] = [
  {
    title: 'Core Platform',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, devOwner: 'Dev 1/4' },
      { href: '/dashboard/portal', label: 'Member Portal', icon: Sparkles, devOwner: 'Dev 1' },
      { href: '/dashboard/members', label: 'Members', icon: Users, devOwner: 'Dev 1' },
      { href: '/dashboard/membership-plans', label: 'Plans & Pricing', icon: Shield, devOwner: 'Dev 1' },
      { href: '/dashboard/profile', label: 'User Profile', icon: User, devOwner: 'Dev 1' },
    ],
  },
  {
    title: 'Courts & Activities',
    items: [
      { href: '/dashboard/courts', label: 'Courts', icon: Activity, devOwner: 'Dev 2' },
      { href: '/dashboard/bookings', label: 'Bookings & Slots', icon: CalendarDays, devOwner: 'Dev 2' },
    ],
  },
  {
    title: 'Commerce & F&B',
    items: [
      { href: '/dashboard/shop', label: 'Pro Shop', icon: ShoppingBag, devOwner: 'Dev 3' },
      { href: '/dashboard/inventory', label: 'Inventory', icon: Package, devOwner: 'Dev 3' },
      { href: '/dashboard/bar', label: 'Bar & Cafeteria', icon: Coffee, devOwner: 'Dev 3' },
    ],
  },
  {
    title: 'Finance & Operations',
    items: [
      { href: '/dashboard/staff', label: 'Staff & Shifts', icon: UserCheck, devOwner: 'Dev 4' },
      { href: '/dashboard/payments', label: 'Payments', icon: CreditCard, devOwner: 'Dev 4' },
      { href: '/dashboard/invoices', label: 'Invoices', icon: Receipt, devOwner: 'Dev 4' },
      { href: '/dashboard/enquiries', label: 'Enquiries & CRM', icon: MessageSquare, devOwner: 'Dev 4' },
      { href: '/dashboard/reports', label: 'Executive Analytics', icon: BarChart3, devOwner: 'Dev 4' },
    ],
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
      <div className="h-16 flex items-center px-6 border-b border-zinc-800/80 gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-md shadow-emerald-900/40">
          <Trophy className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-bold text-white tracking-tight block">CHAMPIONS CLUB</span>
          <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider block -mt-0.5">Management Portal</span>
        </div>
      </div>

      <div className="flex-1 py-4 px-3 space-y-6">
        {SIDEBAR_SECTIONS.map((section) => (
          <div key={section.title} className="space-y-1">
            <h4 className="px-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              {section.title}
            </h4>
            <div className="space-y-0.5 pt-1">
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors group',
                      isActive
                        ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={cn('h-4 w-4', isActive ? 'text-emerald-400' : 'text-zinc-400 group-hover:text-zinc-200')} />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {item.devOwner}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
        <span>Phase 0 Foundation</span>
        <span className="text-emerald-400 font-mono">v0.1.0-READY</span>
      </div>
    </aside>
  );
}

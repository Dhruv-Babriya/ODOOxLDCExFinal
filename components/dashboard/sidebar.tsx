'use client';

import { useEffect } from 'react';
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
  X,
} from 'lucide-react';

interface SidebarItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SIDEBAR_SECTIONS: { title: string; items: SidebarItem[] }[] = [
  {
    title: 'Core Platform',
    items: [
      { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
      { href: '/dashboard/portal', label: 'Member Portal', icon: Sparkles },
      { href: '/dashboard/members', label: 'Members', icon: Users },
      { href: '/dashboard/membership-plans', label: 'Plans & Pricing', icon: Shield },
      { href: '/dashboard/profile', label: 'User Profile', icon: User },
    ],
  },
  {
    title: 'Courts & Activities',
    items: [
      { href: '/dashboard/courts', label: 'Courts', icon: Activity },
      { href: '/dashboard/bookings', label: 'Bookings & Slots', icon: CalendarDays },
    ],
  },
  {
    title: 'Commerce & F&B',
    items: [
      { href: '/dashboard/shop', label: 'Pro Shop', icon: ShoppingBag },
      { href: '/dashboard/inventory', label: 'Inventory', icon: Package },
      { href: '/dashboard/bar', label: 'Bar & Cafeteria', icon: Coffee },
    ],
  },
  {
    title: 'Finance & Operations',
    items: [
      { href: '/dashboard/staff', label: 'Staff & Shifts', icon: UserCheck },
      { href: '/dashboard/payments', label: 'Payments', icon: CreditCard },
      { href: '/dashboard/invoices', label: 'Invoices', icon: Receipt },
      { href: '/dashboard/enquiries', label: 'Enquiries & CRM', icon: MessageSquare },
      { href: '/dashboard/reports', label: 'Executive Analytics', icon: BarChart3 },
    ],
  },
];

const MEMBER_SIDEBAR_SECTIONS: { title: string; items: SidebarItem[] }[] = [
  {
    title: 'Member Experience',
    items: [
      { href: '/dashboard/portal', label: 'Plans & Pricing', icon: Shield },
      { href: '/dashboard/profile', label: 'My Profile', icon: User },
    ],
  },
  {
    title: 'Courts & Activities',
    items: [
      { href: '/dashboard/bookings', label: 'Bookings & Slots', icon: CalendarDays },
      { href: '/dashboard/courts', label: 'Court Directory', icon: Activity },
    ],
  },
  {
    title: 'Commerce & Dining',
    items: [
      { href: '/dashboard/shop', label: 'Pro Shop', icon: ShoppingBag },
      { href: '/dashboard/bar', label: 'Bar & Cafeteria', icon: Coffee },
    ],
  },
];

const OWNER_SIDEBAR_SECTIONS: { title: string; items: SidebarItem[] }[] = [
  {
    title: 'Executive Governance',
    items: [
      { href: '/dashboard', label: 'Executive Overview', icon: LayoutDashboard },
      { href: '/dashboard/reports', label: 'Revenue & Analytics', icon: BarChart3 },
      { href: '/dashboard/membership-plans', label: 'Plans & Pricing', icon: Shield },
      { href: '/dashboard/managers', label: 'Club Managers', icon: UserCheck },
      { href: '/dashboard/profile', label: 'Owner Profile', icon: User },
    ],
  },
];

export function DashboardSidebar({ userRole }: { userRole?: string }) {
  const pathname = usePathname();
  const sections =
    userRole === 'OWNER'
      ? OWNER_SIDEBAR_SECTIONS
      : userRole === 'MEMBER'
      ? MEMBER_SIDEBAR_SECTIONS
      : SIDEBAR_SECTIONS;

  return (
    <aside className="hidden md:flex w-64 border-r border-zinc-800 bg-zinc-950 flex-col shrink-0 h-screen sticky top-0 overflow-y-auto">
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
        {sections.map((section) => (
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
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t border-zinc-800 text-[11px] text-zinc-400 flex items-center justify-between">
        <span>Phase 4 Product</span>
        <span className="text-emerald-400 font-mono">v1.0.0-PROD</span>
      </div>
    </aside>
  );
}

export function MobileSidebar({
  userRole,
  isOpen,
  onClose,
}: {
  userRole?: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const sections = userRole === 'MEMBER' ? MEMBER_SIDEBAR_SECTIONS : SIDEBAR_SECTIONS;

  // Handle escape key to close mobile drawer
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation Menu">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-zinc-950 border-r border-zinc-800 flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
        <div className="h-16 flex items-center justify-between px-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-md shadow-emerald-900/40">
              <Trophy className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-tight block">CHAMPIONS CLUB</span>
              <span className="text-[9px] uppercase font-semibold text-emerald-400 tracking-wider block">
                {userRole === 'MEMBER' ? 'Member Portal' : 'Club Management'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 py-4 px-3 space-y-5 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              <h4 className="px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
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
                      onClick={onClose}
                      className={cn(
                        'flex items-center justify-between rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20'
                          : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn('h-4 w-4', isActive ? 'text-emerald-400' : 'text-zinc-400')} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3.5 border-t border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between">
          <span>The Champions Club</span>
          <span className="text-emerald-400 font-mono text-[10px]">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}

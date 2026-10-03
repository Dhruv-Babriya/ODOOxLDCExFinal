'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Trophy, User } from 'lucide-react';

const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/memberships', label: 'Memberships' },
  { href: '/courts', label: 'Courts & Slots' },
  { href: '/shop', label: 'Pro Shop' },
  { href: '/trial', label: 'Book a Trial' },
  { href: '/contact', label: 'Contact' },
];

export function PublicNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 shadow-md shadow-emerald-900/30 group-hover:scale-105 transition-transform">
            <Trophy className="h-5 w-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-tight block">THE CHAMPIONS CLUB</span>
            <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-widest block -mt-1">SPORTS & ATHLETICS</span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'text-emerald-400 bg-emerald-950/40'
                    : 'text-zinc-300 hover:text-white hover:bg-zinc-900'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-900 transition-colors"
          >
            <User className="h-4 w-4" />
            <span>Sign In</span>
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 transition-colors"
          >
            Club Portal
          </Link>
        </div>
      </div>
    </header>
  );
}

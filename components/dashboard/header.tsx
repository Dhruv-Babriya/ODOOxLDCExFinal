'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NotificationBell } from '@/components/dashboard/NotificationBell';
import { MobileSidebar } from '@/components/dashboard/sidebar';
import { signOutAction } from '@/actions/auth';
import { ExternalLink, LogOut, User, Menu } from 'lucide-react';

export function DashboardHeader({
  userEmail = 'admin@thechampionsclub.com',
  userRole = 'OWNER',
}: {
  userEmail?: string;
  userRole?: string;
}) {
  const router = useRouter();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const handleSignOut = async () => {
    await signOutAction();
    router.push('/login');
  };

  return (
    <>
      <header className="h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setIsMobileNavOpen(true)}
            className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Open mobile menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            href="/"
            target="_blank"
            className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
          >
            <span>Public Site</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <span className="hidden sm:inline text-zinc-700">|</span>
          <Badge variant="success" className="text-[10px] hidden xs:inline-flex">
            Online
          </Badge>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationBell />

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-2.5 pr-2 border-r border-zinc-800 hover:opacity-80 transition-opacity"
            aria-label={`View profile for ${userEmail}`}
          >
            <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-emerald-400 shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div className="text-left hidden sm:block max-w-[140px] md:max-w-[200px]">
              <div className="text-xs font-medium text-white truncate">{userEmail}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-zinc-500">Role:</span>
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 font-mono">
                  {userRole}
                </Badge>
              </div>
            </div>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="text-zinc-400 hover:text-rose-400 gap-1.5 px-2 sm:px-3"
            aria-label="Sign out of account"
          >
            <LogOut className="h-4 w-4" />
            <span className="text-xs hidden md:inline">Sign Out</span>
          </Button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileSidebar
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
        userRole={userRole}
      />
    </>
  );
}

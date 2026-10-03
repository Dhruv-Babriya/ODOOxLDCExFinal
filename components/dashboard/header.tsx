'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { signOutAction } from '@/actions/auth';
import { ExternalLink, LogOut, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function DashboardHeader({
  userEmail = 'admin@thechampionsclub.com',
  userRole = 'OWNER',
}: {
  userEmail?: string;
  userRole?: string;
}) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutAction();
    router.push('/login');
  };

  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <Link
          href="/"
          target="_blank"
          className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <span>View Public Site</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
        <span className="text-zinc-700">|</span>
        <Badge variant="success">System Online</Badge>
      </div>

      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/profile"
          className="flex items-center gap-2.5 pr-2 border-r border-zinc-800 hover:opacity-80 transition-opacity"
        >
          <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-emerald-400">
            <User className="h-4 w-4" />
          </div>
          <div className="text-left">
            <div className="text-xs font-medium text-white">{userEmail}</div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-zinc-400">Role:</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                {userRole}
              </Badge>
            </div>
          </div>
        </Link>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="text-zinc-400 hover:text-rose-400 gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span className="text-xs">Sign Out</span>
        </Button>
      </div>
    </header>
  );
}

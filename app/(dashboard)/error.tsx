'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, RefreshCw, Home } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary Caught]:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-md w-full border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-md text-center p-6">
        <CardHeader className="pb-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl font-bold text-white tracking-tight">
            Dashboard System Error
          </CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            A temporary issue prevented this dashboard view from rendering.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 text-left font-mono">
            {error.message || 'An unexpected error occurred.'}
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => reset()}
              className="gap-2 text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Retry</span>
            </Button>
            <Link href="/dashboard/portal">
              <Button variant="outline" size="sm" className="gap-2 text-xs border-zinc-700">
                <Home className="h-3.5 w-3.5" />
                <span>Member Portal</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

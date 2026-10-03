import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-[70vh] p-4">
      <Card className="max-w-md w-full border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-md text-center">
        <CardHeader className="pb-2">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 mb-2">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <CardTitle className="text-xl text-white">Access Restricted</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            You do not have the required operational permissions or role to access this resource.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 text-left space-y-1">
            <p className="font-semibold text-zinc-300">Security Notice:</p>
            <p>
              The Champions Club platform enforces strict server-side and database-level Row Level Security (RLS).
              If you believe you should have access to this section, please contact your Club Administrator or Owner.
            </p>
          </div>

          <div className="flex gap-3 justify-center pt-2">
            <Link href="/dashboard">
              <Button variant="outline" size="sm" className="gap-2">
                <Home className="h-4 w-4" />
                <span>Dashboard Home</span>
              </Button>
            </Link>
            <Link href="/dashboard/profile">
              <Button variant="primary" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>View Profile</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

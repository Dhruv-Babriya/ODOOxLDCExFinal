'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signInAction } from '@/actions/auth';
import { LogIn, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'Club Owner', email: 'owner@thechampionsclub.com', desc: 'Full Club Authority' },
  { role: 'General Manager', email: 'manager@thechampionsclub.com', desc: 'Operations & Membership Plans' },
  { role: 'Operations Staff', email: 'staff@thechampionsclub.com', desc: 'Front Desk, Pro Shop & Cafe' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate redirectTo against open-redirect phishing
  const getSafeRedirect = (userRole?: string): string => {
    const rawRedirect = searchParams.get('redirectTo');
    if (
      rawRedirect &&
      rawRedirect.startsWith('/') &&
      !rawRedirect.startsWith('//') &&
      !rawRedirect.includes(':') &&
      !rawRedirect.includes('\\')
    ) {
      return rawRedirect;
    }
    // Default destination: Member users land on their self-service portal, staff land on dashboard overview
    return userRole === 'MEMBER' ? '/dashboard/portal' : '/dashboard';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signInAction({ email, password });

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    const destination = getSafeRedirect(result.data?.role);
    router.push(destination);
    router.refresh();
  };

  const handleDemoFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="space-y-4">
      <Card className="border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl text-white font-bold tracking-tight">Sign In to Your Account</CardTitle>
          <CardDescription className="text-xs text-zinc-400">
            Enter your credentials to access the Champions Club portal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-start gap-2.5"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span className="flex-1">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-zinc-300">
                Email Address <span className="text-rose-400">*</span>
              </label>
              <Input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@thechampionsclub.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="login-password" className="text-xs font-medium text-zinc-300">
                  Password <span className="text-rose-400">*</span>
                </label>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 pr-10 focus-visible:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-200 transition-colors p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full gap-2 font-semibold shadow-md shadow-emerald-950/50"
              isLoading={isLoading}
              aria-busy={isLoading}
            >
              <LogIn className="h-4 w-4" />
              <span>Sign In</span>
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
          <span>Need a new member account?</span>
          <Link
            href="/register"
            className="ml-1.5 text-emerald-400 hover:text-emerald-300 font-medium underline-offset-4 hover:underline"
          >
            Create Account
          </Link>
        </CardFooter>
      </Card>

      {/* Quick Demo Accounts Helper */}
      <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-950/70 shadow-lg text-xs space-y-2.5">
        <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Quick Demo Access (1-Click Fill)</span>
        </div>
        <p className="text-[11px] text-zinc-400">
          Click any role below to prefill demo credentials (password: <code className="text-emerald-400 font-mono">Password123!</code>):
        </p>
        <div className="grid grid-cols-2 gap-2 pt-1">
          {DEMO_ACCOUNTS.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => handleDemoFill(d.email)}
              className="p-2 text-left rounded-lg bg-zinc-900/80 hover:bg-zinc-800/80 border border-zinc-800 hover:border-emerald-500/40 transition-all text-[11px] group focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            >
              <span className="font-semibold text-white block group-hover:text-emerald-400 transition-colors">
                {d.role}
              </span>
              <span className="text-zinc-500 text-[10px] block truncate">{d.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-zinc-800 bg-zinc-900/70 p-6 text-center text-xs text-zinc-400">
          Loading sign in...
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signInAction } from '@/actions/auth';
import { LogIn, Eye, EyeOff, AlertCircle } from 'lucide-react';


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

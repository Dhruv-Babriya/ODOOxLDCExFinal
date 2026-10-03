'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signInAction } from '@/actions/auth';
import { LogIn } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    <Card className="border-zinc-800 bg-zinc-900/70 shadow-xl backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-xl text-white">Sign In to Your Account</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Enter your credentials to access the club management portal
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Email Address</label>
            <Input
              type="email"
              placeholder="name@thechampionsclub.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-medium text-zinc-300">Password</label>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" className="w-full gap-2" isLoading={isLoading}>
            <LogIn className="h-4 w-4" />
            <span>Sign In</span>
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
        <span>Need an account?</span>
        <Link href="/register" className="ml-1.5 text-emerald-400 hover:text-emerald-300 font-medium">
          Create Member Account
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="border-zinc-800 bg-zinc-900/70 p-6 text-center text-xs text-zinc-400">
        Loading sign in...
      </Card>
    }>
      <LoginForm />
    </Suspense>
  );
}

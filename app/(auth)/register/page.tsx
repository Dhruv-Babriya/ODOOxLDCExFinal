'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signUpAction } from '@/actions/auth';
import { UserPlus, Eye, EyeOff, CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMsg(null);

    const result = await signUpAction({
      fullName,
      email,
      phone,
      password,
    });

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setSuccessMsg(result.message || 'Account created successfully! Redirecting to sign in...');
    setTimeout(() => {
      router.push('/login');
    }, 1500);
  };

  const isPasswordValid = password.length >= 6;

  return (
    <Card className="border-zinc-800 bg-zinc-900/80 shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <CardTitle className="text-xl text-white font-bold tracking-tight">Member Registration</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-semibold text-emerald-400 border-emerald-500/30 bg-emerald-950/40">
            Members Only
          </Badge>
        </div>
        <CardDescription className="text-xs text-zinc-400">
          Join The Champions Club as a member to book courts, enroll in coaching, and access member privileges.
        </CardDescription>

        <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <span>
            <strong className="text-zinc-200">New Member Portal:</strong> Self-registration strictly provisions club member accounts. Club staff, coaches, and administrators are provisioned directly by Manager accounts.
          </span>
        </div>
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

          {successMsg && (
            <div
              role="alert"
              aria-live="polite"
              className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 flex items-start gap-2.5"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <span className="flex-1">{successMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="register-name" className="text-xs font-medium text-zinc-300">
              Full Name <span className="text-rose-400">*</span>
            </label>
            <Input
              id="register-name"
              name="name"
              required
              autoComplete="name"
              placeholder="e.g. Dhruv Babriya"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="register-email" className="text-xs font-medium text-zinc-300">
              Email Address <span className="text-rose-400">*</span>
            </label>
            <Input
              id="register-email"
              name="email"
              required
              type="email"
              autoComplete="email"
              placeholder="dhruv@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="register-phone" className="text-xs font-medium text-zinc-300">
                Phone Number
              </label>
              <span className="text-[10px] text-zinc-500">Optional</span>
            </div>
            <Input
              id="register-phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="bg-zinc-950/60 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label htmlFor="register-password" className="text-xs font-medium text-zinc-300">
                Password <span className="text-rose-400">*</span>
              </label>
              <span className={`text-[10px] ${password && !isPasswordValid ? 'text-rose-400' : 'text-zinc-500'}`}>
                Min. 6 characters
              </span>
            </div>
            <div className="relative">
              <Input
                id="register-password"
                name="password"
                required
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
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
            <UserPlus className="h-4 w-4" />
            <span>Register as Member</span>
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col items-center gap-2 border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
        <div className="flex items-center">
          <span>Already have an account?</span>
          <Link
            href="/login"
            className="ml-1.5 text-emerald-400 hover:text-emerald-300 font-medium underline-offset-4 hover:underline"
          >
            Sign In
          </Link>
        </div>
        <p className="text-[11px] text-zinc-500 text-center">
          Club Staff, Coaches & Bartenders: Sign in with your manager-provisioned account.
        </p>
      </CardFooter>
    </Card>
  );
}

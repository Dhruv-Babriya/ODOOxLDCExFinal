'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { signUpAction } from '@/actions/auth';
import type { AppRole } from '@/types/shared';
import { UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<AppRole>('MEMBER');
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
      role,
    });

    if (!result.success) {
      setError(result.error);
      setIsLoading(false);
      return;
    }

    setSuccessMsg(result.message || 'Account created successfully! Please sign in.');
    setTimeout(() => {
      router.push('/login');
    }, 1500);
  };

  return (
    <Card className="border-zinc-800 bg-zinc-900/70 shadow-xl backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-xl text-white">Register Account</CardTitle>
        <CardDescription className="text-xs text-zinc-400">
          Create an athletic member or staff profile on The Champions Club platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300">
              {successMsg}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Full Name *</label>
            <Input
              required
              placeholder="e.g. Dhruv Babriya"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Email Address *</label>
            <Input
              required
              type="email"
              placeholder="dhruv@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Phone Number</label>
            <Input
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Account Role (Development Testing)</label>
            <select
              className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={role}
              onChange={(e) => setRole(e.target.value as AppRole)}
            >
              <option value="MEMBER">Club Member</option>
              <option value="FRONT_DESK">Front Desk Staff</option>
              <option value="SHOP_STAFF">Shop Staff</option>
              <option value="BAR_STAFF">Bar / Cafeteria Staff</option>
              <option value="ADMIN">Administrator</option>
              <option value="OWNER">Club Owner</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-300">Password (min 6 characters) *</label>
            <Input
              required
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button type="submit" variant="primary" className="w-full gap-2" isLoading={isLoading}>
            <UserPlus className="h-4 w-4" />
            <span>Create Account</span>
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center border-t border-zinc-800/80 pt-4 text-xs text-zinc-400">
        <span>Already have an account?</span>
        <Link href="/login" className="ml-1.5 text-emerald-400 hover:text-emerald-300 font-medium">
          Sign In
        </Link>
      </CardFooter>
    </Card>
  );
}

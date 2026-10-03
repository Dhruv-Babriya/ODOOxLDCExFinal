'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateProfileAction, type UserProfileWithMembership } from '@/actions/profile';
import { formatDate, formatCurrency } from '@/lib/utils';
import { User, Phone, Mail, Shield, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

export function UserProfileView({ initialData }: { initialData: UserProfileWithMembership }) {
  const [fullName, setFullName] = useState(initialData.fullName || '');
  const [phone, setPhone] = useState(initialData.phone || '');
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const result = await updateProfileAction({
      fullName,
      phone,
    });

    setIsLoading(false);

    if (!result.success) {
      setErrorMsg(result.error);
      return;
    }

    setSuccessMsg(result.message || 'Profile updated successfully.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  const member = initialData.member;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-white tracking-tight">User Profile & Account</h1>
        <p className="text-xs text-zinc-400">
          Manage your personal details, role access, and view your sports club membership status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg text-center p-6">
            <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40 mb-4 border-2 border-emerald-400/30">
              <User className="h-10 w-10" />
            </div>
            <h3 className="text-lg font-bold text-white">{fullName}</h3>
            <p className="text-xs text-zinc-400">{initialData.email}</p>

            <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">System Role</span>
                <Badge variant="outline" className="font-semibold text-emerald-400 border-emerald-500/30">
                  {initialData.role}
                </Badge>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500">Account Status</span>
                <Badge variant={initialData.isActive ? 'success' : 'destructive'} className="text-[10px]">
                  {initialData.isActive ? 'Active' : 'Suspended'}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        {/* Edit Details */}
        <div className="md:col-span-2 space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-base text-white">Personal Information</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Update your contact information visible to club administration.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-4">
                {successMsg && (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Email Address (Read-only)</label>
                  <div className="relative">
                    <Input disabled value={initialData.email} className="bg-zinc-950/40 text-zinc-400 pl-9" />
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Full Name *</label>
                  <div className="relative">
                    <Input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9"
                    />
                    <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">Phone Number</label>
                  <div className="relative">
                    <Input
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9"
                    />
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Save Profile Changes</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Member Card if enrolled */}
          {member && (
            <Card className="border-emerald-800/40 bg-gradient-to-br from-zinc-900 to-emerald-950/20 shadow-lg">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                        Active Club Membership
                      </span>
                    </div>
                    <CardTitle className="text-lg text-white mt-1">
                      {member.membership_plans?.name || 'Club Member'}
                    </CardTitle>
                  </div>
                  <Badge
                    variant={
                      member.membership_plans?.tier === 'GOLD'
                        ? 'gold'
                        : member.membership_plans?.tier === 'SILVER'
                        ? 'silver'
                        : 'outline'
                    }
                  >
                    {member.membership_plans?.tier} TIER
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono">Member ID</span>
                    <span className="font-mono font-bold text-white text-sm">{member.membership_number}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono">Status</span>
                    <Badge variant={member.status === 'ACTIVE' ? 'success' : 'destructive'} className="mt-0.5">
                      {member.status}
                    </Badge>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono">Valid Until</span>
                    <span className="font-semibold text-zinc-200">{formatDate(member.end_date)}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-zinc-950/50 border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[10px] uppercase font-mono">Plan Fee</span>
                    <span className="font-semibold text-emerald-400">
                      {formatCurrency(member.membership_plans?.price || 0)}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
                  <h4 className="text-xs font-semibold text-zinc-300 mb-2">Member Privileges & Discounts</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-zinc-400">
                    <div>
                      <span>Court Discount:</span>{' '}
                      <span className="font-semibold text-white">
                        {member.membership_plans?.court_discount_percent}%
                      </span>
                    </div>
                    <div>
                      <span>Shop Discount:</span>{' '}
                      <span className="font-semibold text-white">
                        {member.membership_plans?.shop_discount_percent}%
                      </span>
                    </div>
                    <div>
                      <span>Bar Discount:</span>{' '}
                      <span className="font-semibold text-white">
                        {member.membership_plans?.bar_discount_percent}%
                      </span>
                    </div>
                    <div>
                      <span>Free Court Hours:</span>{' '}
                      <span className="font-semibold text-emerald-400">
                        {member.membership_plans?.free_court_hours_per_day} hr/day
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

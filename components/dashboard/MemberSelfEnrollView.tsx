'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import type { MembershipPlanItem } from '@/types/shared';
import { formatCurrency } from '@/lib/utils';
import { enrollMemberSelfAction } from '@/actions/members';
import {
  Sparkles,
  Shield,
  Activity,
  ShoppingBag,
  Coffee,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Phone,
  Loader2,
  ArrowRight,
} from 'lucide-react';

interface MemberSelfEnrollViewProps {
  plans: MembershipPlanItem[];
  userEmail: string;
  userName?: string;
}

export function MemberSelfEnrollView({ plans, userEmail, userName }: MemberSelfEnrollViewProps) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'UPI' | 'CASH'>('CARD');
  const [paymentReference, setPaymentReference] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || plans[0];

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      setError('Please select a membership plan to continue.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const res = await enrollMemberSelfAction({
        planId: selectedPlanId,
        paymentMethod,
        paymentReference: paymentReference || undefined,
        emergencyContact: emergencyContact || undefined,
      });

      if (!res.success) {
        setError(res.error || 'Failed to complete membership enrollment.');
        setLoading(false);
        return;
      }

      setSuccessMessage(res.message || 'Membership activated successfully! Redirecting...');
      setTimeout(() => {
        router.refresh();
      }, 1200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during enrollment.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      {/* Header Banner */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          <span>The Champions Club Member Onboarding</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Choose Your Athletic Membership
        </h1>
        <p className="text-sm text-zinc-400 max-w-xl mx-auto">
          Welcome{userName ? `, ${userName}` : ''}! Select a membership plan to unlock court booking discounts,
          complimentary daily playtime, and exclusive pro-shop & cafeteria privileges.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-3 animate-pulse">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <span className="font-semibold">{successMessage}</span>
        </div>
      )}

      {/* Plan Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isSelected = p.id === selectedPlanId;
          const isGold = p.tier === 'GOLD';
          const isSilver = p.tier === 'SILVER';

          return (
            <div
              key={p.id}
              onClick={() => setSelectedPlanId(p.id)}
              className={`relative rounded-2xl p-6 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-b from-emerald-950/40 to-zinc-900 border-emerald-500 shadow-xl shadow-emerald-950/40 scale-[1.02]'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              {isGold && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold uppercase tracking-wider shadow">
                  Most Popular
                </div>
              )}

              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-white">{p.name}</h3>
                    <p className="text-xs text-zinc-400 mt-0.5">{p.duration_days} Days Validity</p>
                  </div>
                  <Badge variant={isGold ? 'gold' : isSilver ? 'silver' : 'outline'}>
                    {p.tier}
                  </Badge>
                </div>

                <div className="pt-2">
                  <span className="text-3xl font-extrabold text-white">
                    {formatCurrency(Number(p.price))}
                  </span>
                  <span className="text-xs text-zinc-400 ml-1.5">/ {p.duration_days} days</span>
                </div>

                <p className="text-xs text-zinc-300 min-h-[32px] line-clamp-2">
                  {p.description || 'Full access to sports facilities, online court reservations, and club perks.'}
                </p>

                <div className="space-y-2 pt-3 border-t border-zinc-800/80 text-xs">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <Activity className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Court Discount</span>
                    </span>
                    <span className="font-semibold text-emerald-400">{p.court_discount_percent}% OFF</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Daily Free Access</span>
                    </span>
                    <span className="font-semibold text-white">{p.free_court_hours_per_day} hr/day</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Pro Shop Discount</span>
                    </span>
                    <span className="font-semibold text-white">{p.shop_discount_percent}% OFF</span>
                  </div>

                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="flex items-center gap-1.5 text-zinc-400">
                      <Coffee className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Cafeteria Discount</span>
                    </span>
                    <span className="font-semibold text-white">{p.bar_discount_percent}% OFF</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-zinc-800">
                <Button
                  type="button"
                  variant={isSelected ? 'primary' : 'outline'}
                  size="sm"
                  className="w-full text-xs font-semibold"
                  onClick={() => setSelectedPlanId(p.id)}
                >
                  {isSelected ? 'Selected' : 'Choose Plan'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enrollment Form */}
      {selectedPlan && (
        <Card className="border-zinc-800 bg-zinc-900/60 shadow-xl max-w-2xl mx-auto">
          <CardHeader className="border-b border-zinc-800/80 pb-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              <CardTitle className="text-base text-white">Complete Your Enrollment</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Confirm your payment preferences and activate membership for {userEmail}.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleEnroll} className="space-y-5">
              <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-zinc-400">Selected Plan:</span>
                  <p className="text-sm font-bold text-white mt-0.5">{selectedPlan.name} ({selectedPlan.tier})</p>
                </div>
                <div className="text-right">
                  <span className="text-zinc-400">Total Due Today:</span>
                  <p className="text-base font-extrabold text-emerald-400 mt-0.5">
                    {formatCurrency(Number(selectedPlan.price))}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-zinc-300">Payment Method</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CARD')}
                    className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'CARD'
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('UPI')}
                    className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'UPI'
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Activity className="h-4 w-4" />
                    <span>UPI / Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    className={`p-3 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                      paymentMethod === 'CASH'
                        ? 'border-emerald-500 bg-emerald-950/30 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Front Desk</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Payment Reference / Txn ID <span className="text-zinc-500">(Optional)</span>
                  </label>
                  <Input
                    placeholder="e.g. UPI-12345 or Auth Ref"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="text-xs bg-zinc-950/60 border-zinc-800"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 flex items-center gap-1">
                    <Phone className="h-3 w-3 text-zinc-400" />
                    <span>Emergency Contact Phone</span>
                  </label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    className="text-xs bg-zinc-950/60 border-zinc-800"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full text-xs font-semibold gap-2 py-2.5 shadow-lg shadow-emerald-950/50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Enrolling Membership...</span>
                    </>
                  ) : (
                    <>
                      <span>Activate {selectedPlan.name} Membership ({formatCurrency(Number(selectedPlan.price))})</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

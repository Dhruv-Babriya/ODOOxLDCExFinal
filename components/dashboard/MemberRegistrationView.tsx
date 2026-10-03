'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { registerMemberAction } from '@/actions/members';
import type { MembershipPlanItem } from '@/types/shared';
import {
  UserPlus,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Calendar,
  CreditCard,
  User,
  Mail,
  Phone,
  AlertCircle,
  Sparkles,
  Receipt,
  FileText,
  Clock,
  Percent,
} from 'lucide-react';

interface MemberRegistrationViewProps {
  plans: MembershipPlanItem[];
  userRole?: string;
}

export function MemberRegistrationView({ plans }: MemberRegistrationViewProps) {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [membershipNumber, setMembershipNumber] = useState(
    `CC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Derive initial end date based on selected plan's duration
  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const initialEndDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + (activePlan?.duration_days || 365));
    return d.toISOString().split('T')[0];
  };

  const [endDate, setEndDate] = useState(initialEndDate);
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'UNPAID'>('CASH');
  const [paymentReference, setPaymentReference] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [createdMemberId, setCreatedMemberId] = useState<string | null>(null);

  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + plan.duration_days);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    const plan = plans.find((p) => p.id === selectedPlanId);
    if (plan) {
      const d = new Date(val);
      d.setDate(d.getDate() + plan.duration_days);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const result = await registerMemberAction({
      fullName,
      email,
      phone,
      membershipNumber,
      planId: selectedPlanId,
      startDate,
      endDate,
      emergencyContact,
      notes,
      paymentMethod,
      paymentReference,
    });

    setIsSubmitting(false);

    if (!result.success) {
      setFormError(result.error);
      return;
    }

    setFormSuccess(result.message || 'Member registered and activated successfully!');
    if (result.data?.memberId) {
      setCreatedMemberId(result.data.memberId);
    }

    setTimeout(() => {
      router.push('/dashboard/members');
      router.refresh();
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Link href="/dashboard" className="hover:text-white transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/dashboard/members" className="hover:text-white transition-colors">
              Members
            </Link>
            <span>/</span>
            <span className="text-emerald-400 font-medium">Register Member</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UserPlus className="h-6 w-6 text-emerald-400" />
            <span>Register New Club Member</span>
          </h1>
          <p className="text-xs text-zinc-400">
            Create an athletic profile, assign a tier plan, and initialize financial membership records.
          </p>
        </div>

        <Link href="/dashboard/members">
          <Button variant="outline" size="sm" className="gap-2 border-zinc-700 hover:bg-zinc-800">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Members</span>
          </Button>
        </Link>
      </div>

      {/* Notifications */}
      {formError && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-sm flex items-start gap-3 shadow-lg">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Registration Failed</p>
            <p className="text-xs text-rose-200/90">{formError}</p>
          </div>
        </div>
      )}

      {formSuccess && (
        <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-sm flex items-start gap-3 shadow-lg">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Registration Successful!</p>
            <p className="text-xs text-emerald-200/90">
              {formSuccess} Redirecting to Member Directory...
            </p>
            {createdMemberId && (
              <div className="pt-2 flex items-center gap-3">
                <Link href={`/dashboard/members/${createdMemberId}`}>
                  <Button size="sm" variant="primary" className="h-7 text-xs">
                    View Member Card
                  </Button>
                </Link>
                <Link href="/dashboard/members">
                  <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-700">
                    Go to Directory
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Fields (2 columns on large screens) */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Personal & Contact Details */}
            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-base text-white">Personal & Contact Information</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Primary member credentials and communication details.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Full Name *</span>
                    </label>
                    <Input
                      required
                      placeholder="e.g. Vikramaditya Singhania"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Email Address *</span>
                    </label>
                    <Input
                      required
                      type="email"
                      placeholder="e.g. vikram@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Phone Number</span>
                    </label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Membership Number *</span>
                    </label>
                    <Input
                      required
                      value={membershipNumber}
                      onChange={(e) => setMembershipNumber(e.target.value)}
                      className="font-mono text-emerald-400 font-medium"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Membership Tier Selection */}
            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-base text-white">Select Membership Tier</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Choose the plan defining court access hours, discounts, and billing duration.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {plans.map((p) => {
                    const isSelected = p.id === selectedPlanId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handlePlanSelect(p.id)}
                        className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-950/30 shadow-md shadow-emerald-950/50'
                            : 'border-zinc-800 bg-zinc-950/40 hover:border-zinc-700 hover:bg-zinc-900/60'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm text-white">{p.name}</span>
                            <Badge
                              variant={
                                p.tier === 'GOLD'
                                  ? 'gold'
                                  : p.tier === 'SILVER'
                                    ? 'silver'
                                    : 'default'
                              }
                              className="text-[10px]"
                            >
                              {p.tier}
                            </Badge>
                          </div>
                          <div className="text-lg font-bold text-emerald-400">
                            ₹{p.price.toLocaleString()}
                            <span className="text-[11px] font-normal text-zinc-400">
                              {' '}
                              / {p.duration_days}d
                            </span>
                          </div>
                          {p.description && (
                            <p className="text-[11px] text-zinc-400 line-clamp-2">
                              {p.description}
                            </p>
                          )}
                        </div>

                        <div className="mt-3 pt-2 border-t border-zinc-800/80 text-[11px] text-zinc-300 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Free Court:</span>
                            <span className="font-medium text-emerald-400">
                              {p.free_court_hours_per_day} hr/day
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-zinc-500">Court Discount:</span>
                            <span className="font-medium">{p.court_discount_percent}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Duration Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Start Date *</span>
                    </label>
                    <Input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-zinc-400" />
                      <span>End Date (Expiry) *</span>
                    </label>
                    <Input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Payment Collection & Invoicing */}
            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-base text-white">Payment Collection</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Generate initial invoice and register desk or online payment receipt.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Payment Method *</label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={paymentMethod}
                      onChange={(e) =>
                        setPaymentMethod(e.target.value as 'CASH' | 'CARD' | 'UPI' | 'UNPAID')
                      }
                    >
                      <option value="CASH">Cash (Front Desk Counter)</option>
                      <option value="CARD">Debit / Credit Card POS</option>
                      <option value="UPI">UPI / QR Code Scan</option>
                      <option value="UNPAID">Unpaid (Issue Pending Invoice)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">
                      Payment Reference / Txn #
                    </label>
                    <Input
                      placeholder="e.g. UPI-98432 or Card Auth 4892"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Additional Emergency & Notes */}
            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-base text-white">Emergency Contact & Notes</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  Optional safety contact information and administrative remarks.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Emergency Contact Name & Phone
                  </label>
                  <Input
                    placeholder="e.g. Priya Sharma - +91 98200 12345"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300">
                    Staff Notes / Medical / Referrals
                  </label>
                  <Input
                    placeholder="e.g. Referred by Rohit Sharma; Prefers evening tennis court slots."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Privilege & Order Summary Sticky Card */}
          <div className="space-y-6">
            <Card className="border-zinc-800 bg-zinc-900/90 shadow-xl lg:sticky lg:top-6">
              <CardHeader className="pb-3 border-b border-zinc-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-400" />
                    <span>Membership Summary</span>
                  </CardTitle>
                  <Badge variant="success" className="text-[10px]">
                    Ready to Activate
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-4 space-y-4 text-xs">
                {activePlan ? (
                  <>
                    <div className="p-3 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Plan Selected</span>
                        <span className="font-semibold text-white">{activePlan.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Tier Level</span>
                        <Badge
                          variant={
                            activePlan.tier === 'GOLD'
                              ? 'gold'
                              : activePlan.tier === 'SILVER'
                                ? 'silver'
                                : 'default'
                          }
                          className="text-[10px]"
                        >
                          {activePlan.tier}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Duration</span>
                        <span className="text-zinc-200">{activePlan.duration_days} Days</span>
                      </div>
                      <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                        <span className="font-semibold text-white">Membership Fee</span>
                        <span className="text-base font-bold text-emerald-400">
                          ₹{activePlan.price.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Member Benefits */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                        <span>Included Tier Privileges</span>
                      </span>
                      <div className="space-y-1.5 text-zinc-300">
                        <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                          <span className="text-zinc-400">Free Daily Court Hours</span>
                          <span className="font-medium text-emerald-400">
                            {activePlan.free_court_hours_per_day} hr / day
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                          <span className="text-zinc-400">Court Booking Discount</span>
                          <span className="font-medium text-zinc-200">
                            {activePlan.court_discount_percent}% OFF
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                          <span className="text-zinc-400">Pro Shop Discount</span>
                          <span className="font-medium text-zinc-200">
                            {activePlan.shop_discount_percent}% OFF
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1 border-b border-zinc-800/60">
                          <span className="text-zinc-400">Bar & Cafeteria Discount</span>
                          <span className="font-medium text-zinc-200">
                            {activePlan.bar_discount_percent}% OFF
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-zinc-400">Max Daily Bookings</span>
                          <span className="font-medium text-zinc-200">
                            {activePlan.max_daily_bookings} slots
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-zinc-400 text-center py-4">No membership plan selected.</p>
                )}

                <div className="pt-4 border-t border-zinc-800 space-y-2.5">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    isLoading={isSubmitting}
                    className="w-full gap-2 text-sm font-semibold shadow-lg shadow-emerald-950/60"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Complete Member Registration</span>
                  </Button>

                  <Link href="/dashboard/members" className="block">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSubmitting}
                      className="w-full text-zinc-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}

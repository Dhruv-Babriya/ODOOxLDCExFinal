'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { registerMemberAction, checkAndProcessMembershipExpiriesAction } from '@/actions/members';
import type { MemberWithDetails, MembershipPlanItem } from '@/types/shared';
import { formatDate } from '@/lib/utils';
import {
  Users,
  Search,
  UserPlus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  X,
  Phone,
  Mail,
  RefreshCw,
} from 'lucide-react';

interface MemberManagementViewProps {
  initialMembers: MemberWithDetails[];
  plans: MembershipPlanItem[];
}

export function MemberManagementView({ initialMembers, plans }: MemberManagementViewProps) {
  const members = initialMembers;
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [membershipNumber, setMembershipNumber] = useState('CC-2026-1001');
  const [selectedPlanId, setSelectedPlanId] = useState(plans[0]?.id || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Derive initial end date based on selected plan's duration
  const activePlan = plans.find((p) => p.id === selectedPlanId) || plans[0];
  const initialEndDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + (activePlan?.duration_days || 365));
    return d.toISOString().split('T')[0];
  };
  const [endDate, setEndDate] = useState(initialEndDate());
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'UNPAID'>('CASH');
  const [paymentReference, setPaymentReference] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Expiry scanner state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  // Statistics calculation
  const totalCount = members.length;
  const activeCount = members.filter((m) => m.derived_status === 'ACTIVE').length;
  const expiringSoonCount = members.filter((m) => m.derived_status === 'EXPIRING_SOON').length;
  const expiredCount = members.filter(
    (m) => m.derived_status === 'EXPIRED' || m.status === 'EXPIRED'
  ).length;

  // Filtered members list
  const filteredMembers = members.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      m.membership_number.toLowerCase().includes(q) ||
      m.profiles?.full_name?.toLowerCase().includes(q) ||
      m.profiles?.email?.toLowerCase().includes(q) ||
      m.profiles?.phone?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === 'ALL' ||
      m.derived_status === statusFilter ||
      m.status === statusFilter;

    const matchesTier =
      tierFilter === 'ALL' || m.membership_plans?.tier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  const handlePlanChange = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + plan.duration_days);
      setEndDate(d.toISOString().split('T')[0]);
    }
  };

  const handleScanExpiries = async () => {
    setIsScanning(true);
    setScanStatus(null);
    const result = await checkAndProcessMembershipExpiriesAction();
    setIsScanning(false);

    if (!result.success) {
      setScanStatus(`Scan failed: ${result.error || 'Unknown error occurred'}`);
      return;
    }

    setScanStatus(
      `Sync Complete: ${result.data.expiredCount} memberships transitioned to EXPIRED, ${result.data.warningCount} alerts dispatched.`
    );
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
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

    setFormSuccess(result.message || 'Member registered successfully!');
    setTimeout(() => {
      setIsRegisterOpen(false);
      setFormSuccess(null);
      // Reset form
      setFullName('');
      setEmail('');
      setPhone('');
      setEmergencyContact('');
      setNotes('');
      setPaymentReference('');
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Member Management</h1>
          <p className="text-xs text-zinc-400">
            Search, register, track lifecycle, and verify active membership privileges for The Champions Club.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleScanExpiries}
            isLoading={isScanning}
            className="gap-2 text-xs border-zinc-700 bg-zinc-900/60 hover:bg-zinc-850"
            title="Scan all members against today's date, transition expired memberships, and trigger notification alerts"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Scan & Sync Expiries</span>
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              setMembershipNumber(`CC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
              setIsRegisterOpen(true);
            }}
            className="gap-2 shadow-lg shadow-emerald-950/40 text-xs"
          >
            <UserPlus className="h-4 w-4" />
            <span>Register New Member</span>
          </Button>
        </div>
      </div>

      {scanStatus && (
        <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-xs text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{scanStatus}</span>
          </div>
          <button onClick={() => setScanStatus(null)} className="text-emerald-400 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/60 p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-zinc-400">Total Enrolled</span>
            <Users className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{totalCount}</div>
          <span className="text-[10px] text-zinc-500">All registered member profiles</span>
        </Card>

        <Card className="border-emerald-800/40 bg-zinc-900/60 p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-emerald-400">Active Members</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{activeCount}</div>
          <span className="text-[10px] text-zinc-500">Eligible for court & club perks</span>
        </Card>

        <Card className="border-amber-800/40 bg-zinc-900/60 p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-amber-400">Expiring Soon</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{expiringSoonCount}</div>
          <span className="text-[10px] text-zinc-500">Within next 30 days</span>
        </Card>

        <Card className="border-rose-800/40 bg-zinc-900/60 p-4">
          <div className="flex justify-between items-start">
            <span className="text-xs font-medium text-rose-400">Expired / Suspended</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">{expiredCount}</div>
          <span className="text-[10px] text-zinc-500">Requires renewal or clearance</span>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search by name, email, phone, or #CC ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-zinc-950/60 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Filter className="h-3.5 w-3.5" />
              <span>Status:</span>
              <select
                className="h-8 rounded-lg border border-zinc-700 bg-zinc-950/80 px-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="EXPIRING_SOON">Expiring Soon (≤30d)</option>
                <option value="EXPIRED">Expired</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span>Tier:</span>
              <select
                className="h-8 rounded-lg border border-zinc-700 bg-zinc-950/80 px-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
              >
                <option value="ALL">All Tiers</option>
                <option value="GOLD">Gold</option>
                <option value="SILVER">Silver</option>
                <option value="JUNIOR">Junior</option>
              </select>
            </div>

            {(searchQuery || statusFilter !== 'ALL' || tierFilter !== 'ALL') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                  setTierFilter('ALL');
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 h-8 px-2"
              >
                Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Member Table */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base text-white">Member Directory</CardTitle>
          <Badge variant="outline" className="text-xs font-mono">
            {filteredMembers.length} of {totalCount} records
          </Badge>
        </CardHeader>
        <CardContent>
          {filteredMembers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-3">Member ID</th>
                    <th className="py-3 px-3">Full Name & Contact</th>
                    <th className="py-3 px-3">Plan / Tier</th>
                    <th className="py-3 px-3">Derived Status</th>
                    <th className="py-3 px-3">Validity Period</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {filteredMembers.map((m) => {
                    const tier = m.membership_plans?.tier;
                    const isExpiringSoon = m.derived_status === 'EXPIRING_SOON';
                    const isExpired = m.derived_status === 'EXPIRED';

                    return (
                      <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="py-3 px-3 font-mono font-semibold text-emerald-400">
                          {m.membership_number}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-zinc-200">{m.profiles?.full_name}</div>
                          <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3 text-zinc-500" />
                              {m.profiles?.email}
                            </span>
                            {m.profiles?.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3 text-zinc-500" />
                                {m.profiles?.phone}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-zinc-300">
                            {m.membership_plans?.name || 'Standard'}
                          </div>
                          <Badge
                            variant={
                              tier === 'GOLD' ? 'gold' : tier === 'SILVER' ? 'silver' : 'outline'
                            }
                            className="text-[9px] mt-0.5"
                          >
                            {tier || 'MEMBER'}
                          </Badge>
                        </td>
                        <td className="py-3 px-3">
                          {isExpiringSoon ? (
                            <Badge variant="warning" className="text-[10px]">
                              Expiring Soon ({m.days_remaining}d)
                            </Badge>
                          ) : isExpired ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Expired ({Math.abs(m.days_remaining)}d ago)
                            </Badge>
                          ) : m.status === 'ACTIVE' ? (
                            <Badge variant="success" className="text-[10px]">
                              Active ({m.days_remaining}d left)
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              {m.status}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-3 text-zinc-400">
                          <div>
                            {formatDate(m.start_date)} → {formatDate(m.end_date)}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <Link href={`/dashboard/members/${m.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-emerald-400 hover:text-emerald-300">
                              <span>Details</span>
                              <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 space-y-3 text-zinc-400 text-xs">
              <Users className="h-10 w-10 text-zinc-600 mx-auto" />
              <p className="text-sm font-medium text-zinc-300">No members match your criteria</p>
              <p className="text-zinc-500 max-w-sm mx-auto">
                Try adjusting your search terms or filters, or register a new member using the button above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Modal Dialog */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-zinc-800 bg-zinc-900 shadow-2xl overflow-y-auto max-h-[90vh]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <CardTitle className="text-lg text-white">Register New Club Member</CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Creates an athletic profile and assigns their initial membership plan.
                </p>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-md hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleRegister} className="space-y-4">
                {formError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
                    {formError}
                  </div>
                )}
                {formSuccess && (
                  <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-xs text-emerald-300">
                    {formSuccess}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Full Name *</label>
                    <Input
                      required
                      placeholder="e.g. Dhruv Babriya"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Email Address *</label>
                    <Input
                      required
                      type="email"
                      placeholder="dhruv@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Phone Number</label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Membership # *</label>
                    <Input
                      required
                      value={membershipNumber}
                      onChange={(e) => setMembershipNumber(e.target.value)}
                      className="font-mono text-emerald-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Membership Plan *</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={selectedPlanId}
                    onChange={(e) => handlePlanChange(e.target.value)}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.tier}) — ₹{p.price.toLocaleString()} / {p.duration_days} days
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Start Date</label>
                    <Input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        const plan = plans.find((p) => p.id === selectedPlanId);
                        if (plan) {
                          const d = new Date(e.target.value);
                          d.setDate(d.getDate() + plan.duration_days);
                          setEndDate(d.toISOString().split('T')[0]);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">End Date (Expiry)</label>
                    <Input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Emergency Contact</label>
                  <Input
                    placeholder="Contact Name & Phone (e.g. Kinjal - +91 98765 00000)"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Payment Collection</label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as 'CASH' | 'CARD' | 'UPI' | 'UNPAID')}
                    >
                      <option value="CASH">Cash (Desk Payment)</option>
                      <option value="CARD">Debit / Credit Card</option>
                      <option value="UPI">UPI / Net Banking</option>
                      <option value="UNPAID">Pending / Invoice Later</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Payment Reference / Txn #</label>
                    <Input
                      placeholder="e.g. UPI-99882 or Card ending 4410"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Staff Notes / Referrals</label>
                  <Input
                    placeholder="Optional onboarding notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsRegisterOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={isSubmitting}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Register Member</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

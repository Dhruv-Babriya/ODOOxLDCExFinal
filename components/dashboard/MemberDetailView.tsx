'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  updateMemberAction,
  renewMembershipAction,
  updateMemberStatusAction,
} from '@/actions/members';
import type {
  MemberWithDetails,
  MembershipHistoryItem,
  MembershipPlanItem,
  MembershipStatus,
} from '@/types/shared';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  User,
  Sparkles,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Edit,
  History,
  X,
  Clock,
  Ban,
} from 'lucide-react';

interface MemberDetailViewProps {
  member: MemberWithDetails;
  history: MembershipHistoryItem[];
  plans: MembershipPlanItem[];
}

export function MemberDetailView({
  member,
  history,
  plans,
}: MemberDetailViewProps) {
  const router = useRouter();

  // Modals state
  const [isRenewOpen, setIsRenewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // Renewal Form State
  const [renewalPlanId, setRenewalPlanId] = useState(member.current_plan_id || plans[0]?.id || '');
  const defaultRenewalStart = () => {
    const today = new Date().toISOString().split('T')[0];
    if (member.end_date && member.end_date > today) {
      return member.end_date;
    }
    return today;
  };
  const [renewalStartDate, setRenewalStartDate] = useState(defaultRenewalStart());
  const selectedPlan = plans.find((p) => p.id === renewalPlanId) || plans[0];
  const initialRenewalEndDate = () => {
    const start = defaultRenewalStart();
    const d = new Date(start);
    d.setDate(d.getDate() + (selectedPlan?.duration_days || 365));
    return d.toISOString().split('T')[0];
  };
  const [renewalEndDate, setRenewalEndDate] = useState(initialRenewalEndDate());
  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState<'CASH' | 'CARD' | 'UPI' | 'UNPAID'>('CASH');
  const [renewalPaymentRef, setRenewalPaymentRef] = useState('');
  const [renewalNotes, setRenewalNotes] = useState('');
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [renewalError, setRenewalError] = useState<string | null>(null);

  // Edit Form State
  const [editFullName, setEditFullName] = useState(member.profiles?.full_name || '');
  const [editPhone, setEditPhone] = useState(member.profiles?.phone || '');
  const [editEmergencyContact, setEditEmergencyContact] = useState(
    member.emergency_contact || ''
  );
  const [editNotes, setEditNotes] = useState(member.notes || '');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Status Change State
  const [newStatus, setNewStatus] = useState<MembershipStatus>(member.status);
  const [statusNotes, setStatusNotes] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Expiry states
  const isExpiringSoon = member.derived_status === 'EXPIRING_SOON';
  const isExpired = member.derived_status === 'EXPIRED';
  const tier = member.membership_plans?.tier;

  // Handle Renewal Submission
  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    setRenewalLoading(true);
    setRenewalError(null);

    const res = await renewMembershipAction({
      memberId: member.id,
      planId: renewalPlanId,
      startDate: renewalStartDate,
      endDate: renewalEndDate,
      notes: renewalNotes,
      paymentMethod: renewalPaymentMethod,
      paymentReference: renewalPaymentRef,
    });

    setRenewalLoading(false);

    if (!res.success) {
      setRenewalError(res.error);
      return;
    }

    setIsRenewOpen(false);
    router.refresh();
  };

  // Handle Edit Details Submission
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError(null);

    const res = await updateMemberAction({
      id: member.id,
      fullName: editFullName,
      phone: editPhone,
      emergencyContact: editEmergencyContact,
      notes: editNotes,
    });

    setEditLoading(false);

    if (!res.success) {
      setEditError(res.error);
      return;
    }

    setIsEditOpen(false);
    router.refresh();
  };

  // Handle Status Update Submission
  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusLoading(true);
    setStatusError(null);

    const res = await updateMemberStatusAction({
      memberId: member.id,
      status: newStatus,
      notes: statusNotes,
    });

    setStatusLoading(false);

    if (!res.success) {
      setStatusError(res.error);
      return;
    }

    setIsStatusOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back button and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/members">
            <Button variant="ghost" size="sm" className="h-8 text-zinc-400 hover:text-white gap-1.5 pl-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Directory</span>
            </Button>
          </Link>
          <span className="text-zinc-700">|</span>
          <span className="text-xs font-mono font-semibold text-emerald-400">
            {member.membership_number}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditOpen(true)}
            className="gap-1.5 text-xs border-zinc-700"
          >
            <Edit className="h-3.5 w-3.5" />
            <span>Edit Details</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStatusOpen(true)}
            className="gap-1.5 text-xs border-zinc-700 text-zinc-300"
          >
            <Ban className="h-3.5 w-3.5" />
            <span>Change Status</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsRenewOpen(true)}
            className="gap-1.5 text-xs shadow-md shadow-emerald-950/40"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Renew / Upgrade Plan</span>
          </Button>
        </div>
      </div>

      {/* Member Header Card */}
      <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950 shadow-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 border border-emerald-500/30 shrink-0">
              <User className="h-8 w-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white">{member.profiles?.full_name}</h1>
                <Badge
                  variant={tier === 'GOLD' ? 'gold' : tier === 'SILVER' ? 'silver' : 'outline'}
                >
                  {tier || 'MEMBER'} TIER
                </Badge>
                {isExpiringSoon ? (
                  <Badge variant="warning" className="text-xs">
                    Expiring in {member.days_remaining} Days
                  </Badge>
                ) : isExpired ? (
                  <Badge variant="destructive" className="text-xs">
                    Expired ({Math.abs(member.days_remaining)}d ago)
                  </Badge>
                ) : (
                  <Badge variant="success" className="text-xs">
                    Active
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-2">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-zinc-500" />
                  {member.profiles?.email}
                </span>
                {member.profiles?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-zinc-500" />
                    {member.profiles?.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5 font-mono text-zinc-500">
                  Joined: {formatDate(member.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800 text-right w-full md:w-auto">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-mono">
              Current Plan
            </span>
            <span className="text-base font-bold text-white block">
              {member.membership_plans?.name || 'Standard Plan'}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">
              {formatCurrency(member.membership_plans?.price || 0)} /{' '}
              {member.membership_plans?.duration_days} days
            </span>
          </div>
        </div>
      </Card>

      {/* Grid: Expiry Status & Privileges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Membership Validity & Expiry Tracking */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-emerald-400" />
                <CardTitle className="text-sm text-white">Membership Validity & Expiry</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono">
                {member.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">
                  Cycle Start Date
                </span>
                <span className="font-semibold text-white mt-1 block">
                  {formatDate(member.start_date)}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
                <span className="text-zinc-500 block text-[10px] uppercase font-mono">
                  Expiry End Date
                </span>
                <span className="font-semibold text-white mt-1 block">
                  {formatDate(member.end_date)}
                </span>
              </div>
            </div>

            {/* Derived Expiry Alert Box */}
            {isExpiringSoon && (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/80 text-xs text-amber-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-semibold">Expiring Soon ({member.days_remaining} Days Left)</p>
                  <p className="text-[11px] text-amber-400/80 mt-0.5">
                    This membership is nearing its term. Click &quot;Renew / Upgrade Plan&quot; to extend uninterrupted court and discount access.
                  </p>
                </div>
              </div>
            )}

            {isExpired && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/80 text-xs text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <div>
                  <p className="font-semibold">Membership Has Expired</p>
                  <p className="text-[11px] text-rose-400/80 mt-0.5">
                    Expired {Math.abs(member.days_remaining)} days ago. Member court discounts and booking limits are suspended until renewal.
                  </p>
                </div>
              </div>
            )}

            {!isExpiringSoon && !isExpired && member.status === 'ACTIVE' && (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/60 text-xs text-emerald-300 flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <div>
                  <p className="font-semibold">Membership Active & Verified</p>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5">
                    {member.days_remaining} days remaining in current cycle. All benefits apply across courts, shop, and cafeteria.
                  </p>
                </div>
              </div>
            )}

            {/* Emergency & Notes */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-500">Emergency Contact:</span>
                <span className="font-medium text-zinc-300">
                  {member.emergency_contact || 'None registered'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Internal Staff Notes:</span>
                <span className="font-medium text-zinc-300 italic">
                  {member.notes || 'No remarks recorded'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Plan Privileges & Benefits */}
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-sm text-white">Tier Benefits & Commercial Rules</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-xs space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Court Booking Discount:</span>
                <span className="font-bold text-emerald-400 text-sm">
                  {member.membership_plans?.court_discount_percent}% OFF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Free Daily Court Allowance:</span>
                <span className="font-bold text-white">
                  {member.membership_plans?.free_court_hours_per_day} hour(s) / day
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Max Permitted Bookings:</span>
                <span className="font-bold text-white">
                  {member.membership_plans?.max_daily_bookings} bookings / day
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Pro Shop Merchandise Discount:</span>
                <span className="font-bold text-white">
                  {member.membership_plans?.shop_discount_percent}% OFF
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Bar & Cafeteria Discount:</span>
                <span className="font-bold text-white">
                  {member.membership_plans?.bar_discount_percent}% OFF
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-500 italic">
              These tier rules and discounts are automatically applied during court reservations, pro shop checkout, and cafeteria tab settlements.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Membership History / Audit Log */}
      <Card className="border-zinc-800 bg-zinc-900/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-emerald-400" />
            <div>
              <CardTitle className="text-base text-white">Membership Audit & Renewal History</CardTitle>
              <CardDescription className="text-xs text-zinc-400">
                Complete, immutable audit log of all plan assignments, renewals, and lifecycle status changes.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-xs">
            {history.length} Event(s) Recorded
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3">Date Recorded</th>
                    <th className="py-2.5 px-3">Plan Assigned</th>
                    <th className="py-2.5 px-3">Validity Term</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Authorized By</th>
                    <th className="py-2.5 px-3">Notes & Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-sans">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-zinc-800/30">
                      <td className="py-3 px-3 font-mono text-zinc-400">
                        {formatDate(h.created_at)}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-white">
                          {h.membership_plans?.name || 'Standard Plan'}
                        </div>
                        <Badge
                          variant={
                            h.membership_plans?.tier === 'GOLD'
                              ? 'gold'
                              : h.membership_plans?.tier === 'SILVER'
                              ? 'silver'
                              : 'outline'
                          }
                          className="text-[9px] mt-0.5"
                        >
                          {h.membership_plans?.tier || 'MEMBER'}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-zinc-300">
                        {formatDate(h.start_date)} → {formatDate(h.end_date)}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={h.status === 'ACTIVE' ? 'success' : 'destructive'}
                          className="text-[10px]"
                        >
                          {h.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-zinc-300">
                        {h.profiles?.full_name || 'System Administrator'}
                      </td>
                      <td className="py-3 px-3 text-zinc-400 italic">
                        {h.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500 text-xs">
              No historical records found for this member.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Renew / Upgrade Modal */}
      {isRenewOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <CardTitle className="text-lg text-white">Renew / Upgrade Membership</CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Update membership cycle. Past records are safely preserved in audit history.
                </p>
              </div>
              <button
                onClick={() => setIsRenewOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleRenew} className="space-y-4">
                {renewalError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
                    {renewalError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Select Plan Tier *</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={renewalPlanId}
                    onChange={(e) => {
                      setRenewalPlanId(e.target.value);
                      const plan = plans.find((p) => p.id === e.target.value);
                      if (plan) {
                        const d = new Date(renewalStartDate);
                        d.setDate(d.getDate() + plan.duration_days);
                        setRenewalEndDate(d.toISOString().split('T')[0]);
                      }
                    }}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.tier}) — ₹{p.price.toLocaleString()} / {p.duration_days} days
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Start Date</label>
                    <Input
                      type="date"
                      required
                      value={renewalStartDate}
                      onChange={(e) => {
                        setRenewalStartDate(e.target.value);
                        const plan = plans.find((p) => p.id === renewalPlanId);
                        if (plan) {
                          const d = new Date(e.target.value);
                          d.setDate(d.getDate() + plan.duration_days);
                          setRenewalEndDate(d.toISOString().split('T')[0]);
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">End Date</label>
                    <Input
                      type="date"
                      required
                      value={renewalEndDate}
                      onChange={(e) => setRenewalEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Payment Collection</label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={renewalPaymentMethod}
                      onChange={(e) => setRenewalPaymentMethod(e.target.value as 'CASH' | 'CARD' | 'UPI' | 'UNPAID')}
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
                      placeholder="e.g. UPI-55210 or Card Txn"
                      value={renewalPaymentRef}
                      onChange={(e) => setRenewalPaymentRef(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Staff Notes / Renewal Reason</label>
                  <Input
                    placeholder="e.g. Annual renewal processed at front desk..."
                    value={renewalNotes}
                    onChange={(e) => setRenewalNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsRenewOpen(false)}
                    disabled={renewalLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={renewalLoading}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Confirm Renewal</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Details Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <CardTitle className="text-lg text-white">Edit Member Profile</CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Update contact information, emergency contacts, or internal notes.
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleEdit} className="space-y-4">
                {editError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
                    {editError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Full Name *</label>
                  <Input
                    required
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Phone Number</label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Emergency Contact</label>
                  <Input
                    placeholder="Name and phone number..."
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Staff Notes</label>
                  <Input
                    placeholder="Optional notes..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditOpen(false)}
                    disabled={editLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={editLoading}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Changes</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status Change Modal */}
      {isStatusOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <CardTitle className="text-lg text-white">Change Member Status</CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Update administrative status. Status change is logged in history.
                </p>
              </div>
              <button
                onClick={() => setIsStatusOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleStatusChange} className="space-y-4">
                {statusError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
                    {statusError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Target Status *</label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as MembershipStatus)}
                  >
                    <option value="ACTIVE">ACTIVE — Normal privileges</option>
                    <option value="SUSPENDED">SUSPENDED — Temporary block</option>
                    <option value="CANCELLED">CANCELLED — Member terminated</option>
                    <option value="EXPIRED">EXPIRED — Term ended</option>
                    <option value="PENDING">PENDING — Awaiting verification</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Reason / Log Notes *</label>
                  <Input
                    required
                    placeholder="e.g. Disciplinary suspension or requested cancellation..."
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsStatusOpen(false)}
                    disabled={statusLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={statusLoading}
                    className="gap-2"
                  >
                    <Ban className="h-4 w-4" />
                    <span>Apply Status</span>
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

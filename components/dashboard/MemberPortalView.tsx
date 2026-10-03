'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { MemberPortalData } from '@/types/shared';
import { formatDate, formatCurrency } from '@/lib/utils';
import { renewMembershipAction } from '@/actions/members';
import {
  Sparkles,
  Calendar,
  ShoppingBag,
  Receipt,
  CreditCard,
  History,
  Activity,
  Coffee,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  User,
  Shield,
  RefreshCw,
  X,
  Loader2,
} from 'lucide-react';

interface MemberPortalViewProps {
  data: MemberPortalData;
}

export function MemberPortalView({ data }: MemberPortalViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'bookings' | 'commerce' | 'billing' | 'history'
  >('overview');

  const {
    member,
    upcomingBookings,
    pastBookings,
    shopOrders,
    customerTabs,
    invoices,
    payments,
    history,
    availablePlans = [],
  } = data;

  const plan = member.membership_plans;
  const isExpiringSoon = member.derived_status === 'EXPIRING_SOON';
  const isExpired = member.derived_status === 'EXPIRED';
  const tier = plan?.tier;

  // Self-Service Renewal Modal State
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const plansList = availablePlans.length > 0 ? availablePlans : plan ? [plan] : [];
  const [renewalPlanId, setRenewalPlanId] = useState<string>(member.current_plan_id || plansList[0]?.id || '');
  const selectedRenewalPlan = plansList.find((p) => p.id === renewalPlanId) || plansList[0] || plan;

  const getRenewalStartDate = () => {
    const today = new Date().toISOString().split('T')[0];
    if (member.end_date && member.end_date > today) {
      return member.end_date;
    }
    return today;
  };

  const [renewalStartDate, setRenewalStartDate] = useState(getRenewalStartDate());
  const calculateRenewalEndDate = (start: string, durationDays: number) => {
    const d = new Date(start);
    d.setDate(d.getDate() + durationDays);
    return d.toISOString().split('T')[0];
  };

  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState<'CARD' | 'UPI' | 'CASH'>('CARD');
  const [renewalPaymentRef, setRenewalPaymentRef] = useState('');
  const [renewalNotes, setRenewalNotes] = useState('');
  const [renewalLoading, setRenewalLoading] = useState(false);
  const [renewalError, setRenewalError] = useState<string | null>(null);
  const [renewalSuccess, setRenewalSuccess] = useState<string | null>(null);

  const handleSelfRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    setRenewalLoading(true);
    setRenewalError(null);
    setRenewalSuccess(null);

    const endDate = calculateRenewalEndDate(
      renewalStartDate,
      selectedRenewalPlan?.duration_days || 365
    );

    const res = await renewMembershipAction({
      memberId: member.id,
      planId: renewalPlanId,
      startDate: renewalStartDate,
      endDate,
      notes: renewalNotes || 'Online self-service renewal',
      paymentMethod: renewalPaymentMethod,
      paymentReference: renewalPaymentRef || undefined,
    });

    setRenewalLoading(false);

    if (!res.success) {
      setRenewalError(res.error || 'Failed to complete membership renewal.');
      return;
    }

    setRenewalSuccess(res.message || 'Membership renewed successfully!');
    setTimeout(() => {
      setIsRenewModalOpen(false);
      setRenewalSuccess(null);
      router.refresh();
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header Banner */}
      <Card className="border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-950 to-emerald-950/20 shadow-xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-950/50 border border-emerald-500/30 shrink-0">
              <Sparkles className="h-8 w-8 text-emerald-200" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  Welcome, {member.profiles?.full_name}
                </h1>
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

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-2 font-mono">
                <span className="text-emerald-400 font-semibold">
                  Member #{member.membership_number}
                </span>
                <span className="text-zinc-600">•</span>
                <span>{plan?.name || 'Standard Plan'}</span>
                <span className="text-zinc-600">•</span>
                <span>Valid until: {formatDate(member.end_date)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
            <Button
              variant={isExpiringSoon || isExpired ? 'primary' : 'outline'}
              size="sm"
              className={`gap-2 text-xs ${
                isExpiringSoon || isExpired
                  ? 'bg-amber-600 hover:bg-amber-500 text-white border-none shadow-md shadow-amber-950/40'
                  : 'border-zinc-700 text-zinc-300 hover:text-white'
              }`}
              onClick={() => {
                setRenewalStartDate(getRenewalStartDate());
                setIsRenewModalOpen(true);
              }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Renew / Upgrade</span>
            </Button>
            <Link href="/dashboard/bookings">
              <Button variant="primary" size="sm" className="gap-2 text-xs shadow-md shadow-emerald-950/40">
                <Calendar className="h-3.5 w-3.5" />
                <span>Book Court</span>
              </Button>
            </Link>
            <Link href="/dashboard/shop">
              <Button variant="outline" size="sm" className="gap-2 text-xs border-zinc-700">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>Pro Shop</span>
              </Button>
            </Link>
            <Link href="/dashboard/profile">
              <Button variant="ghost" size="sm" className="gap-2 text-xs text-zinc-400 hover:text-white">
                <User className="h-3.5 w-3.5" />
                <span>My Profile</span>
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Expiry Alert Banners */}
      {isExpiringSoon && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs text-amber-300 flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-white">Membership Expiring Soon ({member.days_remaining} Days Remaining)</p>
              <p className="text-amber-400/80 mt-1">
                Your current cycle ends on {formatDate(member.end_date)}. Renew online now to seamlessly extend your membership without losing your remaining days or court discounts.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-amber-700 text-amber-300 hover:bg-amber-900/40 shrink-0 gap-1.5"
            onClick={() => {
              setRenewalStartDate(getRenewalStartDate());
              setIsRenewModalOpen(true);
            }}
          >
            <RefreshCw className="h-3 w-3" />
            <span>Renew Online Now</span>
          </Button>
        </div>
      )}

      {isExpired && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 text-xs text-rose-300 flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-white">Membership Term Elapsed</p>
              <p className="text-rose-400/80 mt-1">
                Your membership expired {Math.abs(member.days_remaining)} days ago on {formatDate(member.end_date)}. Reactivate your membership online to restore court discounts and privileges.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-rose-700 text-rose-300 hover:bg-rose-900/40 shrink-0 gap-1.5"
            onClick={() => {
              setRenewalStartDate(getRenewalStartDate());
              setIsRenewModalOpen(true);
            }}
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reactivate Membership</span>
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-800 gap-2 overflow-x-auto text-xs font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span>Overview & Benefits</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'bookings'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>My Court Bookings ({upcomingBookings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('commerce')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'commerce'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Shop & Cafeteria ({shopOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'billing'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Invoices & Payments ({invoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'history'
              ? 'border-emerald-500 text-emerald-400 font-semibold'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <History className="h-4 w-4" />
          <span>Membership History ({history.length})</span>
        </button>
      </div>

      {/* Tab 1: Overview & Benefits */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Membership Privileges Matrix */}
            <Card className="border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-sm text-white">Your Plan Privileges & Discounts</CardTitle>
                </div>
                <CardDescription className="text-xs text-zinc-400">
                  Calculated automatically across sports courts, pro-shop gear, and cafeteria orders.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Activity className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Court Booking Discount:</span>
                    </span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {plan?.court_discount_percent}% OFF
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Free Daily Court Access:</span>
                    </span>
                    <span className="font-bold text-white">
                      {plan?.free_court_hours_per_day} hr / day
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                      <span>Daily Booking Cap:</span>
                    </span>
                    <span className="font-bold text-white">
                      {plan?.max_daily_bookings} bookings / day
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Pro Shop Merchandise:</span>
                    </span>
                    <span className="font-bold text-white">
                      {plan?.shop_discount_percent}% OFF
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400 flex items-center gap-2">
                      <Coffee className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Bar & Cafeteria:</span>
                    </span>
                    <span className="font-bold text-white">
                      {plan?.bar_discount_percent}% OFF
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-zinc-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Discounts apply automatically at checkout when booking courts or purchasing gear.
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Summary: Next Booking & Running Tab */}
            <div className="space-y-6">
              {/* Next Upcoming Booking */}
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader className="pb-3 border-b border-zinc-800/80">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-sky-400" />
                      <CardTitle className="text-sm text-white">Next Court Session</CardTitle>
                    </div>
                    {upcomingBookings.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        {upcomingBookings[0].status}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {upcomingBookings.length > 0 ? (
                    <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-white text-sm block">
                            {upcomingBookings[0].court_name}
                          </span>
                          <span className="text-zinc-400 text-[11px]">
                            {upcomingBookings[0].sport_type} • {upcomingBookings[0].is_indoor ? 'Indoor Arena' : 'Outdoor Court'}
                          </span>
                        </div>
                        <span className="font-mono font-bold text-emerald-400">
                          {formatCurrency(upcomingBookings[0].total_price)}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-zinc-300 text-[11px]">
                        <span>Time: {formatDate(upcomingBookings[0].start_time)}</span>
                        <Link href="/dashboard/bookings" className="text-emerald-400 hover:underline">
                          View Court &rarr;
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-zinc-500 text-xs space-y-2">
                      <Calendar className="h-6 w-6 text-zinc-600 mx-auto" />
                      <p>No upcoming court reservations scheduled</p>
                      <Link href="/dashboard/bookings">
                        <Button size="sm" variant="outline" className="text-xs gap-1.5 h-7">
                          <span>Reserve a Court Slot</span>
                          <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Running Cafeteria Tab */}
              <Card className="border-zinc-800 bg-zinc-900/50">
                <CardHeader className="pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <Coffee className="h-4 w-4 text-amber-400" />
                    <CardTitle className="text-sm text-white">Bar & Cafeteria Tab</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  {customerTabs.length > 0 ? (
                    <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800 text-xs space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 font-mono">Tab #{customerTabs[0].tab_number}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {customerTabs[0].status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-baseline pt-1">
                        <span className="text-zinc-400">Current Balance:</span>
                        <span className="text-lg font-bold text-white">
                          {formatCurrency(customerTabs[0].current_balance)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-zinc-500">
                        <span>Credit Limit: {formatCurrency(customerTabs[0].credit_limit)}</span>
                        <span>Opened: {formatDate(customerTabs[0].opened_at)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-zinc-500 text-xs">
                      <p>No active cafeteria tab. Tabs can be opened at the counter.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: My Bookings */}
      {activeTab === 'bookings' && (
        <div className="space-y-6">
          {/* Upcoming */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-base text-white">Upcoming Court Reservations</CardTitle>
                </div>
                <Link href="/dashboard/bookings">
                  <Button size="sm" variant="primary" className="text-xs h-7 gap-1">
                    <span>New Booking</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {upcomingBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Court</th>
                        <th className="py-2.5 px-3">Date & Time</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {upcomingBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-zinc-800/30">
                          <td className="py-3 px-3">
                            <span className="font-semibold text-white block">{b.court_name}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {b.sport_type} {b.is_indoor ? '(Indoor)' : ''}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-zinc-300">
                            <div>{formatDate(b.start_time)}</div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-[10px]">
                              {b.booking_type}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="success" className="text-[10px]">
                              {b.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                            {formatCurrency(b.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs space-y-2">
                  <p>You have no upcoming reservations scheduled.</p>
                  <Link href="/dashboard/bookings">
                    <Button size="sm" variant="outline" className="text-xs">
                      Reserve a Court
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Bookings */}
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <CardTitle className="text-sm text-zinc-400">Past Bookings Archive</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {pastBookings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2 px-3">Court</th>
                        <th className="py-2 px-3">Session Date</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {pastBookings.map((b) => (
                        <tr key={b.id} className="hover:bg-zinc-800/30 text-zinc-400">
                          <td className="py-2.5 px-3 font-medium text-zinc-300">{b.court_name}</td>
                          <td className="py-2.5 px-3">{formatDate(b.start_time)}</td>
                          <td className="py-2.5 px-3">
                            <Badge variant={b.status === 'CANCELLED' ? 'destructive' : 'outline'} className="text-[10px]">
                              {b.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            {formatCurrency(b.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-zinc-500 text-xs">
                  No past sessions recorded.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Commerce & F&B Orders */}
      {activeTab === 'commerce' && (
        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-base text-white">Pro Shop Orders</CardTitle>
                </div>
                <Link href="/dashboard/shop">
                  <Button size="sm" variant="outline" className="text-xs h-7">
                    Browse Pro Shop
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {shopOrders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Order Number</th>
                        <th className="py-2.5 px-3">Items Summary</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Channel</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {shopOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-zinc-800/30">
                          <td className="py-3 px-3 font-mono font-medium text-emerald-400">
                            {o.order_number}
                          </td>
                          <td className="py-3 px-3 text-zinc-300">
                            <span>{o.items_summary}</span>
                          </td>
                          <td className="py-3 px-3 text-zinc-400">
                            {formatDate(o.created_at)}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-[10px]">
                              {o.channel}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={o.status === 'COMPLETED' ? 'success' : 'outline'}
                              className="text-[10px]"
                            >
                              {o.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                            {formatCurrency(o.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 text-xs space-y-2">
                  <p>You have not placed any pro-shop gear orders yet.</p>
                  <Link href="/dashboard/shop">
                    <Button size="sm" variant="outline" className="text-xs">
                      Shop Rackets & Apparel
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Billing, Invoices & Payments */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-400" />
                <CardTitle className="text-base text-white">Invoices & Statements</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Issue Date</th>
                        <th className="py-2.5 px-3">Due Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-zinc-800/30">
                          <td className="py-3 px-3 font-mono font-semibold text-purple-400">
                            {inv.invoice_number}
                          </td>
                          <td className="py-3 px-3 text-zinc-400">{formatDate(inv.created_at)}</td>
                          <td className="py-3 px-3 text-zinc-400">{formatDate(inv.due_date)}</td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'destructive' : 'outline'}
                              className="text-[10px]"
                            >
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-white">
                            {formatCurrency(inv.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  No invoices issued.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                <CardTitle className="text-base text-white">Payment Receipts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {payments.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Receipt #</th>
                        <th className="py-2.5 px-3">Payment Date</th>
                        <th className="py-2.5 px-3">Method</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-sans">
                      {payments.map((p) => (
                        <tr key={p.id} className="hover:bg-zinc-800/30">
                          <td className="py-3 px-3 font-mono text-zinc-300">{p.receipt_number}</td>
                          <td className="py-3 px-3 text-zinc-400">{formatDate(p.created_at)}</td>
                          <td className="py-3 px-3">
                            <Badge variant="outline" className="text-[10px]">
                              {p.payment_method}
                            </Badge>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="success" className="text-[10px]">
                              {p.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-400">
                            {formatCurrency(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-zinc-500 text-xs">
                  No payment records found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 5: Membership History */}
      {activeTab === 'history' && (
        <Card className="border-zinc-800 bg-zinc-900/50">
          <CardHeader className="pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-emerald-400" />
              <CardTitle className="text-base text-white">Membership Audit & Renewal Trail</CardTitle>
            </div>
            <CardDescription className="text-xs text-zinc-400">
              Historical record of all plan upgrades, renewals, and verified transitions.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Plan Enrolled</th>
                      <th className="py-2.5 px-3">Validity Window</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Remarks / Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-sans">
                    {history.map((h) => (
                      <tr key={h.id} className="hover:bg-zinc-800/30">
                        <td className="py-3 px-3 font-mono text-zinc-400">{formatDate(h.created_at)}</td>
                        <td className="py-3 px-3 font-medium text-white">
                          {h.membership_plans?.name || 'Standard Plan'}
                        </td>
                        <td className="py-3 px-3 text-zinc-300">
                          {formatDate(h.start_date)} → {formatDate(h.end_date)}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={h.status === 'ACTIVE' ? 'success' : 'destructive'} className="text-[10px]">
                            {h.status}
                          </Badge>
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
              <div className="text-center py-6 text-zinc-500 text-xs">
                No past membership history records found.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Self-Service Renewal Modal */}
      {isRenewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="flex items-center justify-between p-5 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <RefreshCw className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Renew / Upgrade Membership</h3>
                  <p className="text-xs text-zinc-400">Member #{member.membership_number}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRenewModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSelfRenewal} className="p-5 space-y-4">
              {renewalError && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                  <span>{renewalError}</span>
                </div>
              )}

              {renewalSuccess && (
                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 animate-pulse">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{renewalSuccess}</span>
                </div>
              )}

              {/* Plan Selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Select Membership Plan</label>
                <select
                  value={renewalPlanId}
                  onChange={(e) => setRenewalPlanId(e.target.value)}
                  className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                >
                  {plansList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.tier}) — {formatCurrency(Number(p.price))} / {p.duration_days} days
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Plan Perks summary */}
              {selectedRenewalPlan && (
                <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="text-zinc-400">Plan Rate:</span>
                    <span className="font-bold text-white">{formatCurrency(Number(selectedRenewalPlan.price))}</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="text-zinc-400">Court Booking Discount:</span>
                    <span className="font-bold text-emerald-400">{selectedRenewalPlan.court_discount_percent}% OFF</span>
                  </div>
                  <div className="flex justify-between items-center text-zinc-300">
                    <span className="text-zinc-400">Daily Free Play:</span>
                    <span className="font-bold text-white">{selectedRenewalPlan.free_court_hours_per_day} hr / day</span>
                  </div>
                </div>
              )}

              {/* Extension Dates Information */}
              <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-800/80 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">New Term Start:</span>
                  <span className="font-mono text-white font-medium">{renewalStartDate}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400">New Term End:</span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {calculateRenewalEndDate(renewalStartDate, selectedRenewalPlan?.duration_days || 365)}
                  </span>
                </div>
                <div className="pt-1 border-t border-zinc-800/60 text-[11px] text-zinc-400">
                  {member.end_date && member.end_date > new Date().toISOString().split('T')[0] ? (
                    <span className="text-emerald-400">
                      ✓ Seamless Extension: Existing active days preserved.
                    </span>
                  ) : (
                    <span className="text-amber-400">
                      ⚡ Immediate Reactivation: Starts from today.
                    </span>
                  )}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRenewalPaymentMethod('CARD')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      renewalPaymentMethod === 'CARD'
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenewalPaymentMethod('UPI')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      renewalPaymentMethod === 'UPI'
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    <span>UPI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenewalPaymentMethod('CASH')}
                    className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      renewalPaymentMethod === 'CASH'
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Front Desk</span>
                  </button>
                </div>
              </div>

              {/* Optional Reference */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">
                  Payment Reference <span className="text-zinc-500">(Optional)</span>
                </label>
                <Input
                  placeholder="e.g. Transaction ID / Card Auth"
                  value={renewalPaymentRef}
                  onChange={(e) => setRenewalPaymentRef(e.target.value)}
                  className="text-xs bg-zinc-950 border-zinc-800"
                />
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-300">
                  Notes / Requests <span className="text-zinc-500">(Optional)</span>
                </label>
                <Input
                  placeholder="e.g. Requested plan tier upgrade"
                  value={renewalNotes}
                  onChange={(e) => setRenewalNotes(e.target.value)}
                  className="text-xs bg-zinc-950 border-zinc-800"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-2 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-1/3 text-xs border-zinc-800"
                  onClick={() => setIsRenewModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  className="w-2/3 text-xs font-semibold gap-1.5"
                  disabled={renewalLoading}
                >
                  {renewalLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay {formatCurrency(Number(selectedRenewalPlan?.price || 0))} & Renew</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

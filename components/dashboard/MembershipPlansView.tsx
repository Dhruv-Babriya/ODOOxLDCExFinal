'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  updateMembershipPlanAction,
  createMembershipPlanAction,
  togglePlanStatusAction,
} from '@/actions/plans';
import type { MembershipPlanItem, MembershipTier } from '@/types/shared';
import { formatCurrency } from '@/lib/utils';
import {
  Plus,
  Edit,
  CheckCircle2,
  Users,
  Sparkles,
  ShoppingBag,
  Coffee,
  Activity,
  X,
  Archive,
  RotateCcw,
} from 'lucide-react';

interface MembershipPlansViewProps {
  initialPlans: MembershipPlanItem[];
}

export function MembershipPlansView({ initialPlans }: MembershipPlansViewProps) {
  const router = useRouter();
  const [plans] = useState<MembershipPlanItem[]>(initialPlans);

  // Edit Plan State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlanItem | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editDuration, setEditDuration] = useState<number>(365);
  const [editCourtDiscount, setEditCourtDiscount] = useState<number>(0);
  const [editShopDiscount, setEditShopDiscount] = useState<number>(0);
  const [editBarDiscount, setEditBarDiscount] = useState<number>(0);
  const [editFreeHours, setEditFreeHours] = useState<number>(0);
  const [editMaxBookings, setEditMaxBookings] = useState<number>(2);
  const [editDescription, setEditDescription] = useState<string>('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Create Plan State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTier, setCreateTier] = useState<MembershipTier>('GOLD');
  const [createDescription, setCreateDescription] = useState('');
  const [createPrice, setCreatePrice] = useState<number>(10000);
  const [createDuration, setCreateDuration] = useState<number>(365);
  const [createCourtDiscount, setCreateCourtDiscount] = useState<number>(20);
  const [createShopDiscount, setCreateShopDiscount] = useState<number>(10);
  const [createBarDiscount, setCreateBarDiscount] = useState<number>(10);
  const [createFreeHours, setCreateFreeHours] = useState<number>(0);
  const [createMaxBookings, setCreateMaxBookings] = useState<number>(2);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const openEditModal = (plan: MembershipPlanItem) => {
    setEditingPlan(plan);
    setEditPrice(plan.price);
    setEditDuration(plan.duration_days);
    setEditCourtDiscount(plan.court_discount_percent);
    setEditShopDiscount(plan.shop_discount_percent);
    setEditBarDiscount(plan.bar_discount_percent);
    setEditFreeHours(plan.free_court_hours_per_day);
    setEditMaxBookings(plan.max_daily_bookings);
    setEditDescription(plan.description || '');
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    setEditLoading(true);
    setEditError(null);

    const res = await updateMembershipPlanAction({
      id: editingPlan.id,
      name: editingPlan.name,
      tier: editingPlan.tier,
      description: editDescription,
      durationDays: editDuration,
      price: editPrice,
      courtDiscountPercent: editCourtDiscount,
      shopDiscountPercent: editShopDiscount,
      barDiscountPercent: editBarDiscount,
      freeCourtHoursPerDay: editFreeHours,
      maxDailyBookings: editMaxBookings,
      isActive: editingPlan.is_active,
    });

    setEditLoading(false);

    if (!res.success) {
      setEditError(res.error);
      return;
    }

    setIsEditOpen(false);
    router.refresh();
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    const res = await createMembershipPlanAction({
      name: createName,
      tier: createTier,
      description: createDescription,
      durationDays: createDuration,
      price: createPrice,
      courtDiscountPercent: createCourtDiscount,
      shopDiscountPercent: createShopDiscount,
      barDiscountPercent: createBarDiscount,
      freeCourtHoursPerDay: createFreeHours,
      maxDailyBookings: createMaxBookings,
      isActive: true,
    });

    setCreateLoading(false);

    if (!res.success) {
      setCreateError(res.error);
      return;
    }

    setIsCreateOpen(false);
    // Reset form
    setCreateName('');
    setCreateDescription('');
    router.refresh();
  };

  const handleToggleStatus = async (plan: MembershipPlanItem) => {
    const res = await togglePlanStatusAction(plan.id, !plan.is_active);
    if (res.success) {
      router.refresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Membership Plans & Tiers</h1>
          <p className="text-xs text-zinc-400">
            Configure Gold, Silver, and Junior tiers with dynamic benefits across courts, pro shop, and cafeteria.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 shadow-lg shadow-emerald-950/40"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Tier Plan</span>
        </Button>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isGold = plan.tier === 'GOLD';
          const isSilver = plan.tier === 'SILVER';

          return (
            <Card
              key={plan.id}
              className={`border-zinc-800 bg-zinc-900/60 shadow-xl flex flex-col justify-between transition-all hover:border-zinc-700 ${
                isGold
                  ? 'ring-1 ring-amber-500/20'
                  : isSilver
                  ? 'ring-1 ring-slate-400/20'
                  : ''
              }`}
            >
              <div>
                <CardHeader className="pb-3 border-b border-zinc-800/80">
                  <div className="flex justify-between items-center">
                    <Badge
                      variant={isGold ? 'gold' : isSilver ? 'silver' : 'outline'}
                      className="text-xs font-semibold"
                    >
                      {plan.tier} TIER
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={plan.is_active ? 'success' : 'outline'}
                        className="text-[10px]"
                      >
                        {plan.is_active ? 'Active' : 'Archived'}
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-xl text-white mt-2">{plan.name}</CardTitle>
                  <CardDescription className="text-xs text-zinc-400 line-clamp-2 mt-1">
                    {plan.description || 'Standard membership tier privileges.'}
                  </CardDescription>

                  <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-bold text-white">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-xs text-zinc-400 ml-1">/ {plan.duration_days} days</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-zinc-400 font-mono">
                      <Users className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="font-bold text-emerald-400">{plan.member_count || 0}</span>
                      <span>active</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-3 text-xs text-zinc-300">
                  <div className="space-y-2 p-3 rounded-lg bg-zinc-950/60 border border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <Activity className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Court Discount:</span>
                      </span>
                      <span className="font-bold text-emerald-400">
                        {plan.court_discount_percent}% OFF
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Free Court Hours:</span>
                      </span>
                      <span className="font-bold text-white">
                        {plan.free_court_hours_per_day} hr / day
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <Activity className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Daily Booking Cap:</span>
                      </span>
                      <span className="font-bold text-white">
                        {plan.max_daily_bookings} bookings / day
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <ShoppingBag className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Pro Shop Discount:</span>
                      </span>
                      <span className="font-bold text-white">
                        {plan.shop_discount_percent}% OFF
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-zinc-400">
                        <Coffee className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Cafeteria Discount:</span>
                      </span>
                      <span className="font-bold text-white">
                        {plan.bar_discount_percent}% OFF
                      </span>
                    </div>
                  </div>
                </CardContent>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(plan)}
                  className="flex-1 gap-1.5 text-xs border-zinc-700"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Edit Benefits</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleToggleStatus(plan)}
                  className={`text-xs px-2.5 ${
                    plan.is_active
                      ? 'text-zinc-400 hover:text-amber-400'
                      : 'text-zinc-400 hover:text-emerald-400'
                  }`}
                  title={plan.is_active ? 'Archive Plan' : 'Restore Plan'}
                >
                  {plan.is_active ? <Archive className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Edit Benefits Modal */}
      {isEditOpen && editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-zinc-800 bg-zinc-900 shadow-2xl overflow-y-auto max-h-[90vh]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <CardTitle className="text-lg text-white">
                  Configure Benefits: {editingPlan.name}
                </CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Update commercial pricing and cross-module discount rates.
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
              <form onSubmit={handleUpdatePlan} className="space-y-4">
                {editError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Plan Fee (₹) *</label>
                    <Input
                      type="number"
                      required
                      min={0}
                      step={100}
                      value={editPrice}
                      onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Duration (Days) *</label>
                    <Input
                      type="number"
                      required
                      min={1}
                      value={editDuration}
                      onChange={(e) => setEditDuration(parseInt(e.target.value) || 365)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Court Disc. (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editCourtDiscount}
                      onChange={(e) => setEditCourtDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Shop Disc. (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editShopDiscount}
                      onChange={(e) => setEditShopDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Bar Disc. (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editBarDiscount}
                      onChange={(e) => setEditBarDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Free Court Hours/Day</label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={editFreeHours}
                      onChange={(e) => setEditFreeHours(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Max Daily Bookings</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={editMaxBookings}
                      onChange={(e) => setEditMaxBookings(parseInt(e.target.value) || 2)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Plan Description</label>
                  <Input
                    placeholder="Short description of member perks..."
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
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
                    <span>Save Plan Benefits</span>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Plan Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-lg w-full border-zinc-800 bg-zinc-900 shadow-2xl overflow-y-auto max-h-[90vh]">
            <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/80 pb-4">
              <div>
                <CardTitle className="text-lg text-white">Create New Membership Tier</CardTitle>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Define a new pricing plan and benefit structure.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreatePlan} className="space-y-4">
                {createError && (
                  <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-xs text-rose-300">
                    {createError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Plan Name *</label>
                    <Input
                      required
                      placeholder="e.g. Gold Executive"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Tier Category *</label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-zinc-700 bg-zinc-950/80 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      value={createTier}
                      onChange={(e) => setCreateTier(e.target.value as MembershipTier)}
                    >
                      <option value="GOLD">GOLD</option>
                      <option value="SILVER">SILVER</option>
                      <option value="JUNIOR">JUNIOR</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Plan Fee (₹) *</label>
                    <Input
                      type="number"
                      required
                      min={0}
                      step={100}
                      value={createPrice}
                      onChange={(e) => setCreatePrice(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Duration (Days) *</label>
                    <Input
                      type="number"
                      required
                      min={1}
                      value={createDuration}
                      onChange={(e) => setCreateDuration(parseInt(e.target.value) || 365)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Court Disc. (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={createCourtDiscount}
                      onChange={(e) => setCreateCourtDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Shop Disc. (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={createShopDiscount}
                      onChange={(e) => setCreateShopDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Bar Disc. (%)</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={createBarDiscount}
                      onChange={(e) => setCreateBarDiscount(parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Free Court Hours/Day</label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      value={createFreeHours}
                      onChange={(e) => setCreateFreeHours(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-300">Max Daily Bookings</label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={createMaxBookings}
                      onChange={(e) => setCreateMaxBookings(parseInt(e.target.value) || 2)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-300">Description</label>
                  <Input
                    placeholder="Short description of benefits..."
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreateOpen(false)}
                    disabled={createLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={createLoading}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Plan</span>
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

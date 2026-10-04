'use client';

import { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { createBarOrderAction } from '@/actions/bar';
import {
  Utensils,
  Coffee,
  ShoppingBag,
  Sparkles,
  Clock,
  CheckCircle2,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  AlertCircle,
  ChefHat,
  Bell,
  CreditCard,
  Flame,
  Leaf,
  RefreshCw,
  Armchair,
  Footprints,
  Info,
} from 'lucide-react';
import type {
  BarTable,
  MenuCategory,
  MenuItem,
  CustomerTab,
  BarOrder,
  Member,
} from './BarManager';

export interface MemberBarOrderingViewProps {
  tables: BarTable[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  currentMember?: Member | null;
  currentMemberTab?: CustomerTab | null;
  memberOrders?: BarOrder[];
  isStaffMode?: boolean;
  allMembers?: Member[];
  onSwitchToStaffManagement?: () => void;
}

interface CartItem {
  item: MenuItem;
  quantity: number;
  specialInstructions: string;
}

export function MemberBarOrderingView({
  tables,
  categories,
  menuItems,
  currentMember,
  currentMemberTab,
  memberOrders: initialMemberOrders = [],
  isStaffMode = false,
  allMembers = [],
  onSwitchToStaffManagement,
}: MemberBarOrderingViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active top navigation view for member: 'MENU' | 'MY_ORDERS' | 'MY_TAB'
  const [currentTab, setCurrentTab] = useState<'MENU' | 'MY_ORDERS' | 'MY_TAB'>('MENU');

  // Search & category filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [dietaryFilter, setDietaryFilter] = useState<string>('ALL');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isTrayDrawerOpen, setIsTrayDrawerOpen] = useState(false);

  // Dining destination: 'COUNTER' | 'TABLE'
  const [diningDestination, setDiningDestination] = useState<'COUNTER' | 'TABLE'>('COUNTER');
  const [selectedTableId, setSelectedTableId] = useState<string>('');

  // Payment preference
  const [useTabPayment, setUseTabPayment] = useState<boolean>(!!currentMemberTab);
  const [generalOrderNotes, setGeneralOrderNotes] = useState('');

  // For staff mode: staff can optionally pick a member to order for
  const [staffSelectedMemberId, setStaffSelectedMemberId] = useState<string>(
    currentMember?.id || ''
  );

  // Local state for orders so placement provides instant feedback
  const [orders, setOrders] = useState<BarOrder[]>(initialMemberOrders);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Determine active member
  const activeMember = useMemo(() => {
    if (isStaffMode && staffSelectedMemberId) {
      return allMembers.find((m) => m.id === staffSelectedMemberId) || currentMember;
    }
    return currentMember;
  }, [isStaffMode, staffSelectedMemberId, allMembers, currentMember]);

  // Discount percent from active member plan
  const memberDiscountPercent = useMemo(() => {
    if (activeMember?.status === 'ACTIVE' && activeMember.membership_plans?.bar_discount_percent) {
      return Number(activeMember.membership_plans.bar_discount_percent);
    }
    return 0;
  }, [activeMember]);

  // Available tables
  const availableTables = useMemo(() => {
    return tables.filter((t) => t.status === 'AVAILABLE');
  }, [tables]);

  // Cart calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.item.price * item.quantity, 0);
  }, [cart]);

  const cartDiscountAmount = useMemo(() => {
    return (cartSubtotal * memberDiscountPercent) / 100;
  }, [cartSubtotal, memberDiscountPercent]);

  const cartTotalAmount = useMemo(() => {
    return Math.max(0, cartSubtotal - cartDiscountAmount);
  }, [cartSubtotal, cartDiscountAmount]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  // Helper for item dietary tags
  const getItemTag = (item: MenuItem): { label: string; icon: 'protein' | 'leaf' | 'sparkle' | 'flame' } | null => {
    const text = (item.name + ' ' + (item.description || '')).toLowerCase();
    if (text.includes('protein') || text.includes('whey') || text.includes('chicken')) {
      return { label: 'High Protein', icon: 'protein' };
    }
    if (text.includes('quinoa') || text.includes('organic') || text.includes('vegan') || text.includes('avocado')) {
      return { label: 'Superfood', icon: 'leaf' };
    }
    if (text.includes('cold brew') || text.includes('citrus') || text.includes('smoothie')) {
      return { label: 'Energizing', icon: 'sparkle' };
    }
    if (text.includes('tikka') || text.includes('sandwich') || text.includes('toasted')) {
      return { label: 'Club Favorite', icon: 'flame' };
    }
    return null;
  };

  // Filtered menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category_id !== selectedCategory) {
        return false;
      }

      // Dietary filter
      if (dietaryFilter !== 'ALL') {
        const text = (item.name + ' ' + (item.description || '')).toLowerCase();
        if (dietaryFilter === 'PROTEIN' && !text.includes('protein') && !text.includes('whey') && !text.includes('chicken')) {
          return false;
        }
        if (dietaryFilter === 'VEG' && (text.includes('chicken') || text.includes('meat'))) {
          return false;
        }
        if (dietaryFilter === 'DRINKS' && !text.includes('brew') && !text.includes('smoothie') && !text.includes('refresher')) {
          return false;
        }
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesCategory = (item.menu_categories?.name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCategory) {
          return false;
        }
      }

      return true;
    });
  }, [menuItems, selectedCategory, dietaryFilter, searchQuery]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    if (!item.is_available) return;
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.item.id === item.id);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { item, quantity: 1, specialInstructions: '' }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.item.id === itemId);
      if (idx < 0) return prev;
      const newQty = prev[idx].quantity + delta;
      if (newQty <= 0) {
        return prev.filter((i) => i.item.id !== itemId);
      }
      const updated = [...prev];
      updated[idx] = { ...updated[idx], quantity: newQty };
      return updated;
    });
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  const updateInstructions = (itemId: string, instructions: string) => {
    setCart((prev) =>
      prev.map((i) => (i.item.id === itemId ? { ...i, specialInstructions: instructions } : i))
    );
  };

  // Submit Order to Kitchen & Bar
  const handleCheckoutOrder = async () => {
    if (cart.length === 0) {
      setFeedback({ type: 'error', message: 'Your order tray is empty. Add delicious items first!' });
      return;
    }

    if (diningDestination === 'TABLE' && !selectedTableId) {
      setFeedback({
        type: 'error',
        message: 'Please select a dining table for table service.',
      });
      return;
    }

    const effectiveMemberId = activeMember?.id || null;
    const effectiveTableId = diningDestination === 'TABLE' ? selectedTableId : null;
    const effectiveTabId = useTabPayment && currentMemberTab ? currentMemberTab.id : null;

    startTransition(async () => {
      setFeedback(null);
      const res = await createBarOrderAction({
        tableId: effectiveTableId,
        tabId: effectiveTabId,
        memberId: effectiveMemberId,
        items: cart.map((c) => ({
          menuItemId: c.item.id,
          quantity: c.quantity,
          specialInstructions: c.specialInstructions || null,
        })),
        notes: generalOrderNotes
          ? `${diningDestination === 'COUNTER' ? '[Counter Pickup] ' : ''}${generalOrderNotes}`
          : diningDestination === 'COUNTER'
          ? 'Express Counter Pickup'
          : null,
      });

      if (res.success && res.data) {
        setFeedback({
          type: 'success',
          message: `Order #${res.data.orderNumber} sent to the Kitchen & Bar!`,
        });

        // Add to local orders
        const targetTable = tables.find((t) => t.id === effectiveTableId);
        const newLocalOrder: BarOrder = {
          id: res.data.orderId,
          order_number: res.data.orderNumber,
          tab_id: effectiveTabId,
          table_id: effectiveTableId,
          member_id: effectiveMemberId,
          kitchen_status: 'PENDING',
          order_status: 'PROCESSING',
          subtotal: cartSubtotal,
          discount_amount: cartDiscountAmount,
          total_amount: res.data.totalAmount,
          notes: generalOrderNotes || null,
          created_at: new Date().toISOString(),
          bar_tables: targetTable ? { table_number: targetTable.table_number } : null,
          customer_tabs: currentMemberTab ? { tab_number: currentMemberTab.tab_number, guest_name: null } : null,
          bar_order_items: cart.map((c, i) => ({
            id: `temp-${i}`,
            menu_item_id: c.item.id,
            quantity: c.quantity,
            unit_price: c.item.price,
            total_price: c.item.price * c.quantity,
            special_instructions: c.specialInstructions || null,
            menu_items: { name: c.item.name },
          })),
        };

        setOrders([newLocalOrder, ...orders]);
        setCart([]);
        setIsTrayDrawerOpen(false);
        setGeneralOrderNotes('');
        setCurrentTab('MY_ORDERS');
        router.refresh();
      } else {
        setFeedback({
          type: 'error',
          message: !res.success ? res.error : 'Could not place order. Please try again.',
        });
      }
    });
  };

  // Count active orders being prepared
  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => ['PENDING', 'PREPARING', 'READY'].includes(o.kitchen_status)).length;
  }, [orders]);

  return (
    <div className="space-y-6 pb-24">
      {/* LUXURY HERO HEADER */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/30 p-6 md:p-8 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>Clubhouse Lounge & Nutrition Cafeteria</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Fuel Your Game. <span className="text-amber-400">Unwind in Style.</span>
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Artisanal cold brews, revitalizing superfood smoothies, power protein bowls, and gourmet club classics.
              Order directly to your table or collect with fast counter pickup.
            </p>
          </div>

          {/* Member Perk Pill & Staff Switcher */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {activeMember && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 backdrop-blur-md flex items-center gap-3 shadow-lg">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {memberDiscountPercent > 0 ? `${memberDiscountPercent}%` : 'VIP'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {activeMember.profiles?.full_name || 'Valued Member'}
                    </span>
                    <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-300 bg-emerald-500/10">
                      {activeMember.membership_plans?.tier || 'MEMBER'}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-emerald-300/90 mt-0.5">
                    {memberDiscountPercent > 0
                      ? `${memberDiscountPercent}% Member Discount applied automatically`
                      : 'Active Club Membership'}
                  </p>
                </div>
              </div>
            )}

            {isStaffMode && onSwitchToStaffManagement && (
              <Button
                variant="outline"
                size="sm"
                onClick={onSwitchToStaffManagement}
                className="border-zinc-700 hover:bg-zinc-800 text-zinc-200 text-xs gap-1.5"
              >
                <ChefHat className="h-4 w-4 text-amber-400" />
                <span>Floor & KDS Mode</span>
              </Button>
            )}
          </div>
        </div>

        {/* FEEDBACK ALERT */}
        {feedback && (
          <div
            className={`mt-6 p-4 rounded-xl text-xs font-medium border flex items-center justify-between transition-all ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-700 text-emerald-200'
                : 'bg-rose-950/80 border-rose-700 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-zinc-400 hover:text-white ml-2 text-base leading-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* PRIMARY VIEW NAVIGATION TABS */}
        <div className="flex items-center gap-2 sm:gap-4 mt-6 pt-4 border-t border-zinc-800/80">
          <button
            onClick={() => setCurrentTab('MENU')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              currentTab === 'MENU'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                : 'text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800'
            }`}
          >
            <Coffee className="h-4 w-4" />
            <span>Cafeteria Menu</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-black/20 text-current">
              {menuItems.length}
            </span>
          </button>

          <button
            onClick={() => setCurrentTab('MY_ORDERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
              currentTab === 'MY_ORDERS'
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                : 'text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800'
            }`}
          >
            <ChefHat className="h-4 w-4" />
            <span>Order Tracker</span>
            {activeOrdersCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                {activeOrdersCount}
              </span>
            )}
          </button>

          {currentMemberTab && (
            <button
              onClick={() => setCurrentTab('MY_TAB')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                currentTab === 'MY_TAB'
                  ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/25'
                  : 'text-zinc-400 hover:text-white bg-zinc-900/60 hover:bg-zinc-800'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              <span>Active Club Tab</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Open
              </span>
            </button>
          )}

          {/* Cart launcher button */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsTrayDrawerOpen(true)}
              className="relative bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold gap-2 px-4 shadow-lg shadow-emerald-950/40"
            >
              <ShoppingBag className="h-4 w-4" />
              <span className="hidden sm:inline">Order Tray</span>
              {totalCartCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-white text-emerald-800 font-extrabold text-[11px]">
                  {totalCartCount}
                </span>
              )}
              {cartTotalAmount > 0 && (
                <span className="hidden md:inline font-mono border-l border-emerald-400/40 pl-2">
                  {formatCurrency(cartTotalAmount)}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* STAFF CUSTOMER SELECTION BAR (When in staff mode) */}
      {isStaffMode && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-zinc-300">
            <span className="font-bold text-amber-400">Staff Ordering Override:</span>
            <span>Ringing up order for:</span>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={staffSelectedMemberId}
              onChange={(e) => setStaffSelectedMemberId(e.target.value)}
              className="h-8 px-3 rounded-lg border border-zinc-700 bg-zinc-950 text-xs text-zinc-200"
            >
              <option value="">Walk-in Guest (No Member Discount)</option>
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.membership_number} — {m.profiles?.full_name || 'Member'} (
                  {m.membership_plans?.tier || 'MEMBER'} - {m.membership_plans?.bar_discount_percent || 0}% off)
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: CAFETERIA MENU & ORDERING */}
      {/* ========================================================================= */}
      {currentTab === 'MENU' && (
        <div className="space-y-6">
          {/* SEARCH & FILTERS BAR */}
          <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                type="text"
                placeholder="Search menu items, cold brew, wraps, bowls..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-9 bg-zinc-900/80 border-zinc-800 focus:border-amber-500 rounded-xl text-xs h-10 text-white placeholder:text-zinc-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Quick Dietary Filters */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: 'All Dishes' },
                { id: 'PROTEIN', label: '⚡ High Protein' },
                { id: 'VEG', label: '🌱 Pure Vegetarian' },
                { id: 'DRINKS', label: '🥤 Smoothies & Brews' },
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setDietaryFilter(filter.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    dietaryFilter === filter.id
                      ? 'bg-zinc-800 text-amber-400 border border-amber-500/40 font-bold'
                      : 'bg-zinc-900/60 text-zinc-400 border border-zinc-800/80 hover:text-zinc-200'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* CATEGORY TABS PILLS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === 'ALL'
                  ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                  : 'bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Utensils className="h-3.5 w-3.5" />
              <span>All Selections</span>
              <span className="text-[10px] text-zinc-400">({menuItems.length})</span>
            </button>

            {categories.map((cat) => {
              const count = menuItems.filter((m) => m.category_id === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    selectedCategory === cat.id
                      ? 'bg-amber-500/20 border border-amber-500 text-amber-300'
                      : 'bg-zinc-900/80 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  {cat.name.toLowerCase().includes('drink') || cat.name.toLowerCase().includes('bev') ? (
                    <Coffee className="h-3.5 w-3.5" />
                  ) : cat.name.toLowerCase().includes('wrap') || cat.name.toLowerCase().includes('bite') ? (
                    <Leaf className="h-3.5 w-3.5" />
                  ) : (
                    <Utensils className="h-3.5 w-3.5" />
                  )}
                  <span>{cat.name}</span>
                  <span className="text-[10px] text-zinc-400">({count})</span>
                </button>
              );
            })}
          </div>

          {/* MENU ITEMS GRID */}
          {filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-3">
              <Coffee className="h-12 w-12 text-zinc-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No menu items match your search</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Try searching for something else or reset your category and dietary filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setDietaryFilter('ALL');
                }}
                className="text-xs border-zinc-700"
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredItems.map((item) => {
                const cartLine = cart.find((c) => c.item.id === item.id);
                const tag = getItemTag(item);
                const hasDiscount = memberDiscountPercent > 0;
                const discountedPrice = item.price * (1 - memberDiscountPercent / 100);

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-2xl border border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-900/90 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg ${
                      !item.is_available ? 'opacity-50 grayscale' : 'hover:border-amber-500/40 hover:shadow-amber-500/5'
                    }`}
                  >
                    <div>
                      {/* CARD MEDIA / FOOD PHOTO */}
                      <div className="relative w-full aspect-[16/10] overflow-hidden bg-zinc-950">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.image_url}
                            alt={item.name}
                            onError={(e) => {
                              // If image fails to load, hide broken img and display fallback icon
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.parentElement?.querySelector('.bar-item-fallback');
                              if (fallback) (fallback as HTMLElement).style.display = 'flex';
                            }}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                        ) : null}

                        <div
                          className="bar-item-fallback w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-700"
                          style={{ display: item.image_url ? 'none' : 'flex' }}
                        >
                          <Coffee className="h-10 w-10 text-amber-500/40" />
                          <span className="text-[10px] text-zinc-500 font-medium mt-1">Champions Cafeteria</span>
                        </div>

                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />

                        {/* Top Category Tag */}
                        <div className="absolute top-2.5 left-2.5">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-black/70 text-zinc-300 backdrop-blur-md border border-white/10">
                            {item.menu_categories?.name || 'Lounge Special'}
                          </span>
                        </div>

                        {/* Dietary Badge */}
                        {tag && (
                          <div className="absolute top-2.5 right-2.5">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/90 text-black backdrop-blur-md flex items-center gap-1 shadow">
                              {tag.label}
                            </span>
                          </div>
                        )}

                        {!item.is_available && (
                          <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                            <span className="px-3 py-1 rounded-md text-xs font-bold bg-rose-600 text-white uppercase tracking-wider">
                              Sold Out
                            </span>
                          </div>
                        )}
                      </div>

                      {/* CARD CONTENT */}
                      <div className="p-4 space-y-1.5">
                        <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* CARD FOOTER & QUICK ORDERING */}
                    <div className="p-4 pt-0">
                      <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                        {/* Price Breakdown */}
                        <div>
                          {hasDiscount ? (
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-zinc-500 line-through font-mono">
                                  {formatCurrency(item.price)}
                                </span>
                                <span className="text-xs font-bold text-emerald-400">
                                  -{memberDiscountPercent}%
                                </span>
                              </div>
                              <span className="text-base font-extrabold text-white font-mono tracking-tight">
                                {formatCurrency(discountedPrice)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-base font-extrabold text-white font-mono">
                              {formatCurrency(item.price)}
                            </span>
                          )}
                        </div>

                        {/* Interactive Quantity Stepper or Add Button */}
                        <div>
                          {!item.is_available ? (
                            <span className="text-[11px] text-zinc-500 font-medium">Unavailable</span>
                          ) : cartLine ? (
                            <div className="inline-flex items-center rounded-xl bg-zinc-800 border border-zinc-700 p-0.5">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center text-xs font-bold text-white">
                                {cartLine.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="h-7 w-7 rounded-lg flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() => addToCart(item)}
                              className="h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs gap-1 shadow-md shadow-amber-500/10 transition-all hover:scale-105 active:scale-95"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span>Add</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: ORDER TRACKER & LIVE KITCHEN STATUS */}
      {/* ========================================================================= */}
      {currentTab === 'MY_ORDERS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ChefHat className="h-5 w-5 text-amber-400" />
                <span>Live Cafeteria & Kitchen Orders</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Track food & drink preparation in real time from our kitchen display.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
              className="text-xs border-zinc-700 hover:bg-zinc-800 text-zinc-300 gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh Status</span>
            </Button>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-4">
              <ShoppingBag className="h-12 w-12 text-zinc-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No recent cafeteria orders</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Ready to fuel up? Explore our freshly roasted coffees, cold brews, wraps, and recovery smoothies.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => setCurrentTab('MENU')}
                className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
              >
                Browse Cafeteria Menu
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isPendingStage = order.kitchen_status === 'PENDING';
                const isPreparing = order.kitchen_status === 'PREPARING';
                const isReady = order.kitchen_status === 'READY';
                const isServed = order.kitchen_status === 'SERVED';

                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl border p-5 transition-all space-y-4 ${
                      isReady
                        ? 'border-emerald-500/60 bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-950 shadow-xl shadow-emerald-950/30'
                        : isPreparing
                        ? 'border-amber-500/50 bg-gradient-to-r from-amber-950/30 via-zinc-900 to-zinc-950'
                        : 'border-zinc-800 bg-zinc-900/60'
                    }`}
                  >
                    {/* ORDER HEADER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800/80">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white tracking-wide">
                            {order.order_number}
                          </span>
                          <span className="text-xs text-zinc-400">
                            • {formatDateTime(order.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          {order.bar_tables ? (
                            <span className="flex items-center gap-1 text-amber-300 font-medium">
                              <Armchair className="h-3.5 w-3.5" />
                              <span>Table {order.bar_tables.table_number}</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-sky-300 font-medium">
                              <Footprints className="h-3.5 w-3.5" />
                              <span>Express Counter Pickup</span>
                            </span>
                          )}
                          {order.customer_tabs && (
                            <span className="text-zinc-500">
                              (Tab #{order.customer_tabs.tab_number})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* STAGE BADGE */}
                      <div>
                        {isReady ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500 text-black text-xs font-black animate-bounce shadow-lg">
                            <Bell className="h-4 w-4" />
                            <span>READY FOR PICKUP</span>
                          </div>
                        ) : isPreparing ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
                            <Flame className="h-3.5 w-3.5 animate-pulse text-amber-400" />
                            <span>In Preparation by Barista / Chef</span>
                          </div>
                        ) : isPendingStage ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-medium">
                            <Clock className="h-3.5 w-3.5 text-zinc-400" />
                            <span>Order Received in Kitchen</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-800/60 text-zinc-400 text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Served & Completed</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* VISUAL KITCHEN PROGRESS TIMELINE */}
                    <div className="relative pt-2 pb-2">
                      <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-medium">
                        {/* Step 1: Received */}
                        <div className="space-y-1.5">
                          <div className={`h-1.5 rounded-full ${isPendingStage || isPreparing || isReady || isServed ? 'bg-amber-400' : 'bg-zinc-800'}`} />
                          <span className={isPendingStage ? 'text-amber-300 font-bold' : 'text-zinc-400'}>
                            1. Received
                          </span>
                        </div>

                        {/* Step 2: Preparing */}
                        <div className="space-y-1.5">
                          <div className={`h-1.5 rounded-full ${isPreparing || isReady || isServed ? 'bg-amber-400' : 'bg-zinc-800'}`} />
                          <span className={isPreparing ? 'text-amber-300 font-bold' : 'text-zinc-400'}>
                            2. Preparing
                          </span>
                        </div>

                        {/* Step 3: Ready */}
                        <div className="space-y-1.5">
                          <div className={`h-1.5 rounded-full ${isReady || isServed ? 'bg-emerald-400' : 'bg-zinc-800'}`} />
                          <span className={isReady ? 'text-emerald-300 font-bold' : 'text-zinc-400'}>
                            3. Ready
                          </span>
                        </div>

                        {/* Step 4: Served */}
                        <div className="space-y-1.5">
                          <div className={`h-1.5 rounded-full ${isServed ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
                          <span className={isServed ? 'text-zinc-300 font-bold' : 'text-zinc-500'}>
                            4. Served
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ITEMS LIST */}
                    <div className="bg-zinc-950/60 rounded-xl p-3 border border-zinc-800/80 space-y-2">
                      <div className="space-y-1.5">
                        {order.bar_order_items?.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between text-xs text-zinc-300"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-amber-400 w-5">
                                {item.quantity}x
                              </span>
                              <span>{item.menu_items?.name || 'Menu item'}</span>
                              {item.special_instructions && (
                                <span className="text-[11px] text-zinc-500 italic">
                                  ({item.special_instructions})
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-zinc-400">
                              {formatCurrency(item.total_price)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {order.notes && (
                        <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-amber-300/80 flex items-center gap-1.5">
                          <Info className="h-3 w-3 shrink-0" />
                          <span>Notes: {order.notes}</span>
                        </div>
                      )}
                    </div>

                    {/* TOTAL BILL FOOTER */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <span className="text-zinc-400">
                        {order.discount_amount > 0 ? (
                          <span>
                            Discount:{' '}
                            <span className="text-emerald-400 font-mono">
                              -{formatCurrency(order.discount_amount)}
                            </span>
                          </span>
                        ) : (
                          'Standard Pricing'
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-400">Total:</span>
                        <span className="text-base font-bold text-white font-mono">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: ACTIVE CLUB TAB */}
      {/* ========================================================================= */}
      {currentTab === 'MY_TAB' && currentMemberTab && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-950 p-6 md:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-white">
                    Member Tab #{currentMemberTab.tab_number || 'OPEN'}
                  </h2>
                  <Badge variant="success" className="text-xs">
                    ACTIVE
                  </Badge>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Opened on {formatDateTime(currentMemberTab.opened_at)}
                  {currentMemberTab.bar_tables && ` • Linked to Table ${currentMemberTab.bar_tables.table_number}`}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-zinc-400 block">Tab Running Balance</span>
                <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                  {formatCurrency(
                    currentMemberTab.bar_orders
                      ?.filter((o) => o.order_status !== 'CANCELLED')
                      .reduce((s, o) => s + Number(o.total_amount), 0) ?? 0
                  )}
                </span>
              </div>
            </div>

            {/* Credit Limit Progress */}
            <div className="space-y-2 bg-zinc-950/70 p-4 rounded-xl border border-zinc-800">
              <div className="flex justify-between text-xs text-zinc-400">
                <span>Credit Authorization Limit</span>
                <span className="font-mono text-zinc-200">
                  {formatCurrency(currentMemberTab.credit_limit)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      (((currentMemberTab.bar_orders
                        ?.filter((o) => o.order_status !== 'CANCELLED')
                        .reduce((s, o) => s + Number(o.total_amount), 0) ?? 0) /
                        (currentMemberTab.credit_limit || 2000)) *
                        100)
                    )}%`,
                  }}
                />
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              💡 Any orders you place with &quot;Charge to My Tab&quot; are automatically batched into this running ledger.
              You can settle your tab conveniently at the clubhouse front desk or bar register upon leaving.
            </p>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING ORDER TRAY LAUNCHER (BOTTOM BAR) */}
      {/* ========================================================================= */}
      {totalCartCount > 0 && !isTrayDrawerOpen && (
        <div className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto z-40 animate-in fade-in slide-in-from-bottom-6">
          <div className="rounded-2xl border border-amber-500/40 bg-zinc-950/90 backdrop-blur-xl p-3.5 shadow-2xl shadow-black flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center text-black font-extrabold shadow-md">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-white text-black font-black text-[11px] flex items-center justify-center border-2 border-zinc-950">
                  {totalCartCount}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-extrabold text-white">Your Order Tray</span>
                  {memberDiscountPercent > 0 && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      -{memberDiscountPercent}% Applied
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-extrabold text-amber-400 font-mono">
                    {formatCurrency(cartTotalAmount)}
                  </span>
                  {cartDiscountAmount > 0 && (
                    <span className="text-zinc-500 line-through text-[11px] font-mono">
                      {formatCurrency(cartSubtotal)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={() => setIsTrayDrawerOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-5 h-10 rounded-xl gap-1 shadow-lg shadow-amber-500/20"
            >
              <span>Review & Place Order</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OUT ORDER TRAY DRAWER (CHECKOUT MODAL) */}
      {/* ========================================================================= */}
      {isTrayDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-zinc-950 border-l border-zinc-800 h-full flex flex-col justify-between overflow-hidden shadow-2xl animate-in slide-in-from-right duration-300">
            {/* DRAWER HEADER */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5 text-amber-400" />
                <div>
                  <h2 className="text-base font-bold text-white">Your Cafeteria Order</h2>
                  <p className="text-xs text-zinc-400">
                    {totalCartCount} {totalCartCount === 1 ? 'item' : 'items'} in tray
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTrayDrawerOpen(false)}
                className="h-8 w-8 rounded-lg bg-zinc-800/80 text-zinc-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* DRAWER BODY (SCROLLABLE) */}
            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {/* 1. DINING DESTINATION SELECTOR */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                  1. How would you like to receive your order?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDiningDestination('COUNTER')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      diningDestination === 'COUNTER'
                        ? 'border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/5'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Footprints
                        className={`h-4 w-4 ${
                          diningDestination === 'COUNTER' ? 'text-amber-400' : 'text-zinc-400'
                        }`}
                      />
                      <span className="text-xs font-bold">Express Counter</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Pick up directly at bar counter when called
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDiningDestination('TABLE')}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      diningDestination === 'TABLE'
                        ? 'border-amber-500 bg-amber-500/10 text-white shadow-md shadow-amber-500/5'
                        : 'border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Armchair
                        className={`h-4 w-4 ${
                          diningDestination === 'TABLE' ? 'text-amber-400' : 'text-zinc-400'
                        }`}
                      />
                      <span className="text-xs font-bold">Table Service</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Delivered hot & fresh to your table
                    </p>
                  </button>
                </div>

                {/* Table Picker (when Table Service is selected) */}
                {diningDestination === 'TABLE' && (
                  <div className="pt-2 animate-in fade-in">
                    <label className="text-xs font-semibold text-zinc-300 block mb-1.5">
                      Select Your Floor Table:
                    </label>
                    <select
                      value={selectedTableId}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-zinc-700 bg-zinc-900 text-xs text-white focus:border-amber-500"
                    >
                      <option value="">Choose a table...</option>
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.table_number} ({t.capacity} seats) — {t.status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. ORDER ITEMS LIST */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    2. Selected Items
                  </label>
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] text-zinc-500 hover:text-rose-400 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear all</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {cart.map((line) => (
                    <div
                      key={line.item.id}
                      className="rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-3 space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {line.item.image_url && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={line.item.image_url}
                              alt={line.item.name}
                              onError={(e) => {
                                const target = e.currentTarget as HTMLImageElement;
                                target.style.display = 'none';
                                const fb = target.parentElement?.querySelector('.bar-cart-fallback') as HTMLElement;
                                if (fb) fb.style.display = 'flex';
                              }}
                              className="h-10 w-10 rounded-lg object-cover bg-zinc-950 shrink-0"
                            />
                          )}
                          <div
                            className="bar-cart-fallback h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0"
                            style={{ display: line.item.image_url ? 'none' : 'flex' }}
                          >
                            <Coffee className="h-5 w-5 text-zinc-500" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white line-clamp-1">
                              {line.item.name}
                            </h4>
                            <span className="text-[11px] font-mono text-zinc-400">
                              {formatCurrency(line.item.price)} each
                            </span>
                          </div>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center rounded-lg bg-zinc-800 border border-zinc-700 p-0.5">
                            <button
                              onClick={() => updateQuantity(line.item.id, -1)}
                              className="h-6 w-6 rounded flex items-center justify-center text-zinc-300 hover:text-white"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-bold text-white">
                              {line.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(line.item.id, 1)}
                              className="h-6 w-6 rounded flex items-center justify-center text-zinc-300 hover:text-white"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <button
                            onClick={() => removeItem(line.item.id)}
                            className="text-zinc-500 hover:text-rose-400 p-1"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Special instructions field */}
                      <Input
                        type="text"
                        placeholder="Special request: e.g. oat milk, less spicy, extra ice..."
                        value={line.specialInstructions}
                        onChange={(e) => updateInstructions(line.item.id, e.target.value)}
                        className="h-7 text-[11px] bg-zinc-950/80 border-zinc-800 rounded-lg text-zinc-300 placeholder:text-zinc-600"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. PAYMENT METHOD */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                  3. Settlement Preference
                </label>
                {currentMemberTab ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setUseTabPayment(true)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                        useTabPayment
                          ? 'border-emerald-500 bg-emerald-950/30 text-white'
                          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <CreditCard className="h-4 w-4 text-emerald-400" />
                        <div>
                          <span className="text-xs font-bold block text-white">
                            Charge to Active Tab #{currentMemberTab.tab_number || 'OPEN'}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            Running balance will update automatically
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">Recommended</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setUseTabPayment(false)}
                      className={`w-full p-3 rounded-xl border text-left flex items-center justify-between cursor-pointer ${
                        !useTabPayment
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-zinc-800 bg-zinc-900/40 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag className="h-4 w-4 text-amber-400" />
                        <div>
                          <span className="text-xs font-bold block text-white">
                            Pay upon Pickup / Service
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            Cash, UPI, or Card at the bar counter
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 text-xs text-zinc-300 flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Pay at the bar counter upon pickup (Cash, Card, or UPI)</span>
                  </div>
                )}
              </div>

              {/* General Order Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-400">
                  Kitchen Notes / Dietary Remarks (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Please bring glasses with water, allergy to peanuts..."
                  value={generalOrderNotes}
                  onChange={(e) => setGeneralOrderNotes(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs rounded-xl h-9 text-white placeholder:text-zinc-600"
                />
              </div>

              {/* 4. BILL BREAKDOWN */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Subtotal ({totalCartCount} items)</span>
                  <span className="font-mono text-zinc-200">{formatCurrency(cartSubtotal)}</span>
                </div>

                {memberDiscountPercent > 0 && (
                  <div className="flex justify-between text-xs text-emerald-400 font-medium">
                    <span>
                      {activeMember?.membership_plans?.tier || 'Member'} Discount (-{memberDiscountPercent}%)
                    </span>
                    <span className="font-mono">-{formatCurrency(cartDiscountAmount)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-zinc-800 flex justify-between text-sm font-extrabold text-white">
                  <span>Total Amount Due</span>
                  <span className="font-mono text-base text-amber-400">
                    {formatCurrency(cartTotalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* DRAWER FOOTER / SUBMIT BUTTON */}
            <div className="p-5 border-t border-zinc-800 bg-zinc-900/80 space-y-3">
              <Button
                variant="primary"
                onClick={handleCheckoutOrder}
                disabled={isPending || cart.length === 0}
                className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-sm gap-2 shadow-xl shadow-amber-500/20 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Sending to Kitchen & Bar...</span>
                  </>
                ) : (
                  <>
                    <ChefHat className="h-5 w-5" />
                    <span>Send Order to Kitchen ({formatCurrency(cartTotalAmount)})</span>
                  </>
                )}
              </Button>
              <p className="text-[11px] text-center text-zinc-500">
                Tickets are transmitted instantly to the kitchen display screen.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

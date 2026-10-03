'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/utils';
import { createShopOrderAction } from '@/actions/shop';
import type { PortalProduct, PortalCategory } from '@/types/shared';
import {
  ShoppingBag,
  Package,
  Search,
  Truck,
  Store,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Zap,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Tag,
  X,
  Filter,
  CreditCard,
  Clock,
  Coffee,
  CheckCircle,
  Receipt,
  RotateCcw,
  Loader2,
  ChevronRight,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

export interface MemberProShopProps {
  products: PortalProduct[];
  categories: PortalCategory[];
  member?: {
    id?: string;
    membership_number?: string;
    status?: string;
    profiles?: {
      full_name?: string | null;
      email?: string | null;
      phone?: string | null;
    } | null;
    membership_plans?: {
      name?: string | null;
      tier?: string | null;
      shop_discount_percent?: number | null;
    } | null;
  } | null;
  initialOrders?: Array<{
    id: string;
    order_number: string;
    channel: string;
    total_amount: number;
    status: string;
    payment_status?: string;
    created_at: string;
    items_count?: number;
    items_summary?: string;
    shop_order_items?: Array<{
      quantity: number;
      unit_price: number;
      total_price: number;
      products?: { name: string; sku?: string } | null;
    }>;
  }>;
  customerTabs?: Array<{
    id: string;
    tab_number: string;
    credit_limit: number;
    current_balance: number;
    status: string;
    opened_at: string;
  }>;
  isStandalonePage?: boolean;
}

export function MemberProShop({
  products = [],
  categories = [],
  member,
  initialOrders = [],
  customerTabs = [],
  isStandalonePage = false,
}: MemberProShopProps) {
  const router = useRouter();

  // Internal Sub-navigation: 'CATALOG' | 'ORDERS' | 'TAB'
  const [subTab, setSubTab] = useState<'CATALOG' | 'ORDERS' | 'TAB'>('CATALOG');

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Cart & Checkout Drawer State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<Array<{ product: PortalProduct; quantity: number }>>([]);
  const [fulfillmentType, setFulfillmentType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [customerName, setCustomerName] = useState(member?.profiles?.full_name || '');
  const [customerPhone, setCustomerPhone] = useState(member?.profiles?.phone || '');
  const [customerEmail, setCustomerEmail] = useState(member?.profiles?.email || '');

  // Keep member details in sync
  useEffect(() => {
    if (member?.profiles) {
      if (!customerName && member.profiles.full_name) setCustomerName(member.profiles.full_name);
      if (!customerPhone && member.profiles.phone) setCustomerPhone(member.profiles.phone);
      if (!customerEmail && member.profiles.email) setCustomerEmail(member.profiles.email);
    }
  }, [member, customerName, customerPhone, customerEmail]);

  // Orders State (allows immediate local updates after ordering)
  const [orders, setOrders] = useState(initialOrders);
  const [orderFilter, setOrderFilter] = useState<'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'CANCELLED'>('ALL');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{
    orderNumber: string;
    fulfillment: 'PICKUP' | 'DELIVERY';
    total: number;
    savings: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tier & Discount Calculations
  const tier = member?.membership_plans?.tier || 'STANDARD';
  const discountPercent = Number(member?.membership_plans?.shop_discount_percent ?? 15);
  const discountMultiplier = Math.max(0, (100 - discountPercent) / 100);

  // Close Cart on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isCartOpen) {
        setIsCartOpen(false);
      }
    };
    if (isCartOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCartOpen]);

  // Cart operations
  const getItemQuantity = (productId: string) => {
    return cart.find((i) => i.product.id === productId)?.quantity || 0;
  };

  const addToCart = (product: PortalProduct, delta = 1) => {
    const stockAvailable = product.inventory?.quantity_on_hand ?? 99;
    const existing = cart.find((i) => i.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;
    const newQty = currentQtyInCart + delta;

    if (newQty > stockAvailable) {
      alert(`Only ${stockAvailable} items available in stock for ${product.name}.`);
      return;
    }

    if (existing) {
      if (newQty <= 0) {
        setCart(cart.filter((i) => i.product.id !== product.id));
      } else {
        setCart(cart.map((i) => (i.product.id === product.id ? { ...i, quantity: newQty } : i)));
      }
    } else if (delta > 0) {
      setCart([...cart, { product, quantity: delta }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  // Pricing summary
  const retailSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const memberSavings = useMemo(() => {
    return Math.round(retailSubtotal * (discountPercent / 100));
  }, [retailSubtotal, discountPercent]);

  const finalTotal = retailSubtotal - memberSavings;
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesSearch =
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          p.sku.toLowerCase().includes(search.toLowerCase()) ||
          (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

        const matchesCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory;
        const stock = p.inventory?.quantity_on_hand ?? 0;
        const matchesStock = !inStockOnly || stock > 0;

        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.price - b.price;
        if (sortBy === 'price-desc') return b.price - a.price;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        return 0; // featured default
      });
  }, [products, search, selectedCategory, inStockOnly, sortBy]);

  // Featured Spotlight Products (e.g. top 3 in-stock items with highest value)
  const spotlightProducts = useMemo(() => {
    return products
      .filter((p) => (p.inventory?.quantity_on_hand ?? 0) > 0)
      .slice(0, 3);
  }, [products]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderFilter === 'ALL') return true;
      if (orderFilter === 'COMPLETED') return o.status === 'COMPLETED' || o.status === 'DELIVERED';
      if (orderFilter === 'CANCELLED') return o.status === 'CANCELLED';
      if (orderFilter === 'IN_PROGRESS') {
        return ['PENDING', 'PROCESSING', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP'].includes(
          o.status
        );
      }
      return true;
    });
  }, [orders, orderFilter]);

  // Handle Order Placement
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!customerPhone.trim()) {
      setErrorMessage('Please provide a contact phone number for your order.');
      return;
    }

    if (fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
      setErrorMessage('Please enter a delivery address for home delivery.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await createShopOrderAction({
      orderChannel: 'ONLINE',
      fulfillmentType,
      memberId: member?.id || null,
      customerName: customerName.trim() || member?.profiles?.full_name || 'Valued Member',
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || member?.profiles?.email || null,
      deliveryAddress: fulfillmentType === 'DELIVERY' ? deliveryAddress.trim() : null,
      notes: orderNotes.trim() || null,
      items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
    });

    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Failed to place your order. Please try again.');
      return;
    }

    const placedOrderNumber = res.data.orderNumber;
    const orderSummaryText = cart
      .slice(0, 2)
      .map((it) => `${it.quantity}x ${it.product.name}`)
      .join(', ') + (cart.length > 2 ? ` (+${cart.length - 2} more)` : '');

    // Add to local state
    const newOrderRecord = {
      id: res.data.orderId,
      order_number: placedOrderNumber,
      channel: 'ONLINE',
      total_amount: finalTotal,
      status: 'PROCESSING',
      payment_status: 'PAID',
      created_at: new Date().toISOString(),
      items_count: totalCartCount,
      items_summary: orderSummaryText,
    };

    setOrders([newOrderRecord, ...orders]);
    setOrderSuccess({
      orderNumber: placedOrderNumber,
      fulfillment: fulfillmentType,
      total: finalTotal,
      savings: memberSavings,
    });
    setCart([]);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      {/* 1. VIP MEMBER BENEFIT & HERO BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-teal-950/60 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-teal-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Champions Pro Shop</span>
              </span>
              <Badge
                variant={tier === 'GOLD' ? 'gold' : tier === 'SILVER' ? 'silver' : 'outline'}
                className="font-bold tracking-wider uppercase text-[11px]"
              >
                {tier} MEMBER PRIVILEGE
              </Badge>
              {member?.membership_number && (
                <span className="text-xs font-mono text-zinc-400">
                  #{member.membership_number}
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
              Official Club Pro Shop &amp;{' '}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">
                {discountPercent}% Member Discount
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Order tournament-grade rackets, balls, footwear &amp; apparel. Your exclusive{' '}
              <strong className="text-emerald-300 font-semibold">{discountPercent}% member discount</strong> is
              automatically calculated on all items with express 30-minute front desk collection.
            </p>

            {/* Quick Feature Perks */}
            <div className="pt-1 flex flex-wrap items-center gap-4 text-xs font-medium text-zinc-300">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>100% Genuine Match Gear</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Store className="h-4 w-4 text-emerald-400" />
                <span>30-Min Reception Pickup</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="h-4 w-4 text-emerald-400" />
                <span>Express Home Delivery</span>
              </div>
            </div>
          </div>

          {/* Cart & Quick Actions Box */}
          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setIsCartOpen(true)}
              className="relative gap-2.5 px-6 shadow-xl shadow-emerald-950/60 font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 border border-emerald-400/30"
            >
              <ShoppingBag className="h-5 w-5" />
              <span>View Shopping Cart</span>
              {totalCartCount > 0 && (
                <span className="flex items-center justify-center h-6 min-w-6 px-1.5 rounded-full bg-white text-emerald-950 text-xs font-black shadow-md">
                  {totalCartCount}
                </span>
              )}
            </Button>

            {totalCartCount > 0 && (
              <div className="text-center lg:text-right">
                <p className="text-[11px] text-zinc-400">
                  Cart Subtotal:{' '}
                  <span className="font-mono font-bold text-emerald-300 text-sm">
                    {formatCurrency(finalTotal)}
                  </span>
                </p>
                <p className="text-[10px] text-emerald-400 font-medium">
                  Includes {formatCurrency(memberSavings)} savings
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. SUB-SECTION NAVIGATION TABS */}
      <div className="flex flex-wrap items-center justify-between border-b border-zinc-800 pb-3 gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0" role="tablist">
          <button
            role="tab"
            aria-selected={subTab === 'CATALOG'}
            onClick={() => setSubTab('CATALOG')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              subTab === 'CATALOG'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Equipment &amp; Apparel</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono">
              {products.length}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={subTab === 'ORDERS'}
            onClick={() => setSubTab('ORDERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              subTab === 'ORDERS'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>My Orders &amp; Receipts</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/40 font-mono">
              {orders.length}
            </span>
          </button>

          <button
            role="tab"
            aria-selected={subTab === 'TAB'}
            onClick={() => setSubTab('TAB')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
              subTab === 'TAB'
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            <Coffee className="h-4 w-4" />
            <span>Cafeteria &amp; Club Tab</span>
            {customerTabs.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Mini quick cart launcher button */}
        {totalCartCount > 0 && subTab !== 'CATALOG' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsCartOpen(true)}
            className="text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 gap-1.5"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Cart ({totalCartCount}) • {formatCurrency(finalTotal)}</span>
          </Button>
        )}
      </div>

      {/* 3. VIEW A: PRO SHOP CATALOG & BUYING EXPERIENCE */}
      {subTab === 'CATALOG' && (
        <div className="space-y-6">
          {/* Spotlight Recommended Equipment Row */}
          {spotlightProducts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white tracking-wide uppercase">
                    Featured Member Deals &amp; Essentials
                  </h3>
                </div>
                <span className="text-xs text-zinc-400 font-medium hidden sm:inline">
                  Instant 1-Click Ordering
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {spotlightProducts.map((p) => {
                  const memberPrice = Math.round(p.price * discountMultiplier);
                  const savings = p.price - memberPrice;
                  const inCartQty = getItemQuantity(p.id);

                  return (
                    <div
                      key={p.id}
                      className="group relative rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 hover:border-emerald-500/50 hover:bg-zinc-900/90 transition-all duration-300 flex items-center gap-3.5 shadow-lg"
                    >
                      <div className="relative h-16 w-16 rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                        {p.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-zinc-600">
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                        )}
                        <span className="absolute top-1 left-1 bg-emerald-500 text-[9px] font-black text-white px-1 rounded">
                          -{discountPercent}%
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="text-xs font-bold text-white truncate group-hover:text-emerald-300 transition-colors">
                          {p.name}
                        </h4>
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-extrabold text-emerald-400 font-mono">
                            {formatCurrency(memberPrice)}
                          </span>
                          <span className="text-[10px] text-zinc-500 line-through font-mono">
                            {formatCurrency(p.price)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-0.5">
                          <span className="text-[10px] text-emerald-500 font-medium">
                            Save {formatCurrency(savings)}
                          </span>
                          {inCartQty > 0 ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                              {inCartQty} in cart
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                addToCart(p, 1);
                                setIsCartOpen(true);
                              }}
                              className="text-[11px] font-bold text-emerald-400 hover:text-white hover:underline flex items-center gap-1 cursor-pointer"
                            >
                              <span>Buy Now</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Catalog Controls: Categories, Search, Filters */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80 backdrop-blur-md shadow-md">
              {/* Category Pills Bar */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    selectedCategory === 'ALL'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                      : 'bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800 border border-zinc-800/60'
                  }`}
                >
                  <span>All Gear</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono font-bold">
                    {products.length}
                  </span>
                </button>

                {categories.map((c) => {
                  const count = products.filter((p) => p.category_id === c.id).length;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCategory(c.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                        selectedCategory === c.id
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                          : 'bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800 border border-zinc-800/60'
                      }`}
                    >
                      <span>{c.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono font-bold">
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search, Sort & Stock Toggles */}
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 sm:w-60">
                  <Search className="h-3.5 w-3.5 text-zinc-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Search equipment, gear..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 bg-zinc-950/80 border-zinc-800 text-xs h-8 focus-visible:ring-emerald-500"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-zinc-950/80 border border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer h-8"
                >
                  <option value="featured">Sort: Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Name: A-Z</option>
                </select>

                <button
                  onClick={() => setInStockOnly(!inStockOnly)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 h-8 cursor-pointer ${
                    inStockOnly
                      ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 font-semibold'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Filter className="h-3 w-3" />
                  <span>In-Stock</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((prod) => {
              const stock = prod.inventory?.quantity_on_hand ?? 0;
              const isOutOfStock = stock <= 0;
              const isLowStock = stock > 0 && stock <= prod.low_stock_threshold;
              const qtyInCart = getItemQuantity(prod.id);
              const memberPrice = Math.round(prod.price * discountMultiplier);
              const savings = prod.price - memberPrice;

              return (
                <Card
                  key={prod.id}
                  className="border-zinc-800/80 bg-zinc-900/60 flex flex-col justify-between hover:border-emerald-500/50 hover:bg-zinc-900/80 transition-all duration-300 shadow-xl group rounded-2xl overflow-hidden"
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-400 border-emerald-500/30 font-medium"
                      >
                        {prod.product_categories?.name || 'Athletic Gear'}
                      </Badge>
                      <span className="text-[10px] font-mono text-zinc-500">{prod.sku}</span>
                    </div>

                    {/* Image Container with Zoom & Overlays */}
                    <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                      {prod.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center p-6 text-zinc-600">
                          <ShoppingBag className="h-12 w-12 stroke-[1.5]" />
                          <span className="text-[11px] mt-2 font-medium">Champions Gear</span>
                        </div>
                      )}

                      {/* Member Discount Pill Overlay */}
                      <div className="absolute top-2.5 left-2.5 bg-emerald-500/95 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-lg backdrop-blur-md flex items-center gap-1">
                        <Zap className="h-3 w-3 fill-current" />
                        <span>Save {discountPercent}%</span>
                      </div>

                      {/* Stock Indicator Overlay */}
                      <div className="absolute bottom-2.5 right-2.5">
                        {isOutOfStock ? (
                          <span className="bg-rose-950/95 text-rose-300 border border-rose-800/80 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1 shadow-md">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Sold Out</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="bg-amber-950/95 text-amber-300 border border-amber-800/80 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1 shadow-md">
                            <span>Only {stock} Left</span>
                          </span>
                        ) : (
                          <span className="bg-zinc-950/90 text-emerald-400 border border-emerald-500/40 text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-md flex items-center gap-1 shadow-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>In Stock</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <CardTitle className="text-sm sm:text-base text-white mt-3 group-hover:text-emerald-300 transition-colors line-clamp-1 font-bold">
                      {prod.name}
                    </CardTitle>
                    <CardDescription className="text-xs text-zinc-400 line-clamp-2 mt-1 min-h-[2rem]">
                      {prod.description || 'Championship-grade athletic equipment crafted for club members.'}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="p-4 pt-0 space-y-3">
                    {/* Price Breakdown Box */}
                    <div className="p-2.5 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Retail Price:</span>
                        <span className="line-through text-zinc-500 font-mono">
                          {formatCurrency(prod.price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Member Price:
                        </span>
                        <div className="text-right">
                          <span className="text-base sm:text-lg font-black text-white font-mono">
                            {formatCurrency(memberPrice)}
                          </span>
                        </div>
                      </div>
                      <div className="text-[10px] text-emerald-400 font-medium text-right">
                        You save {formatCurrency(savings)}
                      </div>
                    </div>

                    {/* Quantity Controller & Buy Buttons */}
                    {isOutOfStock ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="w-full text-xs text-zinc-500 border-zinc-800"
                      >
                        Currently Unavailable
                      </Button>
                    ) : qtyInCart > 0 ? (
                      <div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                        <button
                          onClick={() => addToCart(prod, -1)}
                          className="h-7 w-7 rounded-lg bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <div className="text-center font-bold text-white text-xs">
                          <span className="font-mono text-emerald-400 text-sm">{qtyInCart}</span> in cart
                        </div>
                        <button
                          onClick={() => addToCart(prod, 1)}
                          className="h-7 w-7 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 flex items-center justify-center font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          className="col-span-3 gap-1.5 text-xs font-semibold shadow-md shadow-emerald-950/40"
                          onClick={() => addToCart(prod, 1)}
                        >
                          <ShoppingBag className="h-3.5 w-3.5" />
                          <span>Add to Cart</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="col-span-2 text-xs font-medium border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                          onClick={() => {
                            addToCart(prod, 1);
                            setIsCartOpen(true);
                          }}
                        >
                          Buy Now
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Empty Results State */}
          {filteredProducts.length === 0 && (
            <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-400 space-y-3">
              <ShoppingBag className="h-12 w-12 mx-auto text-zinc-600" />
              <p className="text-base font-medium text-white">
                No equipment found matching &ldquo;{search}&rdquo;.
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Try selecting a different category or clearing your current search term.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSelectedCategory('ALL');
                  setInStockOnly(false);
                }}
                className="text-xs text-emerald-400 border-zinc-700"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 4. VIEW B: MY ORDERS & RECEIPT ARCHIVE */}
      {subTab === 'ORDERS' && (
        <div className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-400" />
                  <CardTitle className="text-base text-white">My Pro Shop Order History</CardTitle>
                </div>
                <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {(['ALL', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setOrderFilter(filter)}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        orderFilter === filter
                          ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {filter === 'ALL'
                        ? 'All'
                        : filter === 'IN_PROGRESS'
                        ? 'In Progress'
                        : filter === 'COMPLETED'
                        ? 'Completed'
                        : 'Cancelled'}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4">
              {filteredOrders.length > 0 ? (
                <div className="space-y-3">
                  {filteredOrders.map((order) => {
                    const isCompleted =
                      order.status === 'COMPLETED' || order.status === 'DELIVERED';
                    const isCancelled = order.status === 'CANCELLED';
                    const isReady = order.status === 'READY_FOR_PICKUP';

                    return (
                      <div
                        key={order.id}
                        className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-bold text-emerald-400 text-sm">
                              {order.order_number}
                            </span>
                            <Badge
                              variant={
                                isCompleted
                                  ? 'success'
                                  : isCancelled
                                  ? 'destructive'
                                  : isReady
                                  ? 'warning'
                                  : 'outline'
                              }
                              className="text-[10px] uppercase font-bold"
                            >
                              {order.status.replace(/_/g, ' ')}
                            </Badge>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              • {formatDate(order.created_at)}
                            </span>
                          </div>

                          <p className="text-xs text-zinc-300 font-medium line-clamp-1">
                            {order.items_summary}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-400 font-mono">
                            <span>Channel: {order.channel}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">
                              Payment: {order.payment_status || 'PAID'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 self-end md:self-center shrink-0">
                          <div className="text-right">
                            <span className="text-xs text-zinc-400 block">Total Amount</span>
                            <span className="text-base font-mono font-black text-white">
                              {formatCurrency(order.total_amount)}
                            </span>
                          </div>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSubTab('CATALOG');
                            }}
                            className="text-xs border-zinc-700 hover:bg-zinc-800 gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Shop Again</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-zinc-500 text-xs space-y-2">
                  <Package className="h-10 w-10 mx-auto text-zinc-600" />
                  <p className="text-sm font-medium text-white">No shop orders found.</p>
                  <p className="text-zinc-500 max-w-xs mx-auto">
                    Browse our equipment catalog to gear up for your next match at exclusive member rates.
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setSubTab('CATALOG')}
                    className="text-xs mt-2"
                  >
                    Start Shopping
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 5. VIEW C: CAFETERIA TAB & CLUB BAR CREDIT */}
      {subTab === 'TAB' && (
        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="pb-3 border-b border-zinc-800/80">
              <div className="flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-400" />
                <CardTitle className="text-base text-white">Clubhouse Cafeteria &amp; Bar Tab</CardTitle>
              </div>
              <CardDescription className="text-xs text-zinc-400">
                Post-match refreshments, energy drinks, and meals charged directly to your membership tab.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4">
              {customerTabs.length > 0 ? (
                customerTabs.map((t) => (
                  <div
                    key={t.id}
                    className="p-5 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs text-zinc-400 font-mono">Running Tab</span>
                        <h4 className="text-lg font-bold text-white">Tab #{t.tab_number}</h4>
                      </div>
                      <Badge
                        variant={t.status === 'OPEN' ? 'success' : 'outline'}
                        className="text-xs"
                      >
                        {t.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 border-t border-zinc-800 text-xs">
                      <div>
                        <span className="text-zinc-400 block">Current Balance:</span>
                        <span className="text-base font-mono font-bold text-amber-400">
                          {formatCurrency(t.current_balance)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">Credit Limit:</span>
                        <span className="text-base font-mono font-bold text-white">
                          {formatCurrency(t.credit_limit)}
                        </span>
                      </div>
                      <div>
                        <span className="text-zinc-400 block">Opened Date:</span>
                        <span className="text-zinc-300 font-mono">
                          {formatDate(t.opened_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-6 rounded-xl bg-zinc-950/60 border border-zinc-800 text-center space-y-2">
                  <Coffee className="h-8 w-8 text-zinc-500 mx-auto" />
                  <h4 className="text-sm font-semibold text-white">No Active Cafeteria Tab</h4>
                  <p className="text-xs text-zinc-400 max-w-md mx-auto">
                    Active club members can open a running credit tab at the front counter or bar by presenting their membership card.
                  </p>
                </div>
              )}

              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                <p>
                  Your plan entitles you to{' '}
                  <strong className="text-white">
                    {member?.membership_plans?.shop_discount_percent ?? 15}% OFF
                  </strong>{' '}
                  across all official club refreshments, juices, and sports nutrition at the cafeteria.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 6. SLIDE-OVER CART & FAST CHECKOUT MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6 scrollbar-thin"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <h3 id="cart-title" className="text-lg font-bold text-white">
                    Pro Shop Member Cart
                  </h3>
                  <p className="text-xs text-zinc-400">
                    {totalCartCount} item(s) selected with automatic {discountPercent}% tier savings
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="rounded-lg p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Cart Items List */}
            {cart.length > 0 ? (
              <div className="space-y-3">
                <div className="divide-y divide-zinc-800/80 max-h-56 overflow-y-auto pr-1">
                  {cart.map(({ product, quantity }) => {
                    const unitMemberPrice = Math.round(product.price * discountMultiplier);
                    const itemTotal = unitMemberPrice * quantity;

                    return (
                      <div
                        key={product.id}
                        className="py-3 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-12 w-12 rounded-lg bg-zinc-900 border border-zinc-800 overflow-hidden shrink-0">
                            {product.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-zinc-600">
                                <ShoppingBag className="h-4 w-4" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <h4 className="font-bold text-white truncate">{product.name}</h4>
                            <p className="text-[10px] text-zinc-400 font-mono">
                              Unit: {formatCurrency(unitMemberPrice)}{' '}
                              <span className="line-through text-zinc-600">
                                {formatCurrency(product.price)}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {/* Stepper */}
                          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
                            <button
                              onClick={() => addToCart(product, -1)}
                              className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="font-mono font-bold text-white px-1">{quantity}</span>
                            <button
                              onClick={() => addToCart(product, 1)}
                              className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center font-bold"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <span className="font-mono font-bold text-white w-16 text-right">
                            {formatCurrency(itemTotal)}
                          </span>

                          <button
                            onClick={() => removeFromCart(product.id)}
                            className="text-zinc-500 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Pricing Breakdown Card */}
                <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Retail Value:</span>
                    <span className="font-mono line-through">{formatCurrency(retailSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" />
                      {tier} Tier Discount ({discountPercent}%):
                    </span>
                    <span className="font-mono">- {formatCurrency(memberSavings)}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 flex justify-between items-baseline text-sm font-bold text-white">
                    <span>Final Total to Pay:</span>
                    <span className="text-xl font-mono text-emerald-400">
                      {formatCurrency(finalTotal)}
                    </span>
                  </div>
                </div>

                {/* Fulfillment Method Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-300">
                    Fulfillment Method:
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFulfillmentType('PICKUP')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        fulfillmentType === 'PICKUP'
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-850'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <Store className="h-4 w-4 text-emerald-400" />
                        <span>Front Desk Pickup</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Ready at Reception in 30 mins (Free)
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFulfillmentType('DELIVERY')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        fulfillmentType === 'DELIVERY'
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:bg-zinc-850'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs text-white">
                        <Truck className="h-4 w-4 text-emerald-400" />
                        <span>Express Delivery</span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Direct to your door address
                      </p>
                    </button>
                  </div>
                </div>

                {/* Delivery Address Input (if delivery) */}
                {fulfillmentType === 'DELIVERY' && (
                  <div className="space-y-1 text-xs">
                    <label className="font-semibold text-zinc-300">Delivery Address:</label>
                    <textarea
                      rows={2}
                      placeholder="Enter flat/house no., street, city, pin code..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {/* Contact Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-zinc-400 block mb-1">Contact Name:</label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-xs h-9"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-400 block mb-1">Contact Phone:</label>
                    <Input
                      placeholder="+91 98765 43210"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="bg-zinc-900 border-zinc-800 text-xs h-9"
                    />
                  </div>
                </div>

                {/* Order Notes */}
                <div className="text-xs space-y-1">
                  <label className="text-zinc-400 block">Order Notes (Optional):</label>
                  <Input
                    placeholder="e.g. Please string with 25 lbs tension, or delivery instructions..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs h-9"
                  />
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCartOpen(false)}
                    className="w-full sm:w-1/3 text-xs border-zinc-700"
                  >
                    Keep Shopping
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    disabled={isSubmitting}
                    onClick={handlePlaceOrder}
                    className="w-full sm:w-2/3 gap-2 text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 shadow-lg shadow-emerald-950/60"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        <span>Confirm &amp; Place Order ({formatCurrency(finalTotal)})</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-zinc-500 space-y-3">
                <ShoppingBag className="h-12 w-12 mx-auto text-zinc-600" />
                <h4 className="text-base font-semibold text-white">Your Cart is Empty</h4>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  Add rackets, tennis balls, footwear or apparel to your cart to enjoy your exclusive{' '}
                  <span className="text-emerald-400 font-bold">{discountPercent}% member discount</span>.
                </p>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsCartOpen(false)}
                  className="text-xs"
                >
                  Browse Equipment
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. ORDER SUCCESS MODAL */}
      {orderSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-2xl border border-emerald-500/50 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-center space-y-5 shadow-2xl">
            <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/50">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                Order Confirmed
              </span>
              <h3 className="text-xl font-bold text-white">Thank You for Your Order!</h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your Pro Shop order{' '}
                <strong className="text-emerald-400 font-mono text-sm block mt-1">
                  {orderSuccess.orderNumber}
                </strong>{' '}
                has been received and is being prepared by our club reception staff.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2 text-left">
              <div className="flex justify-between text-zinc-400">
                <span>Fulfillment Type:</span>
                <span className="font-semibold text-white">
                  {orderSuccess.fulfillment === 'PICKUP' ? 'Front Desk Reception Pickup' : 'Express Delivery'}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Member Tier Savings:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {formatCurrency(orderSuccess.savings)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-400 pt-1 border-t border-zinc-800">
                <span>Total Paid:</span>
                <span className="font-mono font-black text-white text-sm">
                  {formatCurrency(orderSuccess.total)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOrderSuccess(null);
                  setSubTab('CATALOG');
                }}
                className="w-full text-xs border-zinc-700"
              >
                Continue Shopping
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setOrderSuccess(null);
                  setSubTab('ORDERS');
                }}
                className="w-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-600 shadow-md shadow-emerald-950/40"
              >
                Track in My Orders
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 8. FLOATING CART PILL (when items exist in cart and cart modal is closed) */}
      {totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom duration-300">
          <Button
            onClick={() => setIsCartOpen(true)}
            size="lg"
            className="rounded-full shadow-2xl shadow-emerald-900/80 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm px-6 py-6 border-2 border-emerald-300/40 hover:scale-105 transition-transform flex items-center gap-3 cursor-pointer"
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 bg-white text-emerald-950 font-black text-[10px] h-4 w-4 rounded-full flex items-center justify-center">
                {totalCartCount}
              </span>
            </div>
            <div className="text-left font-sans">
              <span className="block text-xs font-bold leading-none">View Cart</span>
              <span className="block text-[11px] font-mono text-emerald-100 font-bold leading-none mt-1">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </Button>
        </div>
      )}
    </div>
  );
}

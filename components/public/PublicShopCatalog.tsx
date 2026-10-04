'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { createShopOrderAction } from '@/actions/shop';
import {
  ShoppingBag,
  PackageCheck,
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
} from 'lucide-react';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price: number;
  low_stock_threshold: number;
  category_id: string | null;
  image_url?: string | null;
  product_categories?: { name: string } | null;
  inventory?: { quantity_on_hand: number } | { quantity_on_hand: number }[] | null;
}

function getProductStock(p: Product): number {
  if (!p || !p.inventory) return 0;
  if (Array.isArray(p.inventory)) {
    return Number((p.inventory as any)[0]?.quantity_on_hand ?? 0);
  }
  return Number((p.inventory as any).quantity_on_hand ?? 0);
}

export interface PublicShopCatalogProps {
  initialProducts: Product[];
  categories: Category[];
}

export function PublicShopCatalog({ initialProducts, categories }: PublicShopCatalogProps) {
  const [products] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Cart & Checkout Modal State
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [fulfillmentType, setFulfillmentType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [isMemberDiscount, setIsMemberDiscount] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Filtering & Sorting
  const filteredProducts = products
    .filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory = selectedCategory === 'ALL' || p.category_id === selectedCategory;
      const stock = getProductStock(p);
      const matchesStock = !inStockOnly || stock > 0;

      return matchesSearch && matchesCategory && matchesStock;
    })
    .sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0; // featured default
    });

  const getItemQuantity = (productId: string) => {
    return cart.find((i) => i.product.id === productId)?.quantity || 0;
  };

  const addToCart = (product: Product, delta = 1) => {
    const existing = cart.find((i) => i.product.id === product.id);
    const stockAvailable = getProductStock(product);
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

  // Pricing Calculations
  const retailSubtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const memberSavings = isMemberDiscount ? retailSubtotal * 0.15 : 0;
  const finalTotal = retailSubtotal - memberSavings;
  const totalCartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
      setFeedback({ type: 'error', message: 'Delivery address is required for home delivery orders.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const res = await createShopOrderAction({
      orderChannel: 'ONLINE',
      fulfillmentType,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      deliveryAddress: fulfillmentType === 'DELIVERY' ? deliveryAddress : null,
      notes: orderNotes || null,
      items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
    });

    setIsLoading(false);

    if (res.success) {
      setOrderSuccess({ orderNumber: res.data.orderNumber });
      setCart([]);
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  return (
    <div className="space-y-10">
      {/* SHOP HIGHLIGHTS BANNER */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-teal-950/40 p-6 md:p-8 backdrop-blur-md shadow-xl">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Automatic 15% Member Discount</span>
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                Verified Champions Club members automatically save up to 15% on all equipment, bats & activewear.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Express Counter Pickup & Delivery</h4>
              <p className="text-xs text-zinc-400 mt-1">
                Pick up at the Pro Shop front desk within 30 minutes, or request direct home delivery.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Championship Authenticity</h4>
              <p className="text-xs text-zinc-400 mt-1">
                100% genuine products backed by full manufacturer warranties & custom stringing services.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY & FILTER CONTROL BAR */}
      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-zinc-900/60 p-4 rounded-xl border border-zinc-800/80 backdrop-blur-md shadow-lg">
          {/* Categories Pill Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                selectedCategory === 'ALL'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                  : 'bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800 border border-zinc-800/60'
              }`}
            >
              <span>All Equipment</span>
              <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-black/40 font-mono font-bold">
                {products.length}
              </span>
            </button>
            {categories.map((c) => {
              const catCount = products.filter((p) => p.category_id === c.id).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                    selectedCategory === c.id
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-950/50'
                      : 'bg-zinc-950/60 text-zinc-300 hover:bg-zinc-800 border border-zinc-800/60'
                  }`}
                >
                  <span>{c.name}</span>
                  <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-black/40 font-mono font-bold">
                    {catCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search, Sort & Stock Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="h-4 w-4 text-zinc-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Search rackets, bats, shoes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-zinc-950/80 border-zinc-800 text-xs h-9 focus-visible:ring-emerald-500"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="bg-zinc-950/80 border border-zinc-800 text-zinc-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 cursor-pointer h-9"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Name: A-Z</option>
            </select>

            <button
              onClick={() => setInStockOnly(!inStockOnly)}
              className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 h-9 cursor-pointer ${
                inStockOnly
                  ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              <span>In-Stock Only</span>
            </button>
          </div>
        </div>
      </div>

      {/* PRODUCT GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((prod) => {
          const stock = getProductStock(prod);
          const isOutOfStock = stock <= 0;
          const isLowStock = stock > 0 && stock <= prod.low_stock_threshold;
          const qtyInCart = getItemQuantity(prod.id);
          const memberPrice = prod.price * 0.85;

          return (
            <Card
              key={prod.id}
              className="border-zinc-800/80 bg-zinc-900/60 flex flex-col justify-between hover:border-emerald-500/40 transition-all duration-300 shadow-lg hover:shadow-emerald-950/20 group rounded-2xl overflow-hidden"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 font-medium">
                    {prod.product_categories?.name || 'Athletic Gear'}
                  </Badge>
                  <span className="text-[10px] font-mono text-zinc-500">{prod.sku}</span>
                </div>

                {/* Product Image Box */}
                <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 flex items-center justify-center group-hover:border-zinc-700 transition-colors">
                  {prod.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={prod.image_url}
                      alt={prod.name}
                      onError={(e) => {
                        const target = e.currentTarget as HTMLImageElement;
                        target.onerror = null;
                        target.src =
                          'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-6 text-zinc-600">
                      <ShoppingBag className="h-12 w-12 stroke-[1.5]" />
                      <span className="text-[11px] mt-2 font-medium">Champions Gear</span>
                    </div>
                  )}

                  {/* 15% Off Badge Overlay */}
                  <div className="absolute top-3 left-3 bg-emerald-500/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md backdrop-blur-md flex items-center gap-1">
                    <Zap className="h-3 w-3 fill-current" />
                    <span>Save 15% as Member</span>
                  </div>

                  {/* Stock Status Badge Overlay */}
                  <div className="absolute bottom-3 right-3">
                    {isOutOfStock ? (
                      <span className="bg-rose-950/90 text-rose-300 border border-rose-800/80 text-[10px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Sold Out</span>
                      </span>
                    ) : isLowStock ? (
                      <span className="bg-amber-950/90 text-amber-300 border border-amber-800/80 text-[10px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
                        <PackageCheck className="h-3 w-3 text-amber-400" />
                        <span>Only {stock} Left</span>
                      </span>
                    ) : (
                      <span className="bg-zinc-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold px-2.5 py-1 rounded-lg backdrop-blur-md flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>In Stock</span>
                      </span>
                    )}
                  </div>
                </div>

                <CardTitle className="text-base text-white mt-3 group-hover:text-emerald-300 transition-colors line-clamp-1 font-bold">
                  {prod.name}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 line-clamp-2 mt-1 min-h-[2.25rem]">
                  {prod.description || 'Authentic championship-grade athletic equipment for competitive club play.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-3">
                {/* Price Display */}
                <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/80 space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Retail Price:</span>
                    <span className="line-through text-zinc-500 font-mono">{formatCurrency(prod.price)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Member Price:
                    </span>
                    <span className="text-lg font-black text-white font-mono">{formatCurrency(memberPrice)}</span>
                  </div>
                </div>

                {/* Add to Cart / Quantity Controller */}
                {isOutOfStock ? (
                  <Button variant="outline" size="sm" disabled className="w-full text-xs text-zinc-500 border-zinc-800">
                    Currently Unavailable
                  </Button>
                ) : qtyInCart > 0 ? (
                  <div className="flex items-center justify-between gap-2 p-1 rounded-xl bg-emerald-950/40 border border-emerald-500/40">
                    <button
                      onClick={() => addToCart(prod, -1)}
                      className="h-8 w-8 rounded-lg bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800 flex items-center justify-center font-bold text-sm transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <div className="text-center font-bold text-white text-xs">
                      <span className="font-mono text-emerald-400 text-sm">{qtyInCart}</span> in cart
                    </div>
                    <button
                      onClick={() => addToCart(prod, 1)}
                      className="h-8 w-8 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 flex items-center justify-center font-bold text-sm transition-colors"
                    >
                      <Plus className="h-4 w-4" />
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

      {filteredProducts.length === 0 && (
        <div className="text-center py-16 bg-zinc-900/40 rounded-2xl border border-zinc-800 text-zinc-400 space-y-3">
          <ShoppingBag className="h-12 w-12 mx-auto text-zinc-600" />
          <p className="text-base font-medium text-white">No equipment matches your current filters.</p>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Try adjusting your search terms or selecting a different equipment category.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSearch('');
              setSelectedCategory('ALL');
              setInStockOnly(false);
            }}
          >
            Reset All Filters
          </Button>
        </div>
      )}

      {/* FLOATING CART BAR */}
      {cart.length > 0 && !isCartOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom duration-300">
          <Button
            variant="primary"
            size="lg"
            className="shadow-2xl shadow-emerald-950/90 gap-3 font-bold px-6 py-4 text-sm rounded-full border border-emerald-400/40"
            onClick={() => setIsCartOpen(true)}
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-white text-emerald-950 text-[10px] font-black flex items-center justify-center">
                {totalCartCount}
              </span>
            </div>
            <span>View Member Cart</span>
            <span className="font-mono text-emerald-200 border-l border-emerald-700/60 pl-3">
              {formatCurrency(finalTotal)}
            </span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* INTERACTIVE CHECKOUT & CART MODAL */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200">
          <Card className="w-full max-w-xl border-zinc-800 bg-zinc-900 shadow-2xl rounded-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800 bg-zinc-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShoppingBag className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-white">Your Champions Gear Order</CardTitle>
                  <CardDescription className="text-xs text-zinc-400">
                    {totalCartCount} item(s) selected for purchase
                  </CardDescription>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCartOpen(false);
                  setOrderSuccess(null);
                  setFeedback(null);
                }}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>

            <CardContent className="pt-4 text-xs overflow-y-auto flex-1 space-y-5">
              {orderSuccess ? (
                <div className="text-center py-8 space-y-4">
                  <div className="h-14 w-14 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/60">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Order Placed Successfully!</h3>
                  <p className="text-zinc-300">
                    Order Reference Number: <strong className="text-emerald-400 font-mono text-base ml-1">{orderSuccess.orderNumber}</strong>
                  </p>
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs max-w-sm mx-auto space-y-1">
                    <p className="font-semibold text-zinc-200">What happens next?</p>
                    <p>Our Pro Shop counter staff has received your order. Stock is reserved automatically.</p>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      className="px-6 font-semibold"
                      onClick={() => {
                        setIsCartOpen(false);
                        setOrderSuccess(null);
                      }}
                    >
                      Return to Pro Shop
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePlaceOrder} className="space-y-4">
                  {feedback && (
                    <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                      <span>{feedback.message}</span>
                    </div>
                  )}

                  {/* Selected Cart Items List */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-zinc-200">
                      <span>Order Summary</span>
                      <span className="text-zinc-400 font-normal">{cart.length} unique product(s)</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            {item.product.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={item.product.image_url}
                                alt={item.product.name}
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  target.onerror = null;
                                  target.src =
                                    'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80';
                                }}
                                className="h-10 w-10 rounded-lg object-cover bg-zinc-900 border border-zinc-800"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500">
                                <ShoppingBag className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <div className="font-semibold text-white line-clamp-1">{item.product.name}</div>
                              <div className="text-[11px] text-zinc-400 font-mono">
                                {formatCurrency(item.product.price * 0.85)} each (Member)
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
                              <button
                                type="button"
                                onClick={() => addToCart(item.product, -1)}
                                className="h-6 w-6 rounded bg-zinc-800 text-white font-bold flex items-center justify-center text-xs hover:bg-zinc-700"
                              >
                                -
                              </button>
                              <span className="font-bold text-white text-xs w-6 text-center font-mono">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => addToCart(item.product, 1)}
                                className="h-6 w-6 rounded bg-zinc-800 text-white font-bold flex items-center justify-center text-xs hover:bg-zinc-700"
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product.id)}
                              className="p-1 text-zinc-500 hover:text-rose-400 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Member Discount Toggle */}
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-bold text-white text-xs">Apply Member 15% Discount</div>
                        <div className="text-[10px] text-emerald-300">Included for verified Champions Club members</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isMemberDiscount}
                      onChange={(e) => setIsMemberDiscount(e.target.checked)}
                      className="h-4 w-4 accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Fulfillment Type Selection */}
                  <div className="space-y-2 pt-1 border-t border-zinc-800">
                    <label className="block text-zinc-300 font-semibold text-xs">Choose Fulfillment Method</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFulfillmentType('PICKUP')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          fulfillmentType === 'PICKUP'
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 text-xs text-white">
                          <Store className="h-4 w-4 text-emerald-400" />
                          <span>Pro Shop Pickup</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1">Collect at front desk counter</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFulfillmentType('DELIVERY')}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          fulfillmentType === 'DELIVERY'
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5 text-xs text-white">
                          <Truck className="h-4 w-4 text-teal-400" />
                          <span>Home Delivery</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1">Doorstep delivery</div>
                      </button>
                    </div>
                  </div>

                  {/* Customer Information Form */}
                  <div className="space-y-3 pt-1 border-t border-zinc-800">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-zinc-300 font-medium text-[11px] mb-1">Full Name *</label>
                        <Input
                          required
                          placeholder="e.g. Dhruv Babriya"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-300 font-medium text-[11px] mb-1">Mobile Phone *</label>
                        <Input
                          required
                          placeholder="+91 98765 43210"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="bg-zinc-950 border-zinc-800 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-300 font-medium text-[11px] mb-1">Email Address</label>
                      <Input
                        type="email"
                        placeholder="dhruv@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-xs"
                      />
                    </div>

                    {fulfillmentType === 'DELIVERY' && (
                      <div>
                        <label className="block text-zinc-300 font-medium text-[11px] mb-1">
                          Delivery Street Address *
                        </label>
                        <textarea
                          required
                          rows={2}
                          placeholder="Flat #, Street, Landmark, City & PIN..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-2.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-zinc-300 font-medium text-[11px] mb-1">Order Notes (Optional)</label>
                      <Input
                        placeholder="Grip preferences, string tension, etc."
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        className="bg-zinc-950 border-zinc-800 text-xs"
                      />
                    </div>
                  </div>

                  {/* Subtotal & Savings Breakdown */}
                  <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Retail Subtotal:</span>
                      <span className="font-mono">{formatCurrency(retailSubtotal)}</span>
                    </div>
                    {isMemberDiscount && (
                      <div className="flex justify-between text-xs text-emerald-400 font-medium">
                        <span>Member Discount (15%):</span>
                        <span className="font-mono">-{formatCurrency(memberSavings)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800">
                      <span className="font-bold text-white text-xs">Total Amount Payable:</span>
                      <span className="text-lg font-black text-emerald-400 font-mono">
                        {formatCurrency(finalTotal)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCartOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isLoading}
                      className="px-6 font-semibold gap-1.5 shadow-md shadow-emerald-950/50"
                    >
                      <span>Confirm & Place Order</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

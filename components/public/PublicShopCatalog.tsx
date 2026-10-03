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
  inventory?: { quantity_on_hand: number } | null;
}

export interface PublicShopCatalogProps {
  initialProducts: Product[];
  categories: Category[];
}

export function PublicShopCatalog({ initialProducts, categories }: PublicShopCatalogProps) {
  const [products] = useState<Product[]>(initialProducts);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Checkout Modal State
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number }>>([]);
  const [fulfillmentType, setFulfillmentType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<{ orderNumber: string } | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'ALL' || p.category_id === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    const existing = cart.find((i) => i.product.id === product.id);
    const stockAvailable = product.inventory?.quantity_on_hand ?? 0;
    const currentQtyInCart = existing ? existing.quantity : 0;

    if (currentQtyInCart + 1 > stockAvailable) {
      alert(`Only ${stockAvailable} available in stock for this product.`);
      return;
    }

    if (existing) {
      setCart(cart.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    setIsOrderModalOpen(true);
  };

  const updateCartQty = (productId: string, delta: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    const stockAvailable = item.product.inventory?.quantity_on_hand ?? 0;

    if (newQty <= 0) {
      setCart(cart.filter((i) => i.product.id !== productId));
    } else if (newQty > stockAvailable) {
      alert(`Maximum available stock is ${stockAvailable}.`);
    } else {
      setCart(cart.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i)));
    }
  };

  const cartSubtotal = cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
      setFeedback({ type: 'error', message: 'Delivery address is required for delivery orders.' });
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
    <div className="space-y-8">
      {/* Category & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900/40 p-4 rounded-xl border border-zinc-800 backdrop-blur-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              selectedCategory === 'ALL'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            All Products ({products.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === c.id
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-3" />
          <Input
            placeholder="Search equipment, rackets, shoes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-950/70 border-zinc-800 text-xs"
          />
        </div>
      </div>

      {/* Floating Cart Button if items exist */}
      {cart.length > 0 && !isOrderModalOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-in slide-in-from-bottom">
          <Button
            variant="primary"
            size="lg"
            className="shadow-2xl shadow-emerald-950/80 gap-2 font-bold"
            onClick={() => setIsOrderModalOpen(true)}
          >
            <ShoppingBag className="h-5 w-5" />
            <span>View Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items)</span>
            <span className="font-mono ml-1">{formatCurrency(cartSubtotal)}</span>
          </Button>
        </div>
      )}

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredProducts.map((prod) => {
          const stock = prod.inventory?.quantity_on_hand ?? 0;
          const isOutOfStock = stock <= 0;
          const isLowStock = stock > 0 && stock <= prod.low_stock_threshold;

          return (
            <Card
              key={prod.id}
              className="border-zinc-800 bg-zinc-900/50 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md group"
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[11px] text-zinc-400">
                    {prod.product_categories?.name || 'Athletic Gear'}
                  </Badge>
                  <span className="text-[11px] font-mono text-zinc-500">{prod.sku}</span>
                </div>
                {prod.image_url ? (
                  <div className="w-full aspect-square mt-3 mb-2 rounded-md overflow-hidden bg-zinc-950 flex items-center justify-center border border-zinc-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                  </div>
                ) : (
                  <div className="w-full h-40 mt-3 mb-2 rounded-md bg-zinc-950 flex items-center justify-center border border-zinc-800">
                    <ShoppingBag className="h-10 w-10 text-zinc-700" />
                  </div>
                )}
                <CardTitle className="text-lg text-white mt-2 group-hover:text-emerald-300 transition-colors">
                  {prod.name}
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 line-clamp-2">
                  {prod.description || 'Authentic championship-grade equipment.'}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-white font-mono">
                    {formatCurrency(prod.price)}
                  </span>
                  <span className="text-xs flex items-center gap-1 font-medium">
                    {isOutOfStock ? (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span>Sold Out</span>
                      </span>
                    ) : (
                      <span className={isLowStock ? 'text-amber-400 flex items-center gap-1' : 'text-emerald-400 flex items-center gap-1'}>
                        <PackageCheck className="h-3.5 w-3.5" />
                        <span>{stock} in stock {isLowStock && '(Low)'}</span>
                      </span>
                    )}
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800 flex items-center justify-between">
                  <span>Club Member Price:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {formatCurrency(prod.price * 0.85)} (Up to 15% off)
                  </span>
                </div>
              </CardContent>

              <div className="p-6 pt-0">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isOutOfStock}
                  className="w-full gap-2 font-semibold shadow-sm"
                  onClick={() => addToCart(prod)}
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>{isOutOfStock ? 'Currently Unavailable' : 'Order for Pickup / Delivery'}</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-16 text-zinc-500 space-y-2">
          <ShoppingBag className="h-10 w-10 mx-auto text-zinc-600" />
          <p className="text-base font-medium">No products found matching your search.</p>
          <Button variant="outline" size="sm" onClick={() => { setSearch(''); setSelectedCategory('ALL'); }}>
            Reset Filters
          </Button>
        </div>
      )}

      {/* INTERACTIVE ORDER / CHECKOUT MODAL */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-lg border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
                <CardTitle className="text-base font-bold text-white">Order Gear & Equipment</CardTitle>
              </div>
              <button
                onClick={() => {
                  setIsOrderModalOpen(false);
                  setOrderSuccess(null);
                  setFeedback(null);
                }}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </CardHeader>

            <CardContent className="pt-4 text-xs">
              {orderSuccess ? (
                <div className="text-center py-8 space-y-3">
                  <div className="h-12 w-12 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Order Confirmed!</h3>
                  <p className="text-zinc-300">
                    Your order number is <strong className="text-emerald-400 font-mono text-sm">{orderSuccess.orderNumber}</strong>.
                  </p>
                  <p className="text-zinc-400 text-[11px] max-w-xs mx-auto">
                    Stock has been atomically reserved. You will receive an SMS notification when ready for pickup or dispatched.
                  </p>
                  <div className="pt-4">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setIsOrderModalOpen(false);
                        setOrderSuccess(null);
                      }}
                    >
                      Done / Continue Browsing
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handlePlaceOrder} className="space-y-4">
                  {feedback && (
                    <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                      {feedback.message}
                    </div>
                  )}

                  {/* Selected Cart Items */}
                  <div className="space-y-2">
                    <div className="font-semibold text-zinc-300">Items in Your Order</div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {cart.map((item) => (
                        <div
                          key={item.product.id}
                          className="p-2 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <div className="font-medium text-zinc-100">{item.product.name}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">
                              {formatCurrency(item.product.price)} each
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product.id, -1)}
                              className="h-5 w-5 rounded bg-zinc-800 text-white font-bold flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                            <span className="font-bold text-white text-xs w-4 text-center">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartQty(item.product.id, 1)}
                              className="h-5 w-5 rounded bg-zinc-800 text-white font-bold flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fulfillment Type Toggle */}
                  <div className="space-y-1.5 pt-2 border-t border-zinc-800">
                    <label className="block text-zinc-300 font-semibold">How would you like to receive your gear?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFulfillmentType('PICKUP')}
                        className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          fulfillmentType === 'PICKUP'
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5" />
                          <span>Club Pickup</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Collect at Pro Shop counter</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFulfillmentType('DELIVERY')}
                        className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                          fulfillmentType === 'DELIVERY'
                            ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                        }`}
                      >
                        <div className="font-bold flex items-center gap-1.5">
                          <Truck className="h-3.5 w-3.5" />
                          <span>Home Delivery</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Dispatched to your doorstep</div>
                      </button>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-2 pt-1 border-t border-zinc-800">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-zinc-300 font-medium mb-1">Your Full Name *</label>
                        <Input
                          required
                          placeholder="e.g. Dhruv Babriya"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-zinc-300 font-medium mb-1">Mobile Number *</label>
                        <Input
                          required
                          placeholder="+91 98765 43210"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Email Address</label>
                      <Input
                        type="email"
                        placeholder="dhruv@example.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                      />
                    </div>

                    {fulfillmentType === 'DELIVERY' && (
                      <div>
                        <label className="block text-zinc-300 font-medium mb-1">
                          Delivery Street Address *
                        </label>
                        <textarea
                          required
                          rows={2}
                          placeholder="Flat #, Street, Landmark, City & PIN..."
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 p-2.5 text-xs text-zinc-200 placeholder:text-zinc-500"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-zinc-300 font-medium mb-1">Order Notes (Optional)</label>
                      <Input
                        placeholder="Racket string tension, grip preferences, etc."
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Pricing Total */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 flex justify-between items-baseline">
                    <span className="font-semibold text-zinc-300">Total Order Amount:</span>
                    <span className="text-base font-bold text-emerald-400 font-mono">
                      {formatCurrency(cartSubtotal)}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsOrderModalOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                      Confirm Order
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

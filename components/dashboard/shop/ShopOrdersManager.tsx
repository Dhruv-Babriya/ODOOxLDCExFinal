'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  createShopOrderAction,
  cancelShopOrderAction,
  updateShopOrderFulfillmentStatusAction,
} from '@/actions/shop';
import { FulfillmentStatus } from '@/types/shared';
import {
  ShoppingBag,
  Plus,
  Search,
  CheckCircle2,
  Truck,
  Store,
  Trash2,
  Receipt,
  Eye,
  RotateCcw,
  Clock,
  AlertTriangle,
  PackageCheck,
  CheckCircle,
} from 'lucide-react';

export interface ShopOrderProduct {
  id: string;
  sku: string;
  name: string;
  price: number;
  low_stock_threshold: number;
  is_active: boolean;
  category_id: string | null;
  product_categories: { name: string } | null;
  inventory?: { quantity_on_hand: number } | null;
}

export interface ShopMember {
  id: string;
  membership_number: string;
  status: string;
  profiles?: { full_name: string; email: string; phone: string | null } | null;
  membership_plans?: { tier: string; shop_discount_percent: number } | null;
}

export interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  products?: { name: string; sku: string } | null;
}

export interface ShopOrder {
  id: string;
  order_number: string;
  member_id: string | null;
  order_channel: string;
  fulfillment_type: string;
  fulfillment_status?: string;
  delivery_address: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  notes: string | null;
  status: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
  confirmed_at?: string | null;
  ready_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  members?: {
    membership_number: string;
    profiles?: { full_name: string; email: string; phone: string | null } | null;
    membership_plans?: { tier: string; shop_discount_percent: number } | null;
  } | null;
  shop_order_items?: OrderItem[];
}

export interface ShopOrdersManagerProps {
  initialOrders: ShopOrder[];
  products: ShopOrderProduct[];
  members: ShopMember[];
}

export function ShopOrdersManager({ initialOrders, products, members }: ShopOrdersManagerProps) {
  const [orders, setOrders] = useState<ShopOrder[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'PICKUP_QUEUE' | 'DELIVERY_QUEUE' | 'POS' | 'ONLINE_ORDER'>('ORDERS');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [channelFilter, setChannelFilter] = useState<string>('ALL');

  // Selected Order for detail modal
  const [selectedOrder, setSelectedOrder] = useState<ShopOrder | null>(null);

  // POS / Order Builder State
  const [cart, setCart] = useState<Array<{ product: ShopOrderProduct; quantity: number }>>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [fulfillmentType, setFulfillmentType] = useState<'PICKUP' | 'DELIVERY'>('PICKUP');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Selected member for discount preview
  const selectedMember = members.find((m) => m.id === selectedMemberId);
  const memberDiscountPercent =
    selectedMember?.status === 'ACTIVE'
      ? selectedMember.membership_plans?.shop_discount_percent ?? 0
      : 0;

  // Cart calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const cartDiscount = (cartSubtotal * memberDiscountPercent) / 100;
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount);

  // Cart Actions
  const addToCart = (product: ShopOrderProduct) => {
    const existing = cart.find((i) => i.product.id === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;
    const stockAvailable = product.inventory?.quantity_on_hand ?? 0;

    if (currentQtyInCart + 1 > stockAvailable) {
      setFeedback({
        type: 'error',
        message: `Cannot add more. Only ${stockAvailable} available in stock for "${product.name}".`,
      });
      return;
    }

    if (existing) {
      setCart(
        cart.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateCartQty = (productId: string, delta: number) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    const stockAvailable = item.product.inventory?.quantity_on_hand ?? 0;

    if (newQty <= 0) {
      setCart(cart.filter((i) => i.product.id !== productId));
      return;
    }

    if (newQty > stockAvailable) {
      setFeedback({
        type: 'error',
        message: `Maximum available stock is ${stockAvailable} units.`,
      });
      return;
    }

    setCart(cart.map((i) => (i.product.id === productId ? { ...i, quantity: newQty } : i)));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedMemberId('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setDeliveryAddress('');
    setOrderNotes('');
  };

  // Submit Order (Counter POS or Online Order)
  const handleSubmitOrder = async (channel: 'COUNTER' | 'ONLINE') => {
    if (cart.length === 0) {
      setFeedback({ type: 'error', message: 'Cart is empty. Please select products.' });
      return;
    }

    if (channel === 'ONLINE' && fulfillmentType === 'DELIVERY' && !deliveryAddress.trim()) {
      setFeedback({ type: 'error', message: 'Delivery address is required for delivery orders.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const res = await createShopOrderAction({
      memberId: selectedMemberId || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      customerEmail: customerEmail || null,
      orderChannel: channel,
      fulfillmentType,
      deliveryAddress: fulfillmentType === 'DELIVERY' ? deliveryAddress : null,
      items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      notes: orderNotes || null,
    });

    setIsLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message || 'Order placed successfully!' });

      // Build new order object for immediate state reflection
      const newOrder: ShopOrder = {
        id: res.data.orderId,
        order_number: res.data.orderNumber,
        member_id: selectedMemberId || null,
        order_channel: channel,
        fulfillment_type: fulfillmentType,
        delivery_address: fulfillmentType === 'DELIVERY' ? deliveryAddress : null,
        customer_name: customerName || (selectedMember?.profiles?.full_name ?? 'Walk-in Customer'),
        customer_phone: customerPhone || null,
        customer_email: customerEmail || null,
        notes: orderNotes || null,
        status: 'PROCESSING',
        subtotal: cartSubtotal,
        discount_amount: cartDiscount,
        total_amount: cartTotal,
        created_at: new Date().toISOString(),
        members: selectedMember
          ? {
              membership_number: selectedMember.membership_number,
              profiles: selectedMember.profiles,
              membership_plans: selectedMember.membership_plans,
            }
          : null,
        shop_order_items: cart.map((i) => ({
          id: Math.random().toString(),
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.product.price,
          total_price: i.product.price * i.quantity,
          products: { name: i.product.name, sku: i.product.sku },
        })),
      };

      setOrders([newOrder, ...orders]);

      // Deduct stock in local products state
      cart.forEach((item) => {
        const prod = products.find((p) => p.id === item.product.id);
        if (prod && prod.inventory) {
          prod.inventory.quantity_on_hand -= item.quantity;
        }
      });

      clearCart();
      setActiveTab('ORDERS');
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Cancel Order & Restock
  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order? All items will be atomically returned to inventory.')) {
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const res = await cancelShopOrderAction({
      orderId,
      reason: 'Cancelled from Staff Dashboard',
    });

    setIsLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Order cancelled and stock returned to inventory.' });
      setOrders(orders.map((o) => (o.id === orderId ? { ...o, status: 'CANCELLED' } : o)));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: 'CANCELLED' });
      }
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Phase 2: Update Order Fulfillment Lifecycle State
  const handleUpdateFulfillment = async (orderId: string, nextStatus: FulfillmentStatus) => {
    setIsLoading(true);
    setFeedback(null);

    const res = await updateShopOrderFulfillmentStatusAction({
      orderId,
      fulfillmentStatus: nextStatus,
    });

    setIsLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message || 'Fulfillment status updated.' });
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                fulfillment_status: res.data.fulfillmentStatus,
                status: res.data.status,
                ...(res.data.fulfillmentStatus === 'CONFIRMED' ? { confirmed_at: new Date().toISOString() } : {}),
                ...(['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(res.data.fulfillmentStatus)
                  ? { ready_at: new Date().toISOString() }
                  : {}),
                ...(['COLLECTED', 'DELIVERED', 'COMPLETED'].includes(res.data.fulfillmentStatus)
                  ? { completed_at: new Date().toISOString() }
                  : {}),
              }
            : o
        )
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev
            ? {
                ...prev,
                fulfillment_status: res.data.fulfillmentStatus,
                status: res.data.status,
              }
            : null
        );
      }
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Filtering orders
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (o.members?.profiles?.full_name &&
        o.members.profiles.full_name.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    const matchesChannel = channelFilter === 'ALL' || o.order_channel === channelFilter;

    return matchesSearch && matchesStatus && matchesChannel;
  });

  // Calculate Operational Metrics
  const processingCount = orders.filter((o) => o.status === 'PROCESSING').length;
  const completedCount = orders.filter((o) => o.status === 'COMPLETED').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
  const totalSalesRevenue = orders
    .filter((o) => o.status !== 'CANCELLED')
    .reduce((sum, o) => sum + Number(o.total_amount), 0);

  // Operational Queues
  const lowStockProducts = products.filter(
    (p) => (p.inventory?.quantity_on_hand ?? 0) <= p.low_stock_threshold
  );
  const pickupQueue = orders.filter(
    (o) =>
      o.fulfillment_type === 'PICKUP' &&
      o.status !== 'CANCELLED' &&
      !['COLLECTED', 'COMPLETED'].includes(o.fulfillment_status || '')
  );
  const deliveryQueue = orders.filter(
    (o) =>
      o.fulfillment_type === 'DELIVERY' &&
      o.status !== 'CANCELLED' &&
      !['DELIVERED', 'COMPLETED'].includes(o.fulfillment_status || '')
  );

  return (
    <div className="space-y-6">
      {/* Metric Highlights */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="border-zinc-800 bg-zinc-900/60 p-3.5">
          <div className="text-zinc-400 text-xs font-medium">Total Orders</div>
          <div className="text-2xl font-bold text-white mt-1">{orders.length}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">{completedCount} fulfilled &bull; {processingCount} active &bull; {cancelledCount} void</div>
        </Card>

        <Card className={`border-zinc-800 p-3.5 transition-all ${
          pickupQueue.length > 0 ? 'bg-emerald-950/20 border-emerald-900/50' : 'bg-zinc-900/60'
        }`}>
          <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
            <span>Pickup Queue</span>
            <Store className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{pickupQueue.length}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Awaiting collection</div>
        </Card>

        <Card className={`border-zinc-800 p-3.5 transition-all ${
          deliveryQueue.length > 0 ? 'bg-amber-950/20 border-amber-900/50' : 'bg-zinc-900/60'
        }`}>
          <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
            <span>Delivery Queue</span>
            <Truck className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{deliveryQueue.length}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Prep / In-transit</div>
        </Card>

        <Card className={`border-zinc-800 p-3.5 transition-all ${
          lowStockProducts.length > 0 ? 'bg-rose-950/20 border-rose-900/50' : 'bg-zinc-900/60'
        }`}>
          <div className="text-zinc-400 text-xs font-medium flex items-center justify-between">
            <span>Low-Stock SKUs</span>
            <AlertTriangle className={`h-3.5 w-3.5 ${lowStockProducts.length > 0 ? 'text-rose-400' : 'text-zinc-500'}`} />
          </div>
          <div className={`text-2xl font-bold mt-1 ${lowStockProducts.length > 0 ? 'text-rose-400' : 'text-zinc-300'}`}>
            {lowStockProducts.length}
          </div>
          <div className="text-[11px] text-zinc-500 mt-0.5">&le; reorder threshold</div>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60 p-3.5">
          <div className="text-zinc-400 text-xs font-medium">Gross Revenue</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 truncate">{formatCurrency(totalSalesRevenue)}</div>
          <div className="text-[11px] text-zinc-500 mt-0.5">Excludes cancelled</div>
        </Card>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-zinc-400 hover:text-white">
            &times;
          </button>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-zinc-800 gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ORDERS')}
          className={`pb-3 text-xs font-semibold transition-colors relative cursor-pointer whitespace-nowrap ${
            activeTab === 'ORDERS' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <span>Orders Register & History</span>
          {activeTab === 'ORDERS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('PICKUP_QUEUE')}
          className={`pb-3 text-xs font-semibold transition-colors relative flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'PICKUP_QUEUE' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Store className="h-3.5 w-3.5" />
          <span>Pickup Queue</span>
          {pickupQueue.length > 0 && (
            <Badge variant="success" className="text-[10px] py-0 px-1.5">
              {pickupQueue.length}
            </Badge>
          )}
          {activeTab === 'PICKUP_QUEUE' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('DELIVERY_QUEUE')}
          className={`pb-3 text-xs font-semibold transition-colors relative flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'DELIVERY_QUEUE' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Truck className="h-3.5 w-3.5" />
          <span>Delivery Queue</span>
          {deliveryQueue.length > 0 && (
            <Badge variant="warning" className="text-[10px] py-0 px-1.5">
              {deliveryQueue.length}
            </Badge>
          )}
          {activeTab === 'DELIVERY_QUEUE' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => {
            clearCart();
            setFulfillmentType('PICKUP');
            setActiveTab('POS');
          }}
          className={`pb-3 text-xs font-semibold transition-colors relative flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'POS' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Store className="h-3.5 w-3.5" />
          <span>Quick Counter POS Sale</span>
          {activeTab === 'POS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>

        <button
          onClick={() => {
            clearCart();
            setActiveTab('ONLINE_ORDER');
          }}
          className={`pb-3 text-xs font-semibold transition-colors relative flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === 'ONLINE_ORDER' ? 'text-emerald-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Truck className="h-3.5 w-3.5" />
          <span>Create Pickup / Delivery</span>
          {activeTab === 'ONLINE_ORDER' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500" />
          )}
        </button>
      </div>

      {/* TAB: PICKUP QUEUE */}
      {activeTab === 'PICKUP_QUEUE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-400" />
                <span>Shop Pickup Operations Queue</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Staff collection station: advance orders through Confirmed &rarr; Ready for Pickup &rarr; Collected.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {pickupQueue.length} Active Pickups
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pickupQueue.length > 0 ? (
              pickupQueue.map((order) => {
                const currentStatus = order.fulfillment_status || 'PENDING';
                return (
                  <Card key={order.id} className="border-zinc-800 bg-zinc-900/60 p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-emerald-400 text-sm">{order.order_number}</span>
                        <Badge
                          variant={
                            currentStatus === 'READY_FOR_PICKUP'
                              ? 'success'
                              : currentStatus === 'CONFIRMED'
                              ? 'outline'
                              : 'warning'
                          }
                          className="text-[10px]"
                        >
                          {currentStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div>
                        <div className="font-medium text-white text-xs">
                          {order.members?.profiles?.full_name || order.customer_name || 'Walk-in Patron'}
                        </div>
                        {order.customer_phone && (
                          <div className="text-[11px] text-zinc-400 font-mono">{order.customer_phone}</div>
                        )}
                        {order.members?.membership_plans && (
                          <Badge variant="gold" className="text-[9px] py-0 px-1 mt-1">
                            {order.members.membership_plans.tier} Member ({order.members.membership_plans.shop_discount_percent}% off)
                          </Badge>
                        )}
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">Items</div>
                        {order.shop_order_items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs text-zinc-300">
                            <span>{item.products?.name || 'Item'}</span>
                            <span className="font-mono font-bold text-white">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-baseline text-xs">
                        <span className="text-zinc-400">Total:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800 space-y-2">
                      {currentStatus === 'PENDING' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs"
                          isLoading={isLoading}
                          onClick={() => handleUpdateFulfillment(order.id, 'CONFIRMED')}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          <span>Confirm Order</span>
                        </Button>
                      )}

                      {currentStatus === 'CONFIRMED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs bg-emerald-600 hover:bg-emerald-500"
                          isLoading={isLoading}
                          onClick={() => handleUpdateFulfillment(order.id, 'READY_FOR_PICKUP')}
                        >
                          <PackageCheck className="h-3.5 w-3.5 mr-1" />
                          <span>Mark Ready for Pickup</span>
                        </Button>
                      )}

                      {currentStatus === 'READY_FOR_PICKUP' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                          isLoading={isLoading}
                          onClick={() => handleUpdateFulfillment(order.id, 'COLLECTED')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          <span>Mark Collected & Complete</span>
                        </Button>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs border-zinc-800"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          <span>Details</span>
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          className="text-xs"
                          isLoading={isLoading}
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-zinc-500 text-xs bg-zinc-900/30 rounded-xl border border-zinc-800">
                <Store className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                No orders currently waiting in the pickup queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: DELIVERY QUEUE */}
      {activeTab === 'DELIVERY_QUEUE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Truck className="h-4 w-4 text-amber-400" />
                <span>Home Delivery Dispatch Queue</span>
              </h3>
              <p className="text-xs text-zinc-400">
                Packaging & dispatch station: advance orders through Confirmed &rarr; Preparing &rarr; Out for Delivery &rarr; Delivered.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {deliveryQueue.length} Active Deliveries
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deliveryQueue.length > 0 ? (
              deliveryQueue.map((order) => {
                const currentStatus = order.fulfillment_status || 'PENDING';
                return (
                  <Card key={order.id} className="border-zinc-800 bg-zinc-900/60 p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-400 text-sm">{order.order_number}</span>
                        <Badge
                          variant={
                            currentStatus === 'OUT_FOR_DELIVERY'
                              ? 'success'
                              : currentStatus === 'PREPARING'
                              ? 'warning'
                              : 'outline'
                          }
                          className="text-[10px]"
                        >
                          {currentStatus.replace(/_/g, ' ')}
                        </Badge>
                      </div>

                      <div>
                        <div className="font-medium text-white text-xs">
                          {order.members?.profiles?.full_name || order.customer_name || 'Customer'}
                        </div>
                        {order.customer_phone && (
                          <div className="text-[11px] text-zinc-400 font-mono">{order.customer_phone}</div>
                        )}
                        {order.delivery_address && (
                          <div className="mt-1.5 p-2 rounded bg-zinc-950/80 border border-zinc-800 text-[11px] text-zinc-300">
                            <span className="text-[10px] text-zinc-500 font-bold uppercase block mb-0.5">Delivery Address:</span>
                            {order.delivery_address}
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 space-y-1">
                        <div className="text-[10px] text-zinc-500 uppercase font-bold">Items</div>
                        {order.shop_order_items?.map((item) => (
                          <div key={item.id} className="flex justify-between text-xs text-zinc-300">
                            <span>{item.products?.name || 'Item'}</span>
                            <span className="font-mono font-bold text-white">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-zinc-800/80 flex justify-between items-baseline text-xs">
                        <span className="text-zinc-400">Total:</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm">
                          {formatCurrency(order.total_amount)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800 space-y-2">
                      {currentStatus === 'PENDING' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs"
                          isLoading={isLoading}
                          onClick={() => handleUpdateFulfillment(order.id, 'CONFIRMED')}
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1" />
                          <span>Confirm Order</span>
                        </Button>
                      )}

                      {currentStatus === 'CONFIRMED' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs bg-amber-600 hover:bg-amber-500 text-white"
                          isLoading={isLoading}
                          onClick={() => handleUpdateFulfillment(order.id, 'PREPARING')}
                        >
                          <Clock className="h-3.5 w-3.5 mr-1" />
                          <span>Start Preparing</span>
                        </Button>
                      )}

                      {currentStatus === 'PREPARING' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs bg-emerald-600 hover:bg-emerald-500"
                          isLoading={isLoading}
                          onClick={() => handleUpdateFulfillment(order.id, 'OUT_FOR_DELIVERY')}
                        >
                          <Truck className="h-3.5 w-3.5 mr-1" />
                          <span>Dispatch / Out for Delivery</span>
                        </Button>
                      )}

                      {currentStatus === 'OUT_FOR_DELIVERY' && (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                          isLoading={isLoading}
                          onClick={() => handleUpdateFulfillment(order.id, 'DELIVERED')}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          <span>Mark Delivered & Complete</span>
                        </Button>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs border-zinc-800"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          <span>Details</span>
                        </Button>

                        <Button
                          variant="danger"
                          size="sm"
                          className="text-xs"
                          isLoading={isLoading}
                          onClick={() => handleCancelOrder(order.id)}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-zinc-500 text-xs bg-zinc-900/30 rounded-xl border border-zinc-800">
                <Truck className="h-8 w-8 mx-auto mb-2 text-zinc-600" />
                No orders currently waiting in the delivery queue.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 1: ORDERS REGISTER */}
      {activeTab === 'ORDERS' && (
        <div className="space-y-4">
          <Card className="border-zinc-800 bg-zinc-900/60 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-3" />
                <Input
                  placeholder="Search by Order #, Customer, or Member..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-zinc-950/70 border-zinc-800 text-xs"
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PROCESSING">Processing</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">All Channels</option>
                  <option value="COUNTER">Counter POS</option>
                  <option value="ONLINE">Online Orders</option>
                </select>
              </div>
            </div>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-white">All Shop Orders</CardTitle>
              <Badge variant="outline">{filteredOrders.length} Orders</Badge>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Order Number</th>
                      <th className="py-2.5 px-3">Customer / Member</th>
                      <th className="py-2.5 px-3">Channel & Fulfillment</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Total Amount</th>
                      <th className="py-2.5 px-3">Placed At</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((o) => (
                        <tr key={o.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-2.5 px-3 text-emerald-400 font-bold">{o.order_number}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <div className="text-zinc-200 font-medium">
                              {o.members?.profiles?.full_name || o.customer_name || 'Walk-in Customer'}
                            </div>
                            {o.members && (
                              <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                                <span>{o.members.membership_number}</span>
                                {o.members.membership_plans && (
                                  <Badge
                                    variant={o.members.membership_plans.tier === 'GOLD' ? 'gold' : 'silver'}
                                    className="text-[8px] py-0 px-1"
                                  >
                                    {o.members.membership_plans.tier}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <div className="flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px]">
                                {o.order_channel}
                              </Badge>
                              {o.fulfillment_type === 'DELIVERY' ? (
                                <Badge variant="warning" className="text-[9px] gap-1 px-1.5">
                                  <Truck className="h-2.5 w-2.5" />
                                  Delivery
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] gap-1 px-1.5 text-zinc-400">
                                  <Store className="h-2.5 w-2.5" />
                                  Pickup
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 font-sans">
                            <div className="flex flex-col gap-1 items-start">
                              <Badge
                                variant={
                                  o.status === 'COMPLETED'
                                    ? 'success'
                                    : o.status === 'CANCELLED'
                                    ? 'destructive'
                                    : 'warning'
                                }
                                className="text-[10px]"
                              >
                                {o.status}
                              </Badge>
                              {o.fulfillment_status && (
                                <span className="text-[9px] font-mono text-zinc-400">
                                  {o.fulfillment_status.replace(/_/g, ' ')}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-white font-bold">{formatCurrency(o.total_amount)}</td>
                          <td className="py-2.5 px-3 text-zinc-400 font-sans">{formatDateTime(o.created_at)}</td>
                          <td className="py-2.5 px-3 text-right font-sans">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-[11px] gap-1 border-zinc-800 hover:bg-zinc-800"
                              onClick={() => setSelectedOrder(o)}
                            >
                              <Eye className="h-3 w-3 text-zinc-400" />
                              <span>Details</span>
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-10 font-sans text-zinc-500">
                          No orders found matching the filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 2 & 3: ORDER CREATION (COUNTER POS OR ONLINE WORKFLOW) */}
      {(activeTab === 'POS' || activeTab === 'ONLINE_ORDER') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catalog & Item Selection (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-3" />
                  <Input
                    placeholder="Search catalog products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-zinc-950/70 border-zinc-800 text-xs"
                  />
                </div>
                <div className="text-xs text-zinc-400">
                  Click <span className="text-emerald-400 font-bold">+ Add</span> to put item into cart
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {products
                .filter(
                  (p) =>
                    p.is_active &&
                    (p.name.toLowerCase().includes(search.toLowerCase()) ||
                      p.sku.toLowerCase().includes(search.toLowerCase()))
                )
                .map((prod) => {
                  const stock = prod.inventory?.quantity_on_hand ?? 0;
                  const isOutOfStock = stock <= 0;

                  return (
                    <Card
                      key={prod.id}
                      className={`border-zinc-800 bg-zinc-900/40 p-3 flex flex-col justify-between transition-all ${
                        isOutOfStock ? 'opacity-50' : 'hover:border-zinc-700'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start gap-1">
                          <span className="text-[10px] font-mono text-zinc-500">{prod.sku}</span>
                          <span
                            className={`text-[10px] font-bold ${
                              stock <= prod.low_stock_threshold ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {stock} in stock
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-zinc-100 mt-1 line-clamp-2">{prod.name}</h4>
                        {prod.product_categories && (
                          <div className="text-[10px] text-zinc-400 mt-0.5">{prod.product_categories.name}</div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{formatCurrency(prod.price)}</span>
                        <Button
                          size="sm"
                          variant="primary"
                          disabled={isOutOfStock}
                          className="h-7 px-2.5 text-xs"
                          onClick={() => addToCart(prod)}
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add</span>
                        </Button>
                      </div>
                    </Card>
                  );
                })}
            </div>
          </div>

          {/* Cart & Customer Checkout Sidebar (Right 1 col) */}
          <div className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-900/70 p-4 sticky top-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white">
                    {activeTab === 'POS' ? 'Counter POS Register' : 'Online Order Flow'}
                  </span>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-[11px] text-zinc-500 hover:text-rose-400 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Customer / Member Selection */}
              <div className="space-y-2 text-xs">
                <label className="block text-zinc-300 font-medium">Customer / Member</label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-zinc-700 bg-zinc-950/70 text-xs text-zinc-200"
                >
                  <option value="">Walk-in Patron / Non-Member</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.profiles?.full_name || 'Member'} ({m.membership_number}) — {m.membership_plans?.tier || 'MEMBER'} (
                      {m.membership_plans?.shop_discount_percent ?? 0}% off)
                    </option>
                  ))}
                </select>

                {selectedMember && (
                  <div className="p-2 rounded bg-emerald-950/40 border border-emerald-800/60 text-[11px] text-emerald-300">
                    Active Member tier: <strong className="font-bold">{selectedMember.membership_plans?.tier}</strong> ({memberDiscountPercent}% discount applied server-side)
                  </div>
                )}
              </div>

              {/* Additional Customer Info for Online or Delivery */}
              {(!selectedMemberId || activeTab === 'ONLINE_ORDER') && (
                <div className="space-y-2 text-xs pt-1 border-t border-zinc-800">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Customer Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-8 text-xs bg-zinc-950"
                    />
                    <Input
                      placeholder="Phone Number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-8 text-xs bg-zinc-950"
                    />
                  </div>

                  {activeTab === 'ONLINE_ORDER' && (
                    <>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setFulfillmentType('PICKUP')}
                          className={`flex-1 py-1.5 text-xs rounded border transition-colors cursor-pointer ${
                            fulfillmentType === 'PICKUP'
                              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                              : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                          }`}
                        >
                          Club Pickup
                        </button>
                        <button
                          type="button"
                          onClick={() => setFulfillmentType('DELIVERY')}
                          className={`flex-1 py-1.5 text-xs rounded border transition-colors cursor-pointer ${
                            fulfillmentType === 'DELIVERY'
                              ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
                              : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                          }`}
                        >
                          Home Delivery
                        </button>
                      </div>

                      {fulfillmentType === 'DELIVERY' && (
                        <div>
                          <label className="block text-zinc-400 text-[11px] mb-1">
                            Delivery Street Address *
                          </label>
                          <textarea
                            rows={2}
                            placeholder="Full home or apartment address with postal code..."
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            className="w-full rounded border border-zinc-700 bg-zinc-950 p-2 text-xs text-zinc-200"
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Cart Items List */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-xs font-semibold text-zinc-300">Selected Items ({cart.length})</span>

                {cart.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div
                        key={item.product.id}
                        className="p-2 rounded bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5 flex-1 pr-2">
                          <div className="font-medium text-zinc-100 line-clamp-1">{item.product.name}</div>
                          <div className="text-[10px] text-zinc-500 font-mono">
                            {formatCurrency(item.product.price)} each
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, -1)}
                            className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center text-xs"
                          >
                            -
                          </button>
                          <span className="font-bold text-white text-xs w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.product.id, 1)}
                            className="h-6 w-6 rounded bg-zinc-800 hover:bg-zinc-700 text-white font-bold flex items-center justify-center text-xs"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.product.id)}
                            className="text-zinc-500 hover:text-rose-400 ml-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-500 text-xs font-sans">
                    No items added yet. Click &quot;Add&quot; on products from catalog.
                  </div>
                )}
              </div>

              {/* Price Calculation Summary */}
              {cart.length > 0 && (
                <div className="space-y-1.5 pt-3 border-t border-zinc-800 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-zinc-200">{formatCurrency(cartSubtotal)}</span>
                  </div>

                  {cartDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Member Tier Discount ({memberDiscountPercent}%):</span>
                      <span className="font-mono">-{formatCurrency(cartDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-zinc-800">
                    <span>Total Payable:</span>
                    <span className="font-mono text-emerald-400">{formatCurrency(cartTotal)}</span>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full mt-3 font-semibold"
                    isLoading={isLoading}
                    onClick={() => handleSubmitOrder(activeTab === 'POS' ? 'COUNTER' : 'ONLINE')}
                  >
                    <Receipt className="h-4 w-4 mr-1.5" />
                    <span>Confirm & Process Order</span>
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ORDER DETAILS MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-xl border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-400" />
                  <span>Order Details — {selectedOrder.order_number}</span>
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Placed on {formatDateTime(selectedOrder.created_at)}
                </CardDescription>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800/80">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Customer</div>
                  <div className="text-zinc-200 font-medium mt-0.5">
                    {selectedOrder.members?.profiles?.full_name || selectedOrder.customer_name || 'Walk-in'}
                  </div>
                  {selectedOrder.customer_phone && (
                    <div className="text-[11px] text-zinc-400">{selectedOrder.customer_phone}</div>
                  )}
                  {selectedOrder.customer_email && (
                    <div className="text-[11px] text-zinc-400">{selectedOrder.customer_email}</div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] text-zinc-500 uppercase font-bold">Fulfillment & Channel</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline">{selectedOrder.order_channel}</Badge>
                    <Badge variant={selectedOrder.fulfillment_type === 'DELIVERY' ? 'warning' : 'outline'}>
                      {selectedOrder.fulfillment_type}
                    </Badge>
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">
                      {selectedOrder.delivery_address}
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Lifecycle Timeline Banner */}
              <div className="space-y-3 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Order Processing Status:</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        selectedOrder.status === 'COMPLETED'
                          ? 'success'
                          : selectedOrder.status === 'CANCELLED'
                          ? 'destructive'
                          : 'warning'
                      }
                      className="text-xs"
                    >
                      {selectedOrder.status}
                    </Badge>
                    {selectedOrder.fulfillment_status && (
                      <Badge variant="outline" className="text-xs text-emerald-400 border-emerald-800">
                        {selectedOrder.fulfillment_status.replace(/_/g, ' ')}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Timeline Progress */}
                <div className="pt-2 border-t border-zinc-800/80 grid grid-cols-4 gap-2 text-[10px]">
                  <div className={`p-2 rounded border ${selectedOrder.created_at ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                    <div className="font-bold flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      <span>1. Placed</span>
                    </div>
                    <div className="text-[9px] opacity-75 mt-0.5">{formatDateTime(selectedOrder.created_at)}</div>
                  </div>

                  <div className={`p-2 rounded border ${selectedOrder.confirmed_at ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                    <div className="font-bold flex items-center gap-1">
                      <CheckCircle className="h-2.5 w-2.5" />
                      <span>2. Confirmed</span>
                    </div>
                    <div className="text-[9px] opacity-75 mt-0.5">
                      {selectedOrder.confirmed_at ? formatDateTime(selectedOrder.confirmed_at) : 'Pending'}
                    </div>
                  </div>

                  <div className={`p-2 rounded border ${selectedOrder.ready_at ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                    <div className="font-bold flex items-center gap-1">
                      <PackageCheck className="h-2.5 w-2.5" />
                      <span>{selectedOrder.fulfillment_type === 'DELIVERY' ? '3. Dispatched' : '3. Ready'}</span>
                    </div>
                    <div className="text-[9px] opacity-75 mt-0.5">
                      {selectedOrder.ready_at ? formatDateTime(selectedOrder.ready_at) : 'Pending'}
                    </div>
                  </div>

                  <div className={`p-2 rounded border ${selectedOrder.completed_at ? 'bg-emerald-950/40 border-emerald-900/60 text-emerald-300' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                    <div className="font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      <span>{selectedOrder.fulfillment_type === 'DELIVERY' ? '4. Delivered' : '4. Collected'}</span>
                    </div>
                    <div className="text-[9px] opacity-75 mt-0.5">
                      {selectedOrder.completed_at ? formatDateTime(selectedOrder.completed_at) : 'Pending'}
                    </div>
                  </div>
                </div>

                {selectedOrder.cancelled_at && (
                  <div className="p-2.5 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs">
                    <div className="font-bold flex items-center gap-1">
                      <RotateCcw className="h-3 w-3" />
                      <span>Order Cancelled & Stock Restored</span>
                    </div>
                    <div className="text-[11px] text-rose-400/90 mt-0.5">
                      {formatDateTime(selectedOrder.cancelled_at)}
                      {selectedOrder.cancellation_reason && ` — ${selectedOrder.cancellation_reason}`}
                    </div>
                  </div>
                )}
              </div>

              {/* Order Items Table */}
              <div className="space-y-1">
                <div className="text-xs font-semibold text-zinc-300">Ordered Products</div>
                <div className="rounded-lg border border-zinc-800 overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase">
                      <tr>
                        <th className="py-2 px-3">Item / SKU</th>
                        <th className="py-2 px-3 text-center">Qty</th>
                        <th className="py-2 px-3 text-right">Unit Price</th>
                        <th className="py-2 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {selectedOrder.shop_order_items && selectedOrder.shop_order_items.length > 0 ? (
                        selectedOrder.shop_order_items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 px-3 font-sans">
                              <div className="text-zinc-200 font-medium">
                                {item.products?.name || 'Catalog Item'}
                              </div>
                              <div className="text-[10px] font-mono text-zinc-500">
                                {item.products?.sku || item.product_id}
                              </div>
                            </td>
                            <td className="py-2 px-3 text-center font-bold text-white">{item.quantity}</td>
                            <td className="py-2 px-3 text-right text-zinc-400">
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td className="py-2 px-3 text-right text-white font-semibold">
                              {formatCurrency(item.total_price)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-4 font-sans text-zinc-500">
                            No item breakdown available.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="space-y-1 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-zinc-200">{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Member Discount Applied:</span>
                    <span className="font-mono">-{formatCurrency(selectedOrder.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-white pt-1 border-t border-zinc-800">
                  <span>Final Charged Amount:</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-zinc-800">
                <div>
                  {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                    <Button
                      variant="danger"
                      size="sm"
                      isLoading={isLoading}
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      className="gap-1.5 text-xs"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Cancel & Restock Stock</span>
                    </Button>
                  )}
                </div>

                <div className="flex gap-2">
                  {/* Contextual Next Step Button */}
                  {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                    <>
                      {/* Pickup Flow */}
                      {selectedOrder.fulfillment_type === 'PICKUP' && (
                        <>
                          {(!selectedOrder.fulfillment_status || selectedOrder.fulfillment_status === 'PENDING') && (
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={isLoading}
                              onClick={() => handleUpdateFulfillment(selectedOrder.id, 'CONFIRMED')}
                              className="gap-1 text-xs"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Confirm Order</span>
                            </Button>
                          )}
                          {selectedOrder.fulfillment_status === 'CONFIRMED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={isLoading}
                              onClick={() => handleUpdateFulfillment(selectedOrder.id, 'READY_FOR_PICKUP')}
                              className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-500"
                            >
                              <PackageCheck className="h-3.5 w-3.5" />
                              <span>Ready for Pickup</span>
                            </Button>
                          )}
                          {selectedOrder.fulfillment_status === 'READY_FOR_PICKUP' && (
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={isLoading}
                              onClick={() => handleUpdateFulfillment(selectedOrder.id, 'COLLECTED')}
                              className="gap-1 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Mark Collected & Complete</span>
                            </Button>
                          )}
                        </>
                      )}

                      {/* Delivery Flow */}
                      {selectedOrder.fulfillment_type === 'DELIVERY' && (
                        <>
                          {(!selectedOrder.fulfillment_status || selectedOrder.fulfillment_status === 'PENDING') && (
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={isLoading}
                              onClick={() => handleUpdateFulfillment(selectedOrder.id, 'CONFIRMED')}
                              className="gap-1 text-xs"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Confirm Order</span>
                            </Button>
                          )}
                          {selectedOrder.fulfillment_status === 'CONFIRMED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={isLoading}
                              onClick={() => handleUpdateFulfillment(selectedOrder.id, 'PREPARING')}
                              className="gap-1 text-xs bg-amber-600 hover:bg-amber-500 text-white"
                            >
                              <Clock className="h-3.5 w-3.5" />
                              <span>Start Preparing</span>
                            </Button>
                          )}
                          {selectedOrder.fulfillment_status === 'PREPARING' && (
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={isLoading}
                              onClick={() => handleUpdateFulfillment(selectedOrder.id, 'OUT_FOR_DELIVERY')}
                              className="gap-1 text-xs bg-emerald-600 hover:bg-emerald-500"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>Dispatch / Out for Delivery</span>
                            </Button>
                          )}
                          {selectedOrder.fulfillment_status === 'OUT_FOR_DELIVERY' && (
                            <Button
                              variant="primary"
                              size="sm"
                              isLoading={isLoading}
                              onClick={() => handleUpdateFulfillment(selectedOrder.id, 'DELIVERED')}
                              className="gap-1 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Mark Delivered & Complete</span>
                            </Button>
                          )}
                        </>
                      )}
                    </>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOrder(null)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

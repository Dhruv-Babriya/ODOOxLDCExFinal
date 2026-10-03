'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import {
  createBarTableAction,
  updateBarTableStatusAction,
  createMenuCategoryAction,
  createMenuItemAction,
  toggleMenuItemAvailabilityAction,
  openCustomerTabAction,
  closeCustomerTabAction,
  createBarOrderAction,
  updateKitchenStatusAction,
} from '@/actions/bar';
import {
  Utensils,
  Users,
  CreditCard,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ChefHat,
  BellRing,
  Coffee,
  Receipt,
  Trash2,
  Layers,
} from 'lucide-react';

export interface BarTable {
  id: string;
  table_number: string;
  capacity: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
}

export interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  category_id: string | null;
  menu_categories?: { name: string } | null;
}

export interface Member {
  id: string;
  membership_number: string;
  status: string;
  profiles?: { full_name: string; email: string; phone: string | null } | null;
  membership_plans?: { tier: string; bar_discount_percent: number } | null;
}

export interface CustomerTab {
  id: string;
  tab_number: string | null;
  member_id: string | null;
  table_id: string | null;
  guest_name: string | null;
  credit_limit: number;
  status: string;
  opened_at: string;
  closed_at: string | null;
  notes: string | null;
  bar_tables?: { table_number: string } | null;
  members?: {
    membership_number: string;
    profiles?: { full_name: string } | null;
    membership_plans?: { tier: string; bar_discount_percent: number } | null;
  } | null;
  bar_orders?: Array<{ id: string; total_amount: number; order_status: string }>;
}

export interface BarOrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_instructions: string | null;
  menu_items?: { name: string } | null;
}

export interface BarOrder {
  id: string;
  order_number: string;
  tab_id: string | null;
  table_id: string | null;
  member_id: string | null;
  kitchen_status: string;
  order_status: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  notes: string | null;
  created_at: string;
  bar_tables?: { table_number: string } | null;
  customer_tabs?: { tab_number: string | null; guest_name: string | null } | null;
  members?: {
    membership_number: string;
    profiles?: { full_name: string } | null;
    membership_plans?: { tier: string } | null;
  } | null;
  bar_order_items?: BarOrderItem[];
}

export interface BarManagerProps {
  tables: BarTable[];
  categories: MenuCategory[];
  menuItems: MenuItem[];
  tabs: CustomerTab[];
  orders: BarOrder[];
  members: Member[];
}

export function BarManager({
  tables: initialTables,
  categories: initialCategories,
  menuItems: initialMenuItems,
  tabs: initialTabs,
  orders: initialOrders,
  members,
}: BarManagerProps) {
  const [tables, setTables] = useState<BarTable[]>(initialTables);
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [tabs, setTabs] = useState<CustomerTab[]>(initialTabs);
  const [orders, setOrders] = useState<BarOrder[]>(initialOrders);

  // Active top navigation tab
  const [activeView, setActiveView] = useState<'FLOOR' | 'POS' | 'KDS' | 'MENU'>('FLOOR');

  // Modals state
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isOpenTabModalOpen, setIsOpenTabModalOpen] = useState(false);
  const [isAddMenuItemOpen, setIsAddMenuItemOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [settlingTab, setSettlingTab] = useState<CustomerTab | null>(null);

  // Forms
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableCap, setNewTableCap] = useState('4');

  const [tabMemberId, setTabMemberId] = useState('');
  const [tabTableId, setTabTableId] = useState('');
  const [tabGuestName, setTabGuestName] = useState('');
  const [tabCreditLimit, setTabCreditLimit] = useState('2000');
  const [tabNotes, setTabNotes] = useState('');

  const [newItemName, setNewItemName] = useState('');
  const [newItemCatId, setNewItemCatId] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');

  const [newCatName, setNewCatName] = useState('');

  // POS Order Entry state
  const [orderTargetType, setOrderTargetType] = useState<'TABLE' | 'TAB' | 'WALK_IN'>('TABLE');
  const [orderTableId, setOrderTableId] = useState('');
  const [orderTabId, setOrderTabId] = useState('');
  const [orderMemberId, setOrderMemberId] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [orderCart, setOrderCart] = useState<
    Array<{ item: MenuItem; quantity: number; specialInstructions: string }>
  >([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('ALL');

  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Calculate Member Discount for POS
  let effectiveMemberId = orderMemberId;
  if (!effectiveMemberId && orderTabId) {
    const tabObj = tabs.find((t) => t.id === orderTabId);
    if (tabObj?.member_id) effectiveMemberId = tabObj.member_id;
  }
  const posMember = members.find((m) => m.id === effectiveMemberId);
  const posMemberDiscountPercent =
    posMember?.status === 'ACTIVE' ? posMember.membership_plans?.bar_discount_percent ?? 0 : 0;

  const cartSubtotal = orderCart.reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  const cartDiscount = (cartSubtotal * posMemberDiscountPercent) / 100;
  const cartTotal = Math.max(0, cartSubtotal - cartDiscount);

  // Add to POS Cart
  const addToOrderCart = (item: MenuItem) => {
    if (!item.is_available) {
      setFeedback({ type: 'error', message: `"${item.name}" is currently marked unavailable / sold out.` });
      return;
    }
    const existing = orderCart.find((c) => c.item.id === item.id);
    if (existing) {
      setOrderCart(
        orderCart.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c))
      );
    } else {
      setOrderCart([...orderCart, { item, quantity: 1, specialInstructions: '' }]);
    }
  };

  const updateCartLineQty = (itemId: string, delta: number) => {
    const line = orderCart.find((c) => c.item.id === itemId);
    if (!line) return;
    const newQty = line.quantity + delta;
    if (newQty <= 0) {
      setOrderCart(orderCart.filter((c) => c.item.id !== itemId));
    } else {
      setOrderCart(orderCart.map((c) => (c.item.id === itemId ? { ...c, quantity: newQty } : c)));
    }
  };

  const updateCartLineInstructions = (itemId: string, notes: string) => {
    setOrderCart(
      orderCart.map((c) => (c.item.id === itemId ? { ...c, specialInstructions: notes } : c))
    );
  };

  // Submit Bar Order
  const handlePlaceBarOrder = async () => {
    if (orderCart.length === 0) {
      setFeedback({ type: 'error', message: 'Order is empty. Add menu items first.' });
      return;
    }

    if (orderTargetType === 'TABLE' && !orderTableId) {
      setFeedback({ type: 'error', message: 'Please select a dining table for this order.' });
      return;
    }

    if (orderTargetType === 'TAB' && !orderTabId) {
      setFeedback({ type: 'error', message: 'Please select an open customer tab.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const res = await createBarOrderAction({
      tableId: orderTargetType === 'TABLE' ? orderTableId : null,
      tabId: orderTargetType === 'TAB' ? orderTabId : null,
      memberId: effectiveMemberId || null,
      items: orderCart.map((c) => ({
        menuItemId: c.item.id,
        quantity: c.quantity,
        specialInstructions: c.specialInstructions || null,
      })),
      notes: orderNotes || null,
    });

    setIsLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message || 'Order placed to kitchen!' });

      const targetTable = tables.find((t) => t.id === orderTableId);
      const targetTab = tabs.find((t) => t.id === orderTabId);

      const newOrder: BarOrder = {
        id: res.data.orderId,
        order_number: res.data.orderNumber,
        tab_id: orderTargetType === 'TAB' ? orderTabId : null,
        table_id: orderTargetType === 'TABLE' ? orderTableId : null,
        member_id: effectiveMemberId || null,
        kitchen_status: 'PENDING',
        order_status: 'PROCESSING',
        subtotal: cartSubtotal,
        discount_amount: cartDiscount,
        total_amount: res.data.totalAmount,
        notes: orderNotes || null,
        created_at: new Date().toISOString(),
        bar_tables: targetTable ? { table_number: targetTable.table_number } : null,
        customer_tabs: targetTab ? { tab_number: targetTab.tab_number, guest_name: targetTab.guest_name } : null,
        members: posMember
          ? {
              membership_number: posMember.membership_number,
              profiles: posMember.profiles,
              membership_plans: posMember.membership_plans,
            }
          : null,
        bar_order_items: orderCart.map((c) => ({
          id: Math.random().toString(),
          menu_item_id: c.item.id,
          quantity: c.quantity,
          unit_price: c.item.price,
          total_price: c.item.price * c.quantity,
          special_instructions: c.specialInstructions || null,
          menu_items: { name: c.item.name },
        })),
      };

      setOrders([newOrder, ...orders]);

      // If ordered on table, update table status to OCCUPIED
      if (orderTargetType === 'TABLE' && orderTableId) {
        setTables(tables.map((t) => (t.id === orderTableId ? { ...t, status: 'OCCUPIED' } : t)));
      }

      setOrderCart([]);
      setOrderNotes('');
      setActiveView('KDS');
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Kitchen Status Progression (PENDING -> PREPARING -> READY -> SERVED)
  const handleAdvanceKitchenStatus = async (
    orderId: string,
    nextStatus: 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED'
  ) => {
    setIsLoading(true);
    setFeedback(null);

    const res = await updateKitchenStatusAction({
      orderId,
      kitchenStatus: nextStatus,
    });

    setIsLoading(false);

    if (res.success) {
      setOrders(
        orders.map((o) =>
          o.id === orderId
            ? {
                ...o,
                kitchen_status: nextStatus,
                order_status: nextStatus === 'SERVED' ? 'COMPLETED' : o.order_status,
              }
            : o
        )
      );
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Table Status Switcher
  const handleToggleTableStatus = async (
    table: BarTable,
    newStatus: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'
  ) => {
    const res = await updateBarTableStatusAction({
      tableId: table.id,
      status: newStatus,
    });
    if (res.success) {
      setTables(tables.map((t) => (t.id === table.id ? { ...t, status: newStatus } : t)));
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Create Table
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await createBarTableAction({
      tableNumber: newTableNum,
      capacity: Number(newTableCap),
      status: 'AVAILABLE',
    });
    setIsLoading(false);
    if (res.success) {
      setTables([
        ...tables,
        {
          id: res.data.tableId,
          table_number: newTableNum.toUpperCase(),
          capacity: Number(newTableCap),
          status: 'AVAILABLE',
        },
      ]);
      setIsAddTableOpen(false);
      setNewTableNum('');
      setFeedback({ type: 'success', message: `Table ${newTableNum} added.` });
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Open Tab
  const handleOpenTab = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFeedback(null);

    const res = await openCustomerTabAction({
      memberId: tabMemberId || null,
      tableId: tabTableId || null,
      guestName: tabGuestName || null,
      creditLimit: Number(tabCreditLimit),
      notes: tabNotes || null,
    });

    setIsLoading(false);

    if (res.success) {
      const selectedTbl = tables.find((t) => t.id === tabTableId);
      const selectedMem = members.find((m) => m.id === tabMemberId);

      const newTab: CustomerTab = {
        id: res.data.tabId,
        tab_number: res.data.tabNumber,
        member_id: tabMemberId || null,
        table_id: tabTableId || null,
        guest_name: tabGuestName || (selectedMem?.profiles?.full_name ?? 'Patron'),
        credit_limit: Number(tabCreditLimit),
        status: 'OPEN',
        opened_at: new Date().toISOString(),
        closed_at: null,
        notes: tabNotes || null,
        bar_tables: selectedTbl ? { table_number: selectedTbl.table_number } : null,
        members: selectedMem
          ? {
              membership_number: selectedMem.membership_number,
              profiles: selectedMem.profiles,
              membership_plans: selectedMem.membership_plans,
            }
          : null,
        bar_orders: [],
      };

      setTabs([newTab, ...tabs]);

      if (tabTableId) {
        setTables(tables.map((t) => (t.id === tabTableId ? { ...t, status: 'OCCUPIED' } : t)));
      }

      setIsOpenTabModalOpen(false);
      setTabMemberId('');
      setTabTableId('');
      setTabGuestName('');
      setTabNotes('');
      setFeedback({ type: 'success', message: res.message || 'Tab opened successfully.' });
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Close Tab
  const handleConfirmCloseTab = async (tabId: string) => {
    setIsLoading(true);
    setFeedback(null);

    const res = await closeCustomerTabAction({ tabId });
    setIsLoading(false);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Tab settled and closed! Total bill amount: ${formatCurrency(
          res.data.outstandingAmount
        )}. Handed over to Developer 4 payment module.`,
      });

      setTabs(tabs.map((t) => (t.id === tabId ? { ...t, status: 'CLOSED' } : t)));

      // Free the table if bound
      const tabObj = tabs.find((t) => t.id === tabId);
      if (tabObj?.table_id) {
        setTables(tables.map((t) => (t.id === tabObj.table_id ? { ...t, status: 'AVAILABLE' } : t)));
      }

      setSettlingTab(null);
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Toggle Menu Item Availability
  const handleToggleItemAvailability = async (item: MenuItem) => {
    const newStatus = !item.is_available;
    const res = await toggleMenuItemAvailabilityAction({
      id: item.id,
      isAvailable: newStatus,
    });
    if (res.success) {
      setMenuItems(menuItems.map((m) => (m.id === item.id ? { ...m, is_available: newStatus } : m)));
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Create Menu Item
  const handleCreateMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await createMenuItemAction({
      name: newItemName,
      categoryId: newItemCatId || null,
      description: newItemDesc || null,
      price: Number(newItemPrice),
      isAvailable: true,
    });
    setIsLoading(false);
    if (res.success) {
      const cat = categories.find((c) => c.id === newItemCatId);
      setMenuItems([
        ...menuItems,
        {
          id: res.data.menuItemId,
          name: newItemName,
          description: newItemDesc || null,
          category_id: newItemCatId || null,
          price: Number(newItemPrice),
          is_available: true,
          menu_categories: cat ? { name: cat.name } : null,
        },
      ]);
      setIsAddMenuItemOpen(false);
      setNewItemName('');
      setNewItemDesc('');
      setNewItemPrice('');
      setFeedback({ type: 'success', message: `Menu item "${newItemName}" created.` });
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Create Menu Category
  const handleCreateMenuCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await createMenuCategoryAction({
      name: newCatName,
      displayOrder: categories.length + 1,
    });
    setIsLoading(false);
    if (res.success) {
      setCategories([...categories, { id: res.data.categoryId, name: newCatName, display_order: categories.length + 1 }]);
      setIsAddCategoryOpen(false);
      setNewCatName('');
      setFeedback({ type: 'success', message: `Menu category "${newCatName}" created.` });
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  // Open tabs
  const openTabsList = tabs.filter((t) => t.status === 'OPEN');

  // KDS Orders filtered into stages
  const pendingKds = orders.filter((o) => o.kitchen_status === 'PENDING');
  const preparingKds = orders.filter((o) => o.kitchen_status === 'PREPARING');
  const readyKds = orders.filter((o) => o.kitchen_status === 'READY');
  const servedKds = orders.filter((o) => o.kitchen_status === 'SERVED').slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Top Banner Navigation */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Utensils className="h-5 w-5 text-amber-400" />
            <span>Cafeteria, Floor Tables & Kitchen Operations</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Real-time table seating, member running tabs, POS order dispatch, and live Kitchen Display System (KDS).
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAddTableOpen(true)}
            className="text-xs gap-1 border-zinc-700 hover:bg-zinc-800"
          >
            <Users className="h-3.5 w-3.5 text-zinc-400" />
            <span>Add Table</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsOpenTabModalOpen(true)}
            className="text-xs gap-1 shadow-emerald-950/40"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Open Customer Tab</span>
          </Button>
        </div>
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

      {/* View Switcher Tabs */}
      <div className="flex border-b border-zinc-800 gap-6 text-xs font-semibold">
        <button
          onClick={() => setActiveView('FLOOR')}
          className={`pb-3 transition-colors relative flex items-center gap-1.5 cursor-pointer ${
            activeView === 'FLOOR' ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Floor Tables & Customer Tabs ({openTabsList.length} Open)</span>
          {activeView === 'FLOOR' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>

        <button
          onClick={() => setActiveView('POS')}
          className={`pb-3 transition-colors relative flex items-center gap-1.5 cursor-pointer ${
            activeView === 'POS' ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Quick POS Order Entry</span>
          {activeView === 'POS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>

        <button
          onClick={() => setActiveView('KDS')}
          className={`pb-3 transition-colors relative flex items-center gap-1.5 cursor-pointer ${
            activeView === 'KDS' ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <ChefHat className="h-4 w-4" />
          <span>Kitchen Display Screen (KDS)</span>
          {pendingKds.length > 0 && (
            <Badge variant="destructive" className="ml-1 text-[9px] py-0 px-1.5 animate-pulse">
              {pendingKds.length} New
            </Badge>
          )}
          {activeView === 'KDS' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>

        <button
          onClick={() => setActiveView('MENU')}
          className={`pb-3 transition-colors relative flex items-center gap-1.5 cursor-pointer ${
            activeView === 'MENU' ? 'text-amber-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Layers className="h-4 w-4" />
          <span>Menu Catalog ({menuItems.length} Items)</span>
          {activeView === 'MENU' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400" />
          )}
        </button>
      </div>

      {/* VIEW 1: FLOOR TABLES & OPEN TABS */}
      {activeView === 'FLOOR' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tables Grid (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <CardTitle className="text-sm font-semibold text-white">Floor Table Seating</CardTitle>
                  <p className="text-xs text-zinc-400">Click status button on any table to toggle immediately</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-[10px]">
                    {tables.filter((t) => t.status === 'AVAILABLE').length} Available
                  </Badge>
                  <Badge variant="warning" className="text-[10px]">
                    {tables.filter((t) => t.status === 'OCCUPIED').length} Occupied
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {tables.filter((t) => t.status === 'RESERVED').length} Reserved
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-4">
                {tables.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-xl border text-center space-y-2 transition-all ${
                      t.status === 'AVAILABLE'
                        ? 'bg-zinc-950/70 border-emerald-900/40 hover:border-emerald-600/60'
                        : t.status === 'OCCUPIED'
                        ? 'bg-amber-950/20 border-amber-900/50 hover:border-amber-600/60'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-base font-bold text-white tracking-wide">{t.table_number}</div>
                      <div className="text-[11px] text-zinc-400 flex items-center justify-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{t.capacity} Seats</span>
                      </div>
                    </div>

                    <div>
                      <Badge
                        variant={
                          t.status === 'AVAILABLE'
                            ? 'success'
                            : t.status === 'OCCUPIED'
                            ? 'warning'
                            : 'outline'
                        }
                        className="text-[10px]"
                      >
                        {t.status}
                      </Badge>
                    </div>

                    <div className="pt-1 flex items-center justify-center gap-1 border-t border-zinc-800/80">
                      <button
                        title="Mark Available"
                        onClick={() => handleToggleTableStatus(t, 'AVAILABLE')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          t.status === 'AVAILABLE'
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Free
                      </button>
                      <button
                        title="Mark Occupied"
                        onClick={() => handleToggleTableStatus(t, 'OCCUPIED')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          t.status === 'OCCUPIED'
                            ? 'bg-amber-600 text-white font-bold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Seat
                      </button>
                      <button
                        title="Mark Reserved"
                        onClick={() => handleToggleTableStatus(t, 'RESERVED')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                          t.status === 'RESERVED'
                            ? 'bg-zinc-700 text-white font-bold'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white'
                        }`}
                      >
                        Resv
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Running Customer Tabs (Right 1 col) */}
          <div className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-900/60 p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div>
                  <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
                    <span>Active Customer Tabs</span>
                  </CardTitle>
                  <p className="text-xs text-zinc-400">{openTabsList.length} open running tabs</p>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  className="h-7 text-xs"
                  onClick={() => setIsOpenTabModalOpen(true)}
                >
                  <Plus className="h-3 w-3" />
                  <span>Open Tab</span>
                </Button>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {openTabsList.length > 0 ? (
                  openTabsList.map((tab) => {
                    // Compute balance from non-cancelled orders on this tab
                    const tabBalance =
                      tab.bar_orders
                        ?.filter((o) => o.order_status !== 'CANCELLED')
                        .reduce((sum, o) => sum + Number(o.total_amount), 0) ?? 0;

                    return (
                      <div
                        key={tab.id}
                        className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-2 text-xs"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-bold text-emerald-400 font-mono text-sm">
                              {tab.tab_number || 'TAB-OPEN'}
                            </div>
                            <div className="text-zinc-200 font-medium mt-0.5">
                              {tab.members?.profiles?.full_name || tab.guest_name || 'Guest Patron'}
                            </div>
                          </div>
                          {tab.bar_tables && (
                            <Badge variant="outline" className="text-[10px]">
                              Table {tab.bar_tables.table_number}
                            </Badge>
                          )}
                        </div>

                        {tab.members && (
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1">
                            <span>{tab.members.membership_number}</span>
                            {tab.members.membership_plans && (
                              <Badge variant="gold" className="text-[9px] py-0 px-1">
                                {tab.members.membership_plans.tier} ({tab.members.membership_plans.bar_discount_percent}% off)
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="pt-2 border-t border-zinc-800 flex justify-between items-baseline">
                          <span className="text-zinc-400 text-[11px]">Outstanding Total:</span>
                          <span className="text-sm font-bold text-white font-mono">
                            {formatCurrency(tabBalance)}
                          </span>
                        </div>

                        <div className="pt-2 flex justify-end gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-7 text-xs w-full"
                            onClick={() => setSettlingTab(tab)}
                          >
                            <span>Close & Settle Bill</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 text-zinc-500 text-xs">
                    No active tabs. Click &quot;Open Customer Tab&quot; to begin.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* VIEW 2: QUICK POS ORDER ENTRY */}
      {activeView === 'POS' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Catalog Section (Left 2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-3" />
                  <Input
                    placeholder="Search menu items..."
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    className="pl-9 bg-zinc-950/70 border-zinc-800 text-xs"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  <button
                    onClick={() => setSelectedMenuCategory('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      selectedMenuCategory === 'ALL'
                        ? 'bg-amber-500 text-black font-bold'
                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                    }`}
                  >
                    All ({menuItems.length})
                  </button>
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedMenuCategory(c.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        selectedMenuCategory === c.id
                          ? 'bg-amber-500 text-black font-bold'
                          : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {menuItems
                .filter(
                  (m) =>
                    (selectedMenuCategory === 'ALL' || m.category_id === selectedMenuCategory) &&
                    m.name.toLowerCase().includes(menuSearch.toLowerCase())
                )
                .map((item) => (
                  <Card
                    key={item.id}
                    className={`border-zinc-800 bg-zinc-900/40 p-3.5 flex flex-col justify-between transition-all ${
                      !item.is_available ? 'opacity-40' : 'hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <span className="text-[10px] text-zinc-400 font-sans">
                          {item.menu_categories?.name || 'Item'}
                        </span>
                        {!item.is_available && (
                          <Badge variant="destructive" className="text-[9px] py-0 px-1">
                            Sold Out
                          </Badge>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-zinc-100 mt-1 line-clamp-1">{item.name}</h4>
                      {item.description && (
                        <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-2">{item.description}</p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                      <span className="text-sm font-bold text-white font-mono">
                        {formatCurrency(item.price)}
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={!item.is_available}
                        className="h-7 px-2.5 text-xs bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                        onClick={() => addToOrderCart(item)}
                      >
                        <Plus className="h-3 w-3" />
                        <span>Add</span>
                      </Button>
                    </div>
                  </Card>
                ))}
            </div>
          </div>

          {/* POS Ticket Cart Sidebar (Right 1 col) */}
          <div className="space-y-4">
            <Card className="border-zinc-800 bg-zinc-900/70 p-4 sticky top-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-bold text-white">Bar & Kitchen Ticket</span>
                </div>
                {orderCart.length > 0 && (
                  <button
                    onClick={() => setOrderCart([])}
                    className="text-[11px] text-zinc-500 hover:text-rose-400 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              {/* Order Target: Table, Tab, or Direct Walk-in */}
              <div className="space-y-2 text-xs">
                <label className="block text-zinc-300 font-medium">Order Destination</label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => setOrderTargetType('TABLE')}
                    className={`py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                      orderTargetType === 'TABLE'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    Table
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderTargetType('TAB')}
                    className={`py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                      orderTargetType === 'TAB'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    Tab
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderTargetType('WALK_IN')}
                    className={`py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                      orderTargetType === 'WALK_IN'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400'
                    }`}
                  >
                    Walk-in
                  </button>
                </div>

                {orderTargetType === 'TABLE' && (
                  <select
                    value={orderTableId}
                    onChange={(e) => setOrderTableId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-700 bg-zinc-950/70 text-xs text-zinc-200 mt-1"
                  >
                    <option value="">Select Table...</option>
                    {tables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.table_number} ({t.capacity} seats) — {t.status}
                      </option>
                    ))}
                  </select>
                )}

                {orderTargetType === 'TAB' && (
                  <select
                    value={orderTabId}
                    onChange={(e) => setOrderTabId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-700 bg-zinc-950/70 text-xs text-zinc-200 mt-1"
                  >
                    <option value="">Select Open Tab...</option>
                    {openTabsList.map((tab) => (
                      <option key={tab.id} value={tab.id}>
                        {tab.tab_number || 'Tab'} ({tab.members?.profiles?.full_name || tab.guest_name || 'Guest'})
                      </option>
                    ))}
                  </select>
                )}

                {/* Member selection for discount */}
                <div className="pt-2">
                  <label className="block text-zinc-400 text-[11px] mb-1">
                    Member Tier Discount Linkage (Optional)
                  </label>
                  <select
                    value={orderMemberId}
                    onChange={(e) => setOrderMemberId(e.target.value)}
                    className="w-full h-8 px-2 rounded border border-zinc-800 bg-zinc-950 text-xs text-zinc-300"
                  >
                    <option value="">None / Guest Walk-in</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.profiles?.full_name} ({m.membership_plans?.tier} — {m.membership_plans?.bar_discount_percent}% off)
                      </option>
                    ))}
                  </select>
                </div>

                {posMember && (
                  <div className="p-2 rounded bg-amber-950/30 border border-amber-800/50 text-[11px] text-amber-300">
                    Member Tier: <strong>{posMember.membership_plans?.tier}</strong> ({posMemberDiscountPercent}% Cafeteria Discount applied)
                  </div>
                )}
              </div>

              {/* Order Cart Items */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <span className="text-xs font-semibold text-zinc-300">Ticket Items ({orderCart.length})</span>

                {orderCart.length > 0 ? (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {orderCart.map((line) => (
                      <div
                        key={line.item.id}
                        className="p-2 rounded bg-zinc-950 border border-zinc-800/80 space-y-1 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-200 line-clamp-1">{line.item.name}</span>
                          <span className="font-mono text-zinc-400">{formatCurrency(line.item.price * line.quantity)}</span>
                        </div>

                        <div className="flex items-center justify-between">
                          <input
                            type="text"
                            placeholder="Special note (e.g. no sugar, extra sauce)"
                            value={line.specialInstructions}
                            onChange={(e) => updateCartLineInstructions(line.item.id, e.target.value)}
                            className="h-6 px-2 text-[10px] rounded bg-zinc-900 border border-zinc-800 text-zinc-300 w-44 placeholder:text-zinc-600"
                          />

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateCartLineQty(line.item.id, -1)}
                              className="h-5 w-5 rounded bg-zinc-800 text-white font-bold flex items-center justify-center text-xs"
                            >
                              -
                            </button>
                            <span className="font-bold text-white text-xs w-4 text-center">{line.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateCartLineQty(line.item.id, 1)}
                              className="h-5 w-5 rounded bg-zinc-800 text-white font-bold flex items-center justify-center text-xs"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-zinc-500 text-xs">
                    No items selected. Click &quot;Add&quot; on menu items.
                  </div>
                )}
              </div>

              {/* Price Calculations */}
              {orderCart.length > 0 && (
                <div className="space-y-1.5 pt-3 border-t border-zinc-800 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-zinc-200">{formatCurrency(cartSubtotal)}</span>
                  </div>

                  {cartDiscount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Member Discount ({posMemberDiscountPercent}%):</span>
                      <span className="font-mono">-{formatCurrency(cartDiscount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-bold text-white pt-1 border-t border-zinc-800">
                    <span>Total Bill:</span>
                    <span className="font-mono text-amber-400">{formatCurrency(cartTotal)}</span>
                  </div>

                  <Button
                    variant="primary"
                    size="md"
                    className="w-full mt-3 font-semibold bg-amber-500 hover:bg-amber-600 text-black"
                    isLoading={isLoading}
                    onClick={handlePlaceBarOrder}
                  >
                    <ChefHat className="h-4 w-4 mr-1.5" />
                    <span>Send Order to Kitchen</span>
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* VIEW 3: KITCHEN DISPLAY SCREEN (KDS) */}
      {activeView === 'KDS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-zinc-900/60 p-3 rounded-lg border border-zinc-800 text-xs">
            <div className="flex items-center gap-2">
              <ChefHat className="h-4 w-4 text-amber-400" />
              <span className="font-bold text-white">Live Kitchen Order Display (KDS)</span>
            </div>
            <div className="text-zinc-400">
              Flow: <strong className="text-white">PENDING</strong> &rarr; <strong className="text-white">PREPARING</strong> &rarr; <strong className="text-white">READY</strong> &rarr; <strong className="text-white">SERVED</strong>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* COLUMN 1: PENDING */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-rose-500">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <BellRing className="h-3.5 w-3.5" />
                  <span>1. New Orders</span>
                </span>
                <Badge variant="destructive" className="text-[10px]">{pendingKds.length}</Badge>
              </div>

              <div className="space-y-3">
                {pendingKds.map((o) => (
                  <Card key={o.id} className="border-rose-900/40 bg-zinc-950/80 p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-rose-400">{o.order_number}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {o.bar_tables ? `Table ${o.bar_tables.table_number}` : o.customer_tabs ? `Tab ${o.customer_tabs.tab_number || ''}` : 'Counter'}
                      </Badge>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-zinc-800 text-xs font-sans">
                      {o.bar_order_items?.map((item) => (
                        <div key={item.id} className="flex flex-col text-zinc-200">
                          <div className="flex justify-between font-semibold">
                            <span>{item.menu_items?.name || 'Item'}</span>
                            <span className="font-bold text-white text-sm">x{item.quantity}</span>
                          </div>
                          {item.special_instructions && (
                            <span className="text-[10px] text-amber-400 italic">
                              Note: {item.special_instructions}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500">
                      <span>{formatDateTime(o.created_at)}</span>
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-6 px-2 text-[10px] bg-amber-600 hover:bg-amber-700 text-white"
                        onClick={() => handleAdvanceKitchenStatus(o.id, 'PREPARING')}
                      >
                        Start Preparing &rarr;
                      </Button>
                    </div>
                  </Card>
                ))}
                {pendingKds.length === 0 && (
                  <div className="text-center py-10 text-zinc-600 text-xs">No pending orders.</div>
                )}
              </div>
            </div>

            {/* COLUMN 2: PREPARING */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>2. Preparing</span>
                </span>
                <Badge variant="warning" className="text-[10px]">{preparingKds.length}</Badge>
              </div>

              <div className="space-y-3">
                {preparingKds.map((o) => (
                  <Card key={o.id} className="border-amber-900/40 bg-zinc-950/80 p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-amber-400">{o.order_number}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {o.bar_tables ? `Table ${o.bar_tables.table_number}` : 'Tab/Bar'}
                      </Badge>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-zinc-800 text-xs font-sans">
                      {o.bar_order_items?.map((item) => (
                        <div key={item.id} className="flex flex-col text-zinc-200">
                          <div className="flex justify-between font-semibold">
                            <span>{item.menu_items?.name || 'Item'}</span>
                            <span className="font-bold text-white text-sm">x{item.quantity}</span>
                          </div>
                          {item.special_instructions && (
                            <span className="text-[10px] text-amber-400 italic">
                              Note: {item.special_instructions}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500">
                      <span>{formatDateTime(o.created_at)}</span>
                      <Button
                        size="sm"
                        variant="primary"
                        className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleAdvanceKitchenStatus(o.id, 'READY')}
                      >
                        Mark Ready &rarr;
                      </Button>
                    </div>
                  </Card>
                ))}
                {preparingKds.length === 0 && (
                  <div className="text-center py-10 text-zinc-600 text-xs">No orders in preparation.</div>
                )}
              </div>
            </div>

            {/* COLUMN 3: READY */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>3. Ready for Server</span>
                </span>
                <Badge variant="success" className="text-[10px]">{readyKds.length}</Badge>
              </div>

              <div className="space-y-3">
                {readyKds.map((o) => (
                  <Card key={o.id} className="border-emerald-900/40 bg-zinc-950/80 p-3 space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-mono font-bold text-emerald-400">{o.order_number}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {o.bar_tables ? `Table ${o.bar_tables.table_number}` : 'Bar'}
                      </Badge>
                    </div>

                    <div className="space-y-1 pt-1 border-t border-zinc-800 text-xs font-sans">
                      {o.bar_order_items?.map((item) => (
                        <div key={item.id} className="flex justify-between text-zinc-200 font-semibold">
                          <span>{item.menu_items?.name || 'Item'}</span>
                          <span className="font-bold text-white">x{item.quantity}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-[10px] text-zinc-500">
                      <span>{formatDateTime(o.created_at)}</span>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => handleAdvanceKitchenStatus(o.id, 'SERVED')}
                      >
                        Served to Table &rarr;
                      </Button>
                    </div>
                  </Card>
                ))}
                {readyKds.length === 0 && (
                  <div className="text-center py-10 text-zinc-600 text-xs">No orders waiting.</div>
                )}
              </div>
            </div>

            {/* COLUMN 4: SERVED / RECENT HISTORY */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b-2 border-zinc-700">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Coffee className="h-3.5 w-3.5" />
                  <span>4. Served</span>
                </span>
                <Badge variant="outline" className="text-[10px]">{servedKds.length}</Badge>
              </div>

              <div className="space-y-3">
                {servedKds.map((o) => (
                  <div key={o.id} className="p-2.5 rounded-lg border border-zinc-800 bg-zinc-950/40 text-xs opacity-75">
                    <div className="flex justify-between items-start font-mono text-[11px]">
                      <span className="text-zinc-400">{o.order_number}</span>
                      <Badge variant="outline" className="text-[8px] py-0 px-1">SERVED</Badge>
                    </div>
                    <div className="text-[11px] text-zinc-300 mt-1 font-sans">
                      {o.bar_tables ? `Table ${o.bar_tables.table_number}` : 'Tab/Bar'} &bull; {o.bar_order_items?.length} Items &bull; {formatCurrency(o.total_amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: MENU CATALOG MANAGEMENT */}
      {activeView === 'MENU' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Menu Catalog & Availability</h3>
              <p className="text-xs text-zinc-400">Toggle live availability (Sold out / Available) for kitchen staff</p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                onClick={() => setIsAddCategoryOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Add Category</span>
              </Button>

              <Button
                size="sm"
                variant="primary"
                className="text-xs"
                onClick={() => setIsAddMenuItemOpen(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Create Menu Item</span>
              </Button>
            </div>
          </div>

          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardContent className="p-0">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Item Name & Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Availability</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-800/30">
                      <td className="py-2.5 px-3 font-sans">
                        <div className="font-semibold text-zinc-100">{item.name}</div>
                        {item.description && (
                          <div className="text-[11px] text-zinc-400 line-clamp-1">{item.description}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-sans text-zinc-400">
                        {item.menu_categories?.name || 'General'}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-white">{formatCurrency(item.price)}</td>
                      <td className="py-2.5 px-3 font-sans">
                        <Badge variant={item.is_available ? 'success' : 'destructive'} className="text-[10px]">
                          {item.is_available ? 'Available' : 'Sold Out / Unavailable'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        <Button
                          variant={item.is_available ? 'secondary' : 'primary'}
                          size="sm"
                          className="h-7 px-2.5 text-[11px]"
                          onClick={() => handleToggleItemAvailability(item)}
                        >
                          {item.is_available ? 'Mark Sold Out' : 'Mark Available'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 1: ADD FLOOR TABLE */}
      {isAddTableOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-400" />
                <span>Add Cafeteria Table</span>
              </CardTitle>
              <button onClick={() => setIsAddTableOpen(false)} className="text-zinc-400 hover:text-white">&times;</button>
            </CardHeader>
            <form onSubmit={handleCreateTable}>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Table Number / Label *</label>
                  <Input
                    required
                    placeholder="e.g. T6 or Terrace-1"
                    value={newTableNum}
                    onChange={(e) => setNewTableNum(e.target.value.toUpperCase())}
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Seating Capacity *</label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={newTableCap}
                    onChange={(e) => setNewTableCap(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddTableOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>Save Table</Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 2: OPEN CUSTOMER TAB */}
      {isOpenTabModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-400" />
                <span>Open Running Customer Tab</span>
              </CardTitle>
              <button onClick={() => setIsOpenTabModalOpen(false)} className="text-zinc-400 hover:text-white">&times;</button>
            </CardHeader>

            <form onSubmit={handleOpenTab}>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Associate Member (Optional)</label>
                  <select
                    value={tabMemberId}
                    onChange={(e) => setTabMemberId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200"
                  >
                    <option value="">Non-Member / Guest Patron</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.profiles?.full_name} ({m.membership_number}) — {m.membership_plans?.tier} ({m.membership_plans?.bar_discount_percent}% off)
                      </option>
                    ))}
                  </select>
                </div>

                {!tabMemberId && (
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Guest Patron Name *</label>
                    <Input
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={tabGuestName}
                      onChange={(e) => setTabGuestName(e.target.value)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Floor Table</label>
                    <select
                      value={tabTableId}
                      onChange={(e) => setTabTableId(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200"
                    >
                      <option value="">No specific table (Bar tab)</option>
                      {tables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.table_number} ({t.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Credit Limit (₹)</label>
                    <Input
                      type="number"
                      min="0"
                      value={tabCreditLimit}
                      onChange={(e) => setTabCreditLimit(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Notes / Instructions</label>
                  <Input
                    placeholder="Guest company, special event, etc."
                    value={tabNotes}
                    onChange={(e) => setTabNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpenTabModalOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>Open Running Tab</Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 3: CLOSE & SETTLE TAB (FINANCIAL HANDOFF TO DEVELOPER 4) */}
      {settlingTab && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="h-4 w-4 text-emerald-400" />
                <span>Settle & Close Tab — {settlingTab.tab_number || 'Tab'}</span>
              </CardTitle>
              <button onClick={() => setSettlingTab(null)} className="text-zinc-400 hover:text-white">&times;</button>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              <div className="bg-zinc-950/80 p-3 rounded-lg border border-zinc-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Patron:</span>
                  <span className="font-semibold text-white">
                    {settlingTab.members?.profiles?.full_name || settlingTab.guest_name || 'Guest'}
                  </span>
                </div>
                {settlingTab.bar_tables && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Table:</span>
                    <span className="text-zinc-200">Table {settlingTab.bar_tables.table_number}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">Opened At:</span>
                  <span className="text-zinc-300">{formatDateTime(settlingTab.opened_at)}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 space-y-1">
                <div className="text-[11px] text-emerald-400 font-bold uppercase">
                  Developer 4 Payment Handoff
                </div>
                <p className="text-[11px] text-zinc-300">
                  Closing this tab will compute the exact unsettled total across all orders, release the associated table, and expose the financial balance to Developer 4&apos;s payment settlement register.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                <Button variant="ghost" size="sm" onClick={() => setSettlingTab(null)}>Cancel</Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isLoading}
                  onClick={() => handleConfirmCloseTab(settlingTab.id)}
                >
                  Confirm Close & Compute Final Bill
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 4: CREATE MENU ITEM */}
      {isAddMenuItemOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-400" />
                <span>Create Menu Item</span>
              </CardTitle>
              <button onClick={() => setIsAddMenuItemOpen(false)} className="text-zinc-400 hover:text-white">&times;</button>
            </CardHeader>

            <form onSubmit={handleCreateMenuItem}>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Item Name *</label>
                  <Input
                    required
                    placeholder="e.g. Avocado Toast with Poached Egg"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Menu Category</label>
                  <select
                    value={newItemCatId}
                    onChange={(e) => setNewItemCatId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200"
                  >
                    <option value="">Select Category...</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Price (₹) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="180.00"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Description / Nutrition</label>
                  <textarea
                    rows={2}
                    placeholder="Ingredients, protein breakdown, allergies..."
                    value={newItemDesc}
                    onChange={(e) => setNewItemDesc(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950/60 p-2.5 text-xs text-zinc-200"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddMenuItemOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>Save Menu Item</Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* MODAL 5: CREATE MENU CATEGORY */}
      {isAddCategoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="h-4 w-4 text-emerald-400" />
                <span>Add Menu Category</span>
              </CardTitle>
              <button onClick={() => setIsAddCategoryOpen(false)} className="text-zinc-400 hover:text-white">&times;</button>
            </CardHeader>

            <form onSubmit={handleCreateMenuCategory}>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Category Name *</label>
                  <Input
                    required
                    placeholder="e.g. Smoothies & Shakes"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddCategoryOpen(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>Create Category</Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

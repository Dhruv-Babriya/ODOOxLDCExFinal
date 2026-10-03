'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { adjustInventoryAction } from '@/actions/shop';
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  SlidersHorizontal,
  History,
  TrendingDown,
  TrendingUp,
  PackageCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from 'lucide-react';
import type { InventoryTransactionType } from '@/types/shared';

export interface ProductInventory {
  id: string;
  sku: string;
  name: string;
  price: number;
  low_stock_threshold: number;
  category_id: string | null;
  product_categories: { name: string } | null;
  inventory: { quantity_on_hand: number; updated_at: string } | null;
}

export interface InventoryTransaction {
  id: string;
  product_id: string;
  change_quantity: number;
  transaction_type: string;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  products?: { name: string; sku: string } | null;
  profiles?: { full_name: string; email: string } | null;
}

export interface InventoryManagerProps {
  products: ProductInventory[];
  transactions: InventoryTransaction[];
}

export function InventoryManager({ products: initialProducts, transactions: initialTransactions }: InventoryManagerProps) {
  const [products, setProducts] = useState<ProductInventory[]>(initialProducts);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>(initialTransactions);
  const [search, setSearch] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK' | 'HEALTHY'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modals
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Adjustment Form
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState<string>('PURCHASE_RECEIPT');
  const [adjustNotes, setAdjustNotes] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [quickRestockingId, setQuickRestockingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Extract unique categories
  const categories = Array.from(
    new Set(products.map((p) => p.product_categories?.name).filter(Boolean))
  ) as string[];

  // Map each product to its most recent transaction for fast inline audit visibility
  const recentMovementByProduct = useMemo(() => {
    const map = new Map<string, InventoryTransaction>();
    for (const tx of transactions) {
      if (!map.has(tx.product_id)) {
        map.set(tx.product_id, tx);
      }
    }
    return map;
  }, [transactions]);

  // Metrics
  const totalSkus = products.length;
  const outOfStockCount = useMemo(
    () => products.filter((p) => (p.inventory?.quantity_on_hand ?? 0) === 0).length,
    [products]
  );
  const lowStockCount = useMemo(
    () =>
      products.filter((p) => {
        const qty = p.inventory?.quantity_on_hand ?? 0;
        return qty > 0 && qty <= p.low_stock_threshold;
      }).length,
    [products]
  );
  const healthyCount = useMemo(
    () =>
      products.filter((p) => (p.inventory?.quantity_on_hand ?? 0) > p.low_stock_threshold).length,
    [products]
  );
  const totalUnits = useMemo(
    () => products.reduce((sum, p) => sum + (p.inventory?.quantity_on_hand ?? 0), 0),
    [products]
  );

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const qty = p.inventory?.quantity_on_hand ?? 0;
      const isZero = qty === 0;
      const isLow = qty > 0 && qty <= p.low_stock_threshold;
      const isHealthy = qty > p.low_stock_threshold;

      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === 'ALL' || p.product_categories?.name === selectedCategory;

      let matchesStockFilter = true;
      if (stockStatusFilter === 'OUT_OF_STOCK') matchesStockFilter = isZero;
      else if (stockStatusFilter === 'LOW_STOCK') matchesStockFilter = isLow;
      else if (stockStatusFilter === 'HEALTHY') matchesStockFilter = isHealthy;

      return matchesSearch && matchesCategory && matchesStockFilter;
    });
  }, [products, search, selectedCategory, stockStatusFilter]);

  const handleOpenAdjust = (productId?: string) => {
    setSelectedProductId(productId || (products[0]?.id ?? ''));
    setAdjustQty('');
    setAdjustType('PURCHASE_RECEIPT');
    setAdjustNotes('');
    setIsAdjustOpen(true);
  };

  const handleQuickRestock = async (productId: string, quantityToAdd: number = 5) => {
    setQuickRestockingId(productId);
    setFeedback(null);

    const res = await adjustInventoryAction({
      productId,
      changeQuantity: quantityToAdd,
      transactionType: 'PURCHASE_RECEIPT',
      notes: `Quick staff replenishment (+${quantityToAdd} units)`,
    });

    setQuickRestockingId(null);

    if (res.success) {
      setFeedback({
        type: 'success',
        message: res.message || `+${quantityToAdd} units added to inventory.`,
      });
      const newQty = res.data.newQuantity;

      setProducts((prev) =>
        prev.map((p) =>
          p.id === productId
            ? {
                ...p,
                inventory: {
                  quantity_on_hand: newQty,
                  updated_at: new Date().toISOString(),
                },
              }
            : p
        )
      );

      const targetProd = products.find((p) => p.id === productId);
      const newTx: InventoryTransaction = {
        id: Math.random().toString(),
        product_id: productId,
        change_quantity: quantityToAdd,
        transaction_type: 'PURCHASE_RECEIPT',
        reference_id: null,
        notes: `Quick staff replenishment (+${quantityToAdd} units)`,
        created_at: new Date().toISOString(),
        products: targetProd ? { name: targetProd.name, sku: targetProd.sku } : null,
        profiles: { full_name: 'Current Staff', email: 'staff@thechampionsclub.com' },
      };
      setTransactions((prev) => [newTx, ...prev]);
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !adjustQty || Number(adjustQty) === 0) {
      setFeedback({ type: 'error', message: 'Please specify a non-zero adjustment quantity.' });
      return;
    }

    setIsLoading(true);
    setFeedback(null);

    const res = await adjustInventoryAction({
      productId: selectedProductId,
      changeQuantity: Number(adjustQty),
      transactionType: adjustType as InventoryTransactionType,
      notes: adjustNotes || null,
    });

    setIsLoading(false);

    if (res.success) {
      setFeedback({ type: 'success', message: res.message || 'Stock updated successfully.' });
      const newQty = res.data.newQuantity;

      // Update local product state
      setProducts(
        products.map((p) =>
          p.id === selectedProductId
            ? {
                ...p,
                inventory: {
                  quantity_on_hand: newQty,
                  updated_at: new Date().toISOString(),
                },
              }
            : p
        )
      );

      // Add transaction to history list
      const targetProd = products.find((p) => p.id === selectedProductId);
      const newTx: InventoryTransaction = {
        id: Math.random().toString(),
        product_id: selectedProductId,
        change_quantity: Number(adjustQty),
        transaction_type: adjustType,
        reference_id: null,
        notes: adjustNotes || 'Manual stock adjustment',
        created_at: new Date().toISOString(),
        products: targetProd ? { name: targetProd.name, sku: targetProd.sku } : null,
        profiles: { full_name: 'Current Staff', email: 'staff@thechampionsclub.com' },
      };
      setTransactions([newTx, ...transactions]);

      setIsAdjustOpen(false);
    } else {
      setFeedback({ type: 'error', message: res.error });
    }
  };

  return (
    <div className="space-y-6">
      {/* 4-Stat Metric Grid with High-Contrast Action Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
          <div>
            <div className="text-zinc-400 text-xs font-medium">Catalog SKUs</div>
            <div className="text-2xl font-bold text-white mt-1">{totalSkus}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Active equipment</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-zinc-800/80 flex items-center justify-center text-zinc-400">
            <Boxes className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* OUT OF STOCK CRITICAL ALERT */}
        <Card
          tabIndex={0}
          role="button"
          aria-pressed={stockStatusFilter === 'OUT_OF_STOCK'}
          className={`border p-4 flex items-center justify-between cursor-pointer transition-all ${
            outOfStockCount > 0
              ? stockStatusFilter === 'OUT_OF_STOCK'
                ? 'bg-rose-950/80 border-rose-500 ring-2 ring-rose-500/50'
                : 'bg-rose-950/30 border-rose-900/60 hover:border-rose-700'
              : 'border-zinc-800 bg-zinc-900/60'
          }`}
          onClick={() =>
            setStockStatusFilter(stockStatusFilter === 'OUT_OF_STOCK' ? 'ALL' : 'OUT_OF_STOCK')
          }
        >
          <div>
            <div className="text-zinc-400 text-xs font-medium">Out of Stock</div>
            <div
              className={`text-2xl font-bold mt-1 ${
                outOfStockCount > 0 ? 'text-rose-400 font-extrabold' : 'text-zinc-400'
              }`}
            >
              {outOfStockCount}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {stockStatusFilter === 'OUT_OF_STOCK' ? 'Filtering 0 units (click to clear)' : 'Immediate restocking needed'}
            </div>
          </div>
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center ${
              outOfStockCount > 0 ? 'bg-rose-900/60 text-rose-300' : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            <XCircle className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* LOW STOCK ALERT */}
        <Card
          tabIndex={0}
          role="button"
          aria-pressed={stockStatusFilter === 'LOW_STOCK'}
          className={`border p-4 flex items-center justify-between cursor-pointer transition-all ${
            lowStockCount > 0
              ? stockStatusFilter === 'LOW_STOCK'
                ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500/50'
                : 'bg-amber-950/20 border-amber-900/60 hover:border-amber-700'
              : 'border-zinc-800 bg-zinc-900/60'
          }`}
          onClick={() =>
            setStockStatusFilter(stockStatusFilter === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')
          }
        >
          <div>
            <div className="text-zinc-400 text-xs font-medium">Low-Stock Warnings</div>
            <div
              className={`text-2xl font-bold mt-1 ${
                lowStockCount > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {lowStockCount}
            </div>
            <div className="text-[11px] text-zinc-500 mt-0.5">
              {stockStatusFilter === 'LOW_STOCK' ? 'Filtering low items (click to clear)' : '&le; Defined threshold'}
            </div>
          </div>
          <div
            className={`h-9 w-9 rounded-lg flex items-center justify-center ${
              lowStockCount > 0 ? 'bg-amber-950/80 text-amber-400' : 'bg-emerald-950/60 text-emerald-400'
            }`}
          >
            <AlertTriangle className="h-4.5 w-4.5" />
          </div>
        </Card>

        {/* TOTAL UNITS */}
        <Card className="border-zinc-800 bg-zinc-900/60 p-4 flex items-center justify-between">
          <div>
            <div className="text-zinc-400 text-xs font-medium">Total Physical Units</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{totalUnits}</div>
            <div className="text-[11px] text-zinc-500 mt-0.5">Unified inventory pool</div>
          </div>
          <div className="h-9 w-9 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center">
            <PackageCheck className="h-4.5 w-4.5" />
          </div>
        </Card>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`p-3 rounded-lg text-xs font-medium border flex items-center justify-between animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-white p-1"
            aria-label="Dismiss feedback"
          >
            &times;
          </button>
        </div>
      )}

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-0.5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span>Live Stock Register</span>
            <Badge variant="outline" className="text-[10px] font-normal border-zinc-700 text-zinc-400">
              Row-Level Concurrency Protected
            </Badge>
          </h3>
          <p className="text-xs text-zinc-400">
            Real-time stock quantities synced with point-of-sale checkout and online click-and-collect orders.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 border-zinc-700 hover:bg-zinc-800"
            onClick={() => setIsHistoryOpen(true)}
            aria-label="View inventory audit ledger"
          >
            <History className="h-3.5 w-3.5 text-zinc-400" />
            <span>Audit Trail ({transactions.length})</span>
          </Button>

          <Button
            size="sm"
            variant="primary"
            className="text-xs gap-1.5 shadow-emerald-950/40"
            onClick={() => handleOpenAdjust()}
            aria-label="Open manual stock adjustment dialog"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Manual Count / Restock</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar with Quick Filter Pills */}
      <Card className="border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="h-4 w-4 text-zinc-500 absolute left-3 top-3" />
            <Input
              placeholder="Search by SKU or item name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-950/70 border-zinc-800 text-xs"
              aria-label="Search products"
            />
          </div>

          <div className="md:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-zinc-800 bg-zinc-950/70 text-xs text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Filter by category"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Filter Pills (Phase 4 UX) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-zinc-800/60 text-xs">
          <span className="text-[11px] text-zinc-400 mr-1 font-medium">Status Filter:</span>
          <button
            type="button"
            onClick={() => setStockStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              stockStatusFilter === 'ALL'
                ? 'bg-zinc-800 text-white shadow-sm ring-1 ring-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
            }`}
          >
            All Items ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setStockStatusFilter('OUT_OF_STOCK')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              stockStatusFilter === 'OUT_OF_STOCK'
                ? 'bg-rose-950 border border-rose-700 text-rose-200 font-bold shadow-sm'
                : 'text-rose-400 hover:bg-rose-950/40'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Out of Stock ({outOfStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStockStatusFilter('LOW_STOCK')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              stockStatusFilter === 'LOW_STOCK'
                ? 'bg-amber-950 border border-amber-700 text-amber-200 font-bold shadow-sm'
                : 'text-amber-400 hover:bg-amber-950/40'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Low Stock ({lowStockCount})
          </button>
          <button
            type="button"
            onClick={() => setStockStatusFilter('HEALTHY')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
              stockStatusFilter === 'HEALTHY'
                ? 'bg-emerald-950 border border-emerald-700 text-emerald-200 font-bold shadow-sm'
                : 'text-emerald-400 hover:bg-emerald-950/40'
            }`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Healthy ({healthyCount})
          </button>
        </div>
      </Card>

      {/* Stock Table */}
      <Card className="border-zinc-800 bg-zinc-900/40">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-white">Stock Quantities & Movement</CardTitle>
          <Badge variant="outline" className="text-xs">
            Showing {filteredProducts.length} of {products.length} Items
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="border-b border-zinc-800 text-zinc-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th scope="col" className="py-2.5 px-3">SKU</th>
                  <th scope="col" className="py-2.5 px-3">Product Name</th>
                  <th scope="col" className="py-2.5 px-3">Category</th>
                  <th scope="col" className="py-2.5 px-3">Unit Price</th>
                  <th scope="col" className="py-2.5 px-3">Threshold</th>
                  <th scope="col" className="py-2.5 px-3">On Hand</th>
                  <th scope="col" className="py-2.5 px-3">Condition</th>
                  <th scope="col" className="py-2.5 px-3">Recent Movement</th>
                  <th scope="col" className="py-2.5 px-3 text-right">Quick Restock / Adjust</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => {
                    const qty = p.inventory?.quantity_on_hand ?? 0;
                    const threshold = p.low_stock_threshold;
                    const isZero = qty === 0;
                    const isLow = qty > 0 && qty <= threshold;
                    const latestTx = recentMovementByProduct.get(p.id);
                    const isQuickLoading = quickRestockingId === p.id;

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          isZero
                            ? 'bg-rose-950/15 hover:bg-rose-950/30'
                            : isLow
                            ? 'bg-amber-950/10 hover:bg-amber-950/20'
                            : 'hover:bg-zinc-800/30'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{p.sku}</td>
                        <td className="py-2.5 px-3 font-sans text-zinc-200 font-medium">
                          <div>{p.name}</div>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-zinc-400">
                          {p.product_categories?.name || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">{formatCurrency(p.price)}</td>
                        <td className="py-2.5 px-3 text-zinc-400">&le; {threshold}</td>
                        <td className="py-2.5 px-3 font-bold text-base">
                          <span
                            className={
                              isZero
                                ? 'text-rose-400 font-extrabold underline decoration-rose-500'
                                : isLow
                                ? 'text-amber-400'
                                : 'text-white'
                            }
                          >
                            {qty}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {isZero ? (
                            <Badge
                              variant="destructive"
                              className="gap-1 text-[10px] bg-rose-950 border border-rose-600 text-rose-300 font-bold"
                            >
                              <XCircle className="h-3 w-3" />
                              <span>OUT OF STOCK</span>
                            </Badge>
                          ) : isLow ? (
                            <Badge
                              variant="warning"
                              className="gap-1 text-[10px] bg-amber-950/80 border border-amber-600 text-amber-300"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              <span>Low Stock (&le;{threshold})</span>
                            </Badge>
                          ) : (
                            <Badge
                              variant="success"
                              className="gap-1 text-[10px] bg-emerald-950/60 border border-emerald-600 text-emerald-300"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Healthy</span>
                            </Badge>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-sans">
                          {latestTx ? (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              {latestTx.change_quantity > 0 ? (
                                <span className="text-emerald-400 font-bold flex items-center font-mono">
                                  <ArrowUpRight className="h-3 w-3 mr-0.5" />
                                  +{latestTx.change_quantity}
                                </span>
                              ) : (
                                <span className="text-rose-400 font-bold flex items-center font-mono">
                                  <ArrowDownRight className="h-3 w-3 mr-0.5" />
                                  {latestTx.change_quantity}
                                </span>
                              )}
                              <span
                                className="text-zinc-500 text-[10px] truncate max-w-[130px]"
                                title={latestTx.notes || latestTx.transaction_type}
                              >
                                ({latestTx.transaction_type.replace(/_/g, ' ')})
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-600 text-[11px] italic">No recent tx</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-sans">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Phase 4 Quick Restock Button */}
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isQuickLoading}
                              className="h-7 px-2 text-[10px] gap-1 border-emerald-800/80 text-emerald-400 hover:bg-emerald-950/50 hover:text-emerald-300"
                              onClick={() => handleQuickRestock(p.id, 5)}
                              aria-label={`Quick restock 5 units of ${p.name}`}
                            >
                              {isQuickLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Zap className="h-3 w-3 fill-emerald-400/20" />
                              )}
                              <span>+5 Restock</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-[11px] gap-1 border-zinc-800 hover:bg-zinc-800"
                              onClick={() => handleOpenAdjust(p.id)}
                              aria-label={`Open custom adjustment for ${p.name}`}
                            >
                              <SlidersHorizontal className="h-3 w-3 text-zinc-400" />
                              <span>Adjust</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-10 font-sans text-zinc-500">
                      No inventory records matching current search or filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ADJUST INVENTORY MODAL */}
      {isAdjustOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-md border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-emerald-400" />
                <span>Adjust Inventory / Restock</span>
              </CardTitle>
              <button
                onClick={() => setIsAdjustOpen(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </CardHeader>

            <form onSubmit={handleAdjustSubmit}>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Target Product *</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name} (Current: {p.inventory?.quantity_on_hand ?? 0})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">
                      Change Quantity (+ / -) *
                    </label>
                    <Input
                      type="number"
                      required
                      placeholder="e.g. 20 or -2"
                      value={adjustQty}
                      onChange={(e) => setAdjustQty(e.target.value)}
                    />
                    <span className="text-[10px] text-zinc-500 mt-1 block">
                      Use positive to add, negative to deduct.
                    </span>
                  </div>

                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Transaction Reason *</label>
                    <select
                      value={adjustType}
                      onChange={(e) => setAdjustType(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-zinc-700 bg-zinc-950/60 text-xs text-zinc-200"
                    >
                      <option value="PURCHASE_RECEIPT">Purchase / Restock (+)</option>
                      <option value="ADJUSTMENT">Audit Adjustment (+/-)</option>
                      <option value="RETURN">Customer Return (+)</option>
                      <option value="SALE_COUNTER">Manual Counter Sale (-)</option>
                      <option value="SALE_ONLINE">Online Dispatch (-)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Audit Notes / Vendor Ref</label>
                  <Input
                    placeholder="Invoice #, Supplier delivery note, breakage reason..."
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-zinc-800">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAdjustOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" isLoading={isLoading}>
                    Confirm Stock Update
                  </Button>
                </div>
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* AUDIT HISTORY DRAWER / MODAL */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <Card className="w-full max-w-3xl border-zinc-800 bg-zinc-900 shadow-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-zinc-800">
              <div>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <History className="h-4 w-4 text-emerald-400" />
                  <span>Traceable Inventory Ledger</span>
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400">
                  Authoritative history of all purchases, counter sales, online sales, and returns
                </CardDescription>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-zinc-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
            </CardHeader>

            <CardContent className="pt-4 text-xs">
              <div className="max-h-96 overflow-y-auto rounded-lg border border-zinc-800">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950/70 border-b border-zinc-800 text-zinc-400 text-[10px] uppercase font-semibold sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Product / SKU</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Quantity</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px]">
                    {transactions.length > 0 ? (
                      transactions.map((tx) => {
                        const isPositive = tx.change_quantity > 0;

                        return (
                          <tr key={tx.id} className="hover:bg-zinc-800/30">
                            <td className="py-2 px-3 text-zinc-400 font-sans">
                              {formatDateTime(tx.created_at)}
                            </td>
                            <td className="py-2 px-3 font-sans">
                              <span className="text-zinc-200 font-medium">
                                {tx.products?.name || 'Item'}
                              </span>
                              {tx.products?.sku && (
                                <span className="text-[10px] text-zinc-500 font-mono ml-1.5">
                                  [{tx.products.sku}]
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-sans">
                              <Badge variant="outline" className="text-[9px]">
                                {tx.transaction_type}
                              </Badge>
                            </td>
                            <td className="py-2 px-3 text-right font-bold">
                              <span
                                className={`flex items-center justify-end gap-1 ${
                                  isPositive ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {isPositive ? (
                                  <TrendingUp className="h-3 w-3" />
                                ) : (
                                  <TrendingDown className="h-3 w-3" />
                                )}
                                <span>{isPositive ? `+${tx.change_quantity}` : tx.change_quantity}</span>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-zinc-400 font-sans text-[11px] max-w-xs truncate">
                              {tx.notes || '-'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="text-center py-6 font-sans text-zinc-500">
                          No transactions recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-4 border-t border-zinc-800 mt-4">
                <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

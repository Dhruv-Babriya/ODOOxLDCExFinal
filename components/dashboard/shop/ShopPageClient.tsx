'use client';

import { useState } from 'react';
import {
  ShopOrdersManager,
  type ShopOrder,
  type ShopOrderProduct,
  type ShopMember,
} from './ShopOrdersManager';
import { ProductManager, type Category, type Product } from './ProductManager';
import { ShoppingBag, Package } from 'lucide-react';

interface ShopPageClientProps {
  initialOrders: ShopOrder[];
  initialProducts: (Product & ShopOrderProduct)[];
  categories: Category[];
  members: ShopMember[];
}

export function ShopPageClient({
  initialOrders,
  initialProducts,
  categories,
  members,
}: ShopPageClientProps) {
  const [activeView, setActiveView] = useState<'ORDERS' | 'PRODUCTS'>('ORDERS');

  return (
    <div className="space-y-6">
      {/* View Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveView('ORDERS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeView === 'ORDERS'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Orders & Point of Sale (POS)</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-black/30 font-mono">
            {initialOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveView('PRODUCTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeView === 'PRODUCTS'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Product Catalog & Categories</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-black/30 font-mono">
            {initialProducts.length}
          </span>
        </button>
      </div>

      {activeView === 'ORDERS' ? (
        <ShopOrdersManager
          initialOrders={initialOrders}
          products={initialProducts}
          members={members}
        />
      ) : (
        <ProductManager
          initialProducts={initialProducts}
          categories={categories}
        />
      )}
    </div>
  );
}

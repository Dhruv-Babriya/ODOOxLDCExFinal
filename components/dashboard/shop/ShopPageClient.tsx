'use client';

import { useState } from 'react';
import {
  ShopOrdersManager,
  type ShopOrder,
  type ShopOrderProduct,
  type ShopMember,
} from './ShopOrdersManager';
import { ProductManager, type Category, type Product } from './ProductManager';
import { MemberProShop } from './MemberProShop';
import { ShoppingBag, Package, Sparkles, Store } from 'lucide-react';
import type { PortalProduct } from '@/types/shared';

interface ShopPageClientProps {
  initialOrders: ShopOrder[];
  initialProducts: (Product & ShopOrderProduct)[];
  categories: Category[];
  members: ShopMember[];
  userRole?: string;
  isMemberPortal?: boolean;
}

export function ShopPageClient({
  initialOrders,
  initialProducts,
  categories,
  members,
  userRole,
  isMemberPortal = false,
}: ShopPageClientProps) {
  const [activeView, setActiveView] = useState<'ORDERS' | 'PRODUCTS' | 'PREVIEW'>('ORDERS');

  const normalizedRole = (userRole || '').toUpperCase();
  const isMemberOrOwner =
    isMemberPortal ||
    normalizedRole === 'MEMBER' ||
    normalizedRole === 'OWNER' ||
    (Boolean(userRole) && !['STAFF', 'ADMIN', 'MANAGER'].includes(normalizedRole));

  const portalProducts: PortalProduct[] = initialProducts.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    description: p.description,
    price: p.price,
    low_stock_threshold: p.low_stock_threshold,
    is_active: p.is_active,
    category_id: p.category_id,
    image_url: (p as any).image_url,
    product_categories: p.product_categories,
    inventory: p.inventory,
  }));

  // For members and within the member portal, completely omit the "Orders & Point of Sale (POS)"
  // and "Product Catalog & Inventory" tabs, rendering purely the member storefront.
  if (isMemberOrOwner) {
    return (
      <MemberProShop
        products={portalProducts}
        categories={categories}
        member={members[0] || null}
        isStandalonePage={true}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveView('ORDERS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeView === 'ORDERS'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <ShoppingBag className="h-4 w-4" />
          <span>Orders &amp; Point of Sale (POS)</span>
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
          <span>Product Catalog &amp; Inventory</span>
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-black/30 font-mono">
            {initialProducts.length}
          </span>
        </button>

        <button
          onClick={() => setActiveView('PREVIEW')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
            activeView === 'PREVIEW'
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
          }`}
        >
          <Sparkles className="h-4 w-4 text-emerald-300" />
          <span>Pro Shop</span>
        </button>
      </div>

      {activeView === 'ORDERS' ? (
        <ShopOrdersManager
          initialOrders={initialOrders}
          products={initialProducts}
          members={members}
        />
      ) : activeView === 'PRODUCTS' ? (
        <ProductManager
          initialProducts={initialProducts}
          categories={categories}
        />
      ) : (
        <div className="space-y-4">
          <div className="p-3.5 bg-zinc-900/70 border border-emerald-500/30 rounded-xl text-xs text-zinc-300 flex items-center justify-between shadow-md">
            <span className="flex items-center gap-2 font-medium">
              <Store className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Pro Shop:</strong> This interactive catalog demonstrates the member-facing Pro Shop interface with tier discounts, live inventory badges, and express 1-click checkout.
              </span>
            </span>
          </div>
          <MemberProShop
            products={portalProducts}
            categories={categories}
            member={members[0] || null}
            isStandalonePage={true}
          />
        </div>
      )}
    </div>
  );
}

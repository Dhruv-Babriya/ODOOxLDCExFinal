import { createClient } from '@/lib/supabase/server';
import { PublicShopCatalog } from '@/components/public/PublicShopCatalog';
import { Badge } from '@/components/ui/badge';
import { ShoppingBag, Sparkles, ShieldCheck, Truck, Store } from 'lucide-react';

export const revalidate = 0; // Fresh inventory availability for public shop visitors

export default async function ShopPage() {
  const supabase = await createClient();

  const [
    { data: products },
    { data: categories },
  ] = await Promise.all([
    supabase
      .from('products')
      .select(`
        id,
        sku,
        name,
        description,
        price,
        low_stock_threshold,
        is_active,
        category_id,
        image_url,
        product_categories (name),
        inventory (quantity_on_hand)
      `)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('product_categories')
      .select('id, name')
      .order('name'),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 space-y-12">
      {/* SHOP HERO HEADER */}
      <section className="relative overflow-hidden border-b border-zinc-800/80 bg-gradient-to-b from-zinc-900/90 via-zinc-950 to-zinc-950 pt-16 pb-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/40 px-4 py-1.5 text-xs font-semibold text-emerald-300 shadow-md">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Official Champions Club Pro Shop</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight max-w-3xl mx-auto leading-tight">
            Championship Athletic Gear & <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              Exclusive Member Privileges
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 max-w-2xl mx-auto leading-relaxed">
            Order online for fast club reception pickup or express home delivery. All official club members automatically unlock up to <strong>15% discount</strong> across bats, rackets, balls & court activewear.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-zinc-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> 100% Genuine Gear
            </span>
            <span className="flex items-center gap-1.5">
              <Store className="h-4 w-4 text-emerald-400" /> 30-Min Front Desk Pickup
            </span>
            <span className="flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-emerald-400" /> Express Home Dispatch
            </span>
          </div>
        </div>
      </section>

      {/* MAIN CATALOG CONTAINER */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <PublicShopCatalog
          initialProducts={(products || []) as unknown as React.ComponentProps<typeof PublicShopCatalog>['initialProducts']}
          categories={categories || []}
        />
      </main>
    </div>
  );
}

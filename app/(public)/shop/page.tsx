import { createClient } from '@/lib/supabase/server';
import { PublicShopCatalog } from '@/components/public/PublicShopCatalog';
import { Badge } from '@/components/ui/badge';

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
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
      <div className="text-center space-y-3">
        <Badge variant="outline" className="border-emerald-500/40 text-emerald-400">
          Champions Pro Shop
        </Badge>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Athletic Gear & Apparel</h1>
        <p className="text-base text-zinc-400 max-w-2xl mx-auto">
          Shared live inventory across counter purchases and online member orders. Members receive up to 15% automatic discount. Order online for club pickup or home delivery!
        </p>
      </div>

      <PublicShopCatalog
        initialProducts={(products || []) as unknown as React.ComponentProps<typeof PublicShopCatalog>['initialProducts']}
        categories={categories || []}
      />
    </div>
  );
}

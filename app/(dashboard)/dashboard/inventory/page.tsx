import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { createClient } from '@/lib/supabase/server';
import { InventoryManager } from '@/components/dashboard/inventory/InventoryManager';

export const revalidate = 0; // Fresh stock levels

export default async function InventoryDashboardPage() {
  const supabase = await createClient();

  const [
    { data: products },
    { data: transactions },
  ] = await Promise.all([
    supabase
      .from('products')
      .select(`
        id,
        sku,
        name,
        price,
        low_stock_threshold,
        category_id,
        product_categories (name),
        inventory (quantity_on_hand, updated_at)
      `)
      .order('name'),
    supabase
      .from('inventory_transactions')
      .select(`
        id,
        product_id,
        change_quantity,
        transaction_type,
        reference_id,
        notes,
        created_at,
        products (name, sku),
        profiles (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(100),
  ]);

  return (
    <DashboardModuleShell
      title="Live Inventory & Low-Stock Alerts"
      subtitle="Single source of truth for stock quantities shared across counter point-of-sale and online orders."
    >
      <InventoryManager
        products={(products || []) as unknown as React.ComponentProps<typeof InventoryManager>['products']}
        transactions={(transactions || []) as unknown as React.ComponentProps<typeof InventoryManager>['transactions']}
      />
    </DashboardModuleShell>
  );
}

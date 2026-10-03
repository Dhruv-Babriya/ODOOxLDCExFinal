import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { createClient } from '@/lib/supabase/server';
import { ShopPageClient } from '@/components/dashboard/shop/ShopPageClient';

export const revalidate = 0; // Fresh dashboard metrics

export default async function ShopOrdersDashboardPage() {
  const supabase = await createClient();

  const [
    { data: orders },
    { data: products },
    { data: categories },
    { data: members },
  ] = await Promise.all([
    supabase
      .from('shop_orders')
      .select(`
        id,
        order_number,
        member_id,
        order_channel,
        fulfillment_type,
        delivery_address,
        customer_name,
        customer_phone,
        customer_email,
        notes,
        status,
        subtotal,
        discount_amount,
        total_amount,
        created_at,
        members (
          membership_number,
          profiles (full_name, email, phone),
          membership_plans (tier, shop_discount_percent)
        ),
        shop_order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products (name, sku)
        )
      `)
      .order('created_at', { ascending: false }),
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
        image_url,
        category_id,
        product_categories (name),
        inventory (quantity_on_hand)
      `)
      .order('name'),
    supabase
      .from('product_categories')
      .select('id, name')
      .order('name'),
    supabase
      .from('members')
      .select(`
        id,
        membership_number,
        status,
        profiles (full_name, email, phone),
        membership_plans (tier, shop_discount_percent)
      `)
      .eq('status', 'ACTIVE')
      .order('membership_number'),
  ]);

  return (
    <DashboardModuleShell
      title="Pro Shop & Commerce Orders"
      subtitle="Physical counter sales and online orders drawing from the unified club inventory."
      developerOwner="Developer 3"
      developerRole="Shop & Bar Specialist"
      tables={['shop_orders', 'shop_order_items', 'products', 'inventory']}
      contracts={['ShopOrder', 'OrderStatus', 'OrderChannel', 'shopOrderCreateSchema']}
      phase1Roadmap={[
        'Fast Point-of-Sale (POS) counter interface for front desk & shop staff with quick SKU/item search',
        'Pickup & Delivery fulfillment workflows for home orders with address validation',
        'Atomic stock decrementing and concurrency protection via database stored procedures',
        'Automatic server-side member tier discount calculation (Gold 15%, Silver 10%, Junior 5%)',
      ]}
    >
      <ShopPageClient
        initialOrders={(orders || []) as unknown as React.ComponentProps<typeof ShopPageClient>['initialOrders']}
        initialProducts={(products || []) as unknown as React.ComponentProps<typeof ShopPageClient>['initialProducts']}
        categories={categories || []}
        members={(members || []) as unknown as React.ComponentProps<typeof ShopPageClient>['members']}
      />
    </DashboardModuleShell>
  );
}

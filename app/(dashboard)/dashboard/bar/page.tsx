import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { createClient } from '@/lib/supabase/server';
import { BarManager } from '@/components/dashboard/bar/BarManager';

export const revalidate = 0; // Fresh floor and kitchen state

export default async function BarCafeteriaDashboardPage() {
  const supabase = await createClient();

  const [
    { data: tables },
    { data: categories },
    { data: menuItems },
    { data: tabs },
    { data: orders },
    { data: members },
  ] = await Promise.all([
    supabase
      .from('bar_tables')
      .select('id, table_number, capacity, status')
      .order('table_number'),
    supabase
      .from('menu_categories')
      .select('id, name, display_order')
      .order('display_order'),
    supabase
      .from('menu_items')
      .select('id, name, description, price, is_available, category_id, image_url, menu_categories(name)')
      .order('name'),
    supabase
      .from('customer_tabs')
      .select(`
        id,
        tab_number,
        member_id,
        table_id,
        guest_name,
        credit_limit,
        status,
        opened_at,
        closed_at,
        notes,
        bar_tables (table_number),
        members (
          membership_number,
          profiles (full_name),
          membership_plans (tier, bar_discount_percent)
        ),
        bar_orders (id, total_amount, order_status)
      `)
      .order('opened_at', { ascending: false }),
    supabase
      .from('bar_orders')
      .select(`
        id,
        order_number,
        tab_id,
        table_id,
        member_id,
        kitchen_status,
        order_status,
        subtotal,
        discount_amount,
        total_amount,
        notes,
        created_at,
        bar_tables (table_number),
        customer_tabs (tab_number, guest_name),
        members (
          membership_number,
          profiles (full_name),
          membership_plans (tier)
        ),
        bar_order_items (
          id,
          menu_item_id,
          quantity,
          unit_price,
          total_price,
          special_instructions,
          menu_items (name)
        )
      `)
      .order('created_at', { ascending: false }),
    supabase
      .from('members')
      .select(`
        id,
        membership_number,
        status,
        profiles (full_name, email, phone),
        membership_plans (tier, bar_discount_percent)
      `)
      .eq('status', 'ACTIVE')
      .order('membership_number'),
  ]);

  return (
    <DashboardModuleShell
      title="Bar & Nutrition Cafeteria"
      subtitle="Floor table seating, kitchen order tickets, member tabs, and F&B order management."
    >
      <BarManager
        tables={(tables || []) as unknown as React.ComponentProps<typeof BarManager>['tables']}
        categories={(categories || []) as unknown as React.ComponentProps<typeof BarManager>['categories']}
        menuItems={(menuItems || []) as unknown as React.ComponentProps<typeof BarManager>['menuItems']}
        tabs={(tabs || []) as unknown as React.ComponentProps<typeof BarManager>['tabs']}
        orders={(orders || []) as unknown as React.ComponentProps<typeof BarManager>['orders']}
        members={(members || []) as unknown as React.ComponentProps<typeof BarManager>['members']}
      />
    </DashboardModuleShell>
  );
}

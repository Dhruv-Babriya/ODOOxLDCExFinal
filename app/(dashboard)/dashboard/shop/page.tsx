import { DashboardModuleShell } from '@/components/dashboard/module-shell';
import { createClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth/session';
import { ShopPageClient } from '@/components/dashboard/shop/ShopPageClient';
import { MemberProShop } from '@/components/dashboard/shop/MemberProShop';
import type { PortalProduct, PortalCategory } from '@/types/shared';

export const revalidate = 0; // Fresh dashboard metrics

export default async function ShopOrdersDashboardPage() {
  const user = await requireAuth();
  const supabase = await createClient();

  const userRole = (user.role || '').toUpperCase();
  const isMemberOrOwner =
    userRole === 'MEMBER' ||
    userRole === 'OWNER' ||
    Boolean(user.memberId) ||
    !['STAFF', 'ADMIN', 'MANAGER'].includes(userRole);

  // If authenticated user is a club MEMBER (or OWNER), present the full Member Pro Shop experience
  // without back-office cashier POS or inventory management controls.
  if (isMemberOrOwner) {
    const { data: memberRecord } = await supabase
      .from('members')
      .select(`
        id,
        membership_number,
        status,
        profiles (full_name, email, phone),
        membership_plans (name, tier, shop_discount_percent)
      `)
      .eq('profile_id', user.id)
      .maybeSingle();

    const memberId = memberRecord?.id || user.memberId;

    const [
      { data: activeProducts },
      { data: categoriesList },
      { data: memberOrdersData },
      { data: customerTabsData },
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
          image_url,
          category_id,
          product_categories (name),
          inventory (quantity_on_hand)
        `)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('product_categories')
        .select('id, name')
        .order('name'),
      supabase
        .from('shop_orders')
        .select(`
          id,
          order_number,
          order_channel,
          total_amount,
          status,
          fulfillment_status,
          created_at,
          shop_order_items (
            quantity,
            unit_price,
            total_price,
            products (name)
          )
        `)
        .or(`member_id.eq.${memberId || '00000000-0000-0000-0000-000000000000'},created_by.eq.${user.id}`)
        .order('created_at', { ascending: false }),
      memberId
        ? supabase
            .from('customer_tabs')
            .select('id, tab_number, credit_limit, status, opened_at')
            .eq('member_id', memberId)
            .order('opened_at', { ascending: false })
        : Promise.resolve({ data: [] }),
    ]);

    type ShopOrderItemType = {
      quantity: number;
      unit_price: number;
      total_price: number;
      products: { name: string } | null;
    };

    type ShopOrderQueryType = {
      id: string;
      order_number: string;
      order_channel: string;
      total_amount: number;
      status: string;
      fulfillment_status?: string;
      created_at: string;
      shop_order_items: ShopOrderItemType[] | null;
    };

    const formattedOrders = ((memberOrdersData || []) as unknown as ShopOrderQueryType[]).map((o) => {
      const items = o.shop_order_items || [];
      const count = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
      const summary =
        items
          .slice(0, 2)
          .map((it) => `${it.quantity}x ${it.products?.name || 'Item'}`)
          .join(', ') + (items.length > 2 ? ` (+${items.length - 2} more)` : '');

      return {
        id: o.id,
        order_number: o.order_number,
        channel: o.order_channel || 'ONLINE',
        total_amount: Number(o.total_amount || 0),
        status: o.fulfillment_status || o.status,
        payment_status: o.status === 'COMPLETED' ? 'PAID' : o.status === 'CANCELLED' ? 'REFUNDED' : 'UNPAID',
        created_at: o.created_at,
        items_count: count,
        items_summary: summary || 'No items',
      };
    });

    const formattedTabs = ((customerTabsData || []) as Array<{
      id: string;
      tab_number: string | null;
      credit_limit: number | null;
      status: string;
      opened_at: string;
    }>).map((t) => ({
      id: t.id,
      tab_number: t.tab_number || 'N/A',
      credit_limit: Number(t.credit_limit || 0),
      current_balance: 0,
      status: t.status,
      opened_at: t.opened_at,
    }));

    return (
      <DashboardModuleShell
        title="Pro Shop & Athletic Gear"
        subtitle="Exclusive member equipment, rackets, activewear & official club gear with automatic member pricing."
      >
        <MemberProShop
          products={(activeProducts || []) as unknown as PortalProduct[]}
          categories={(categoriesList || []) as PortalCategory[]}
          member={memberRecord as React.ComponentProps<typeof MemberProShop>['member']}
          initialOrders={formattedOrders}
          customerTabs={formattedTabs}
          isStandalonePage={true}
        />
      </DashboardModuleShell>
    );
  }

  // Otherwise (Staff, Admin, Owner): Staff Point of Sale, inventory management & member storefront preview
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
        fulfillment_status,
        confirmed_at,
        ready_at,
        completed_at,
        cancelled_at,
        cancellation_reason,
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
    >
      <ShopPageClient
        initialOrders={(orders || []) as unknown as React.ComponentProps<typeof ShopPageClient>['initialOrders']}
        initialProducts={(products || []) as unknown as React.ComponentProps<typeof ShopPageClient>['initialProducts']}
        categories={categories || []}
        members={(members || []) as unknown as React.ComponentProps<typeof ShopPageClient>['members']}
        userRole={user.role}
      />
    </DashboardModuleShell>
  );
}

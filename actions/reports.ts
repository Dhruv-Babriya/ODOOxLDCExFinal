'use server';

import { createClient } from '@/lib/supabase/server';
import { handleActionError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth/session';
import type { ActionResult } from '@/types/shared';

export interface RevenueData {
  memberships: number;
  courts: number;
  shop: number;
  bar: number;
  total: number;
}

export interface OwnerDashboardMetrics {
  today: RevenueData;
  week: RevenueData;
  month: RevenueData;
  outstandingInvoices: number;
  pendingEnquiries: number;
  lowStockItems: number;
  openTabsBalance: number;
  activeMembers: number;
}

export async function getOwnerDashboardMetricsAction(): Promise<ActionResult<OwnerDashboardMetrics>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const now = new Date();
    
    // Native Date calculations without external date-fns dependency
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0).toISOString();
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
    
    // Monday as start of week
    const dayOfWeek = (now.getDay() + 6) % 7;
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0, 0).toISOString();
    const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek + 6, 23, 59, 59, 999).toISOString();
    
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    // 1. Fetch completed payments strictly to avoid duplicates/unpaid/failed
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('amount, created_at, invoice_id, booking_id, shop_order_id, bar_order_id')
      .eq('status', 'COMPLETED')
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd);

    if (paymentsError) throw paymentsError;

    const calcRevenue = (startStr: string, endStr: string): RevenueData => {
      const rev = { memberships: 0, courts: 0, shop: 0, bar: 0, total: 0 };
      if (!payments) return rev;

      for (const p of payments) {
        if (p.created_at >= startStr && p.created_at <= endStr) {
          const amount = Number(p.amount);
          if (p.shop_order_id) rev.shop += amount;
          else if (p.bar_order_id) rev.bar += amount;
          else if (p.booking_id) rev.courts += amount;
          else if (p.invoice_id) rev.memberships += amount;
          else rev.memberships += amount;
          rev.total += amount;
        }
      }
      return rev;
    };

    const todayRev = calcRevenue(todayStart, todayEnd);
    const weekRev = calcRevenue(weekStart, weekEnd);
    const monthRev = calcRevenue(monthStart, monthEnd);

    // 2. Outstanding Invoices
    const { data: invoices, error: invError } = await supabase
      .from('invoices')
      .select('total_amount, paid_amount')
      .in('status', ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE']);
    if (invError) throw invError;
    const outstandingInvoices = invoices?.reduce((acc, inv) => acc + (Number(inv.total_amount) - Number(inv.paid_amount)), 0) || 0;

    // 3. Pending Enquiries
    const { count: pendingEnquiriesCount, error: enqError } = await supabase
      .from('enquiries')
      .select('id', { count: 'exact', head: true })
      .in('status', ['NEW', 'CONTACTED']);
    if (enqError) throw enqError;

    // 4. Low Stock Items (Direct typed query)
    const [{ data: products }, { data: inventory }] = await Promise.all([
      supabase.from('products').select('id, low_stock_threshold'),
      supabase.from('inventory').select('product_id, quantity_on_hand'),
    ]);

    let finalLowStockCount = 0;
    if (products && inventory) {
      for (const p of products) {
        const inv = inventory.find(i => i.product_id === p.id);
        if (inv && inv.quantity_on_hand <= (p.low_stock_threshold || 5)) {
          finalLowStockCount++;
        }
      }
    }
      
    // 5. Open Tabs Balance (Calculate by summing active unsettled orders on open customer tabs)
    const { data: openTabOrders } = await supabase
      .from('bar_orders')
      .select('total_amount')
      .not('tab_id', 'is', null)
      .neq('order_status', 'COMPLETED')
      .neq('order_status', 'CANCELLED');

    const openTabsBalance = (openTabOrders || []).reduce((acc, o) => acc + Number(o.total_amount || 0), 0);

    // 6. Active Members
    const { count: activeMembersCount, error: membersError } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');
    if (membersError) throw membersError;

    return {
      success: true,
      data: {
        today: todayRev,
        week: weekRev,
        month: monthRev,
        outstandingInvoices,
        pendingEnquiries: pendingEnquiriesCount || 0,
        lowStockItems: finalLowStockCount,
        openTabsBalance,
        activeMembers: activeMembersCount || 0,
      }
    };
  } catch (error) {
    return handleActionError(error);
  }
}

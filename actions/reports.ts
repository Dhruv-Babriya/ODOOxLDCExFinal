'use server';

import { createClient } from '@/lib/supabase/server';
import { handleActionError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth/session';
import type { ActionResult } from '@/types/shared';
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth, parseISO } from 'date-fns';

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
    const todayStart = startOfDay(now).toISOString();
    const todayEnd = endOfDay(now).toISOString();
    
    // Use ISO string comparisons for date ranges
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 }).toISOString();
    
    const monthStart = startOfMonth(now).toISOString();
    const monthEnd = endOfMonth(now).toISOString();

    // 1. Fetch completed payments strictly to avoid duplicates/unpaid/failed
    // We categorize based on which foreign key is present.
    // If multiple are present, we prioritize (though business logic should enforce mutually exclusive FKs)
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
          else if (p.invoice_id) rev.memberships += amount; // We assume invoices without other FKs are memberships/custom
          else rev.memberships += amount; // Fallback
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

    // 4. Low Stock Items
    const { count: lowStockCount, error: stockError } = await supabase
      .rpc('get_low_stock_count'); // Fallback to raw query if RPC doesn't exist
      
    // 5. Open Tabs Balance
    const { data: openTabs, error: tabsError } = await supabase
      .from('customer_tabs')
      .select('current_balance')
      .eq('status', 'OPEN');
    if (tabsError) throw tabsError;
    const openTabsBalance = openTabs?.reduce((acc, tab) => acc + Number(tab.current_balance || 0), 0) || 0;

    // 6. Active Members
    const { count: activeMembersCount, error: membersError } = await supabase
      .from('members')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');
    if (membersError) throw membersError;

    // For low stock if RPC fails:
    let finalLowStockCount = lowStockCount || 0;
    if (stockError) {
      const { data: products } = await supabase.from('products').select('id, low_stock_threshold');
      const { data: inventory } = await supabase.from('inventory').select('product_id, quantity_on_hand');
      if (products && inventory) {
        let count = 0;
        for (const p of products) {
          const inv = inventory.find(i => i.product_id === p.id);
          if (inv && inv.quantity_on_hand <= (p.low_stock_threshold || 5)) {
            count++;
          }
        }
        finalLowStockCount = count;
      }
    }

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

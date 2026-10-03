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

export interface RevenueTransactionItem {
  id: string;
  amount: number;
  paymentMethod: string;
  status: string;
  reference: string | null;
  channel: 'MEMBERSHIPS' | 'COURTS' | 'SHOP' | 'BAR';
  createdAt: string;
}

export interface PaginatedRevenueResult {
  items: RevenueTransactionItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch paginated revenue transaction ledger with optional channel filter.
 * Enables Owner and Managers to page through incoming payment receipts.
 */
export async function getPaginatedRevenueLedgerAction(params?: {
  page?: number;
  pageSize?: number;
  channel?: string;
}): Promise<ActionResult<PaginatedRevenueResult>> {
  try {
    await requireAuth();
    const supabase = await createClient();

    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, Math.min(params?.pageSize || 10, 50));
    const channel = params?.channel || 'ALL';

    let query = supabase
      .from('payments')
      .select(
        'id, amount, payment_method, status, transaction_reference, created_at, invoice_id, booking_id, shop_order_id, bar_order_id',
        { count: 'exact' }
      )
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false });

    if (channel === 'SHOP') {
      query = query.not('shop_order_id', 'is', null);
    } else if (channel === 'BAR') {
      query = query.not('bar_order_id', 'is', null);
    } else if (channel === 'COURTS') {
      query = query.not('booking_id', 'is', null);
    } else if (channel === 'MEMBERSHIPS') {
      query = query.not('invoice_id', 'is', null);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);
    if (error) throw error;

    const total = count || 0;
    const totalPages = Math.ceil(total / pageSize) || 1;

    const items: RevenueTransactionItem[] = (data || []).map((p) => {
      let ch: 'MEMBERSHIPS' | 'COURTS' | 'SHOP' | 'BAR' = 'MEMBERSHIPS';
      if (p.shop_order_id) ch = 'SHOP';
      else if (p.bar_order_id) ch = 'BAR';
      else if (p.booking_id) ch = 'COURTS';
      else if (p.invoice_id) ch = 'MEMBERSHIPS';

      return {
        id: p.id,
        amount: Number(p.amount),
        paymentMethod: p.payment_method,
        status: p.status,
        reference: p.transaction_reference,
        channel: ch,
        createdAt: p.created_at,
      };
    });

    return {
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (error) {
    return handleActionError(error);
  }
}

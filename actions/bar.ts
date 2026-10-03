'use server';

import { createClient } from '@/lib/supabase/server';
import {
  barTableSchema,
  barTableStatusUpdateSchema,
  menuCategoryCreateSchema,
  menuItemSchema,
  menuItemUpdateSchema,
  menuItemToggleAvailabilitySchema,
  customerTabOpenSchema,
  customerTabCloseSchema,
  barOrderCreateSchema,
  updateKitchenStatusSchema,
  updateBarOrderStatusSchema,
  type BarTableInput,
  type BarTableStatusUpdateInput,
  type MenuCategoryCreateInput,
  type MenuItemInput,
  type MenuItemUpdateInput,
  type MenuItemToggleAvailabilityInput,
  type CustomerTabOpenInput,
  type CustomerTabCloseInput,
  type BarOrderCreateInput,
  type UpdateKitchenStatusInput,
  type UpdateBarOrderStatusInput,
} from '@/lib/validations/bar';
import { handleActionError, AppError } from '@/lib/errors';
import { requireAuth, requirePermission } from '@/lib/auth/session';
import { calculateBarPrice } from '@/lib/pricing';
import { type TableStatus, type KitchenStatus, type OrderStatus } from '@/types/shared';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Creates a new floor table
 */
export async function createBarTableAction(
  input: BarTableInput
): Promise<ActionResult<{ tableId: string }>> {
  try {
    const validated = barTableSchema.parse(input);
    await requirePermission('bar_tables:manage');
    const supabase = await createClient();

    // Check table number uniqueness
    const { data: existing } = await supabase
      .from('bar_tables')
      .select('id')
      .eq('table_number', validated.tableNumber)
      .maybeSingle();

    if (existing) {
      throw new AppError(`Table number "${validated.tableNumber}" already exists.`, 'CONFLICT', 409);
    }

    const { data: table, error } = await supabase
      .from('bar_tables')
      .insert({
        table_number: validated.tableNumber,
        capacity: validated.capacity,
        status: validated.status as TableStatus,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { tableId: table.id },
      message: `Table ${validated.tableNumber} created.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Updates a floor table status (AVAILABLE, OCCUPIED, RESERVED)
 */
export async function updateBarTableStatusAction(
  input: BarTableStatusUpdateInput
): Promise<ActionResult<{ tableId: string; status: string }>> {
  try {
    const validated = barTableStatusUpdateSchema.parse(input);
    await requirePermission('bar_tables:manage');
    const supabase = await createClient();

    const { error } = await supabase
      .from('bar_tables')
      .update({ status: validated.status as TableStatus })
      .eq('id', validated.tableId);

    if (error) throw error;

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { tableId: validated.tableId, status: validated.status },
      message: `Table status changed to ${validated.status}.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Creates a menu category
 */
export async function createMenuCategoryAction(
  input: MenuCategoryCreateInput
): Promise<ActionResult<{ categoryId: string }>> {
  try {
    const validated = menuCategoryCreateSchema.parse(input);
    await requirePermission('bar:manage_menu');
    const supabase = await createClient();

    const { data: cat, error } = await supabase
      .from('menu_categories')
      .insert({
        name: validated.name,
        display_order: validated.displayOrder,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { categoryId: cat.id },
      message: `Menu category "${validated.name}" created.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Creates a new menu item
 */
export async function createMenuItemAction(
  input: MenuItemInput
): Promise<ActionResult<{ menuItemId: string }>> {
  try {
    const validated = menuItemSchema.parse(input);
    await requirePermission('bar:manage_menu');
    const supabase = await createClient();

    const { data: item, error } = await supabase
      .from('menu_items')
      .insert({
        category_id: validated.categoryId || null,
        name: validated.name,
        description: validated.description || null,
        price: validated.price,
        is_available: validated.isAvailable,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { menuItemId: item.id },
      message: `Menu item "${validated.name}" created.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Edits an existing menu item
 */
export async function updateMenuItemAction(
  input: MenuItemUpdateInput
): Promise<ActionResult<{ menuItemId: string }>> {
  try {
    const validated = menuItemUpdateSchema.parse(input);
    await requirePermission('bar:manage_menu');
    const supabase = await createClient();

    const { error } = await supabase
      .from('menu_items')
      .update({
        category_id: validated.categoryId || null,
        name: validated.name,
        description: validated.description || null,
        price: validated.price,
        is_available: validated.isAvailable,
      })
      .eq('id', validated.id);

    if (error) throw error;

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { menuItemId: validated.id },
      message: 'Menu item updated successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Toggles a menu item's live availability
 */
export async function toggleMenuItemAvailabilityAction(
  input: MenuItemToggleAvailabilityInput
): Promise<ActionResult<{ menuItemId: string; isAvailable: boolean }>> {
  try {
    const validated = menuItemToggleAvailabilitySchema.parse(input);
    await requirePermission('bar:manage_menu');
    const supabase = await createClient();

    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: validated.isAvailable })
      .eq('id', validated.id);

    if (error) throw error;

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { menuItemId: validated.id, isAvailable: validated.isAvailable },
      message: `Menu item ${validated.isAvailable ? 'available' : 'unavailable'}.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Opens a customer tab for a member or table patron
 */
export async function openCustomerTabAction(
  input: CustomerTabOpenInput
): Promise<ActionResult<{ tabId: string; tabNumber: string }>> {
  try {
    const validated = customerTabOpenSchema.parse(input);
    const user = await requirePermission('tabs:manage');
    const supabase = await createClient();

    // Check if table already has an open tab
    if (validated.tableId) {
      const { data: existingOpen } = await supabase
        .from('customer_tabs')
        .select('id, tab_number')
        .eq('table_id', validated.tableId)
        .eq('status', 'OPEN')
        .maybeSingle();

      if (existingOpen) {
        throw new AppError(
          `This table already has an active open tab (${existingOpen.tab_number || 'Open'}).`,
          'CONFLICT',
          409
        );
      }
    }

    // Auto-generate tab number e.g. TAB-042 or user-provided
    const tabNumber =
      validated.tabNumber ||
      `TAB-${Date.now().toString(36).toUpperCase()}-${Math.floor(10 + Math.random() * 90)}`;

    const { data: tab, error } = await supabase
      .from('customer_tabs')
      .insert({
        tab_number: tabNumber,
        member_id: validated.memberId || null,
        table_id: validated.tableId || null,
        guest_name: validated.guestName || null,
        credit_limit: validated.creditLimit ?? 0,
        notes: validated.notes || null,
        status: 'OPEN',
        opened_by: user.id,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Automatically set table status to OCCUPIED
    if (validated.tableId) {
      await supabase
        .from('bar_tables')
        .update({ status: 'OCCUPIED' })
        .eq('id', validated.tableId);
    }

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { tabId: tab.id, tabNumber },
      message: `Customer tab ${tabNumber} opened successfully.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Closes a customer tab and exposes the total outstanding balance for payment integration
 */
export async function closeCustomerTabAction(
  input: CustomerTabCloseInput
): Promise<ActionResult<{ tabId: string; outstandingAmount: number }>> {
  try {
    const validated = customerTabCloseSchema.parse(input);
    await requirePermission('tabs:manage');
    const supabase = await createClient();

    // Invoke atomic close RPC which checks status, calculates total, and updates table
    const { data, error } = await supabase.rpc('close_customer_tab', {
      p_tab_id: validated.tabId,
    });

    if (error) throw error;

    const outstandingAmount = Number(data);

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { tabId: validated.tabId, outstandingAmount },
      message: `Tab closed. Total outstanding amount: ₹${outstandingAmount.toFixed(2)}. Ready for payment settlement.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Creates a bar/cafeteria order with itemized lines, member discount calculation,
 * and kitchen status dispatching.
 */
export async function createBarOrderAction(
  input: BarOrderCreateInput
): Promise<ActionResult<{ orderId: string; orderNumber: string; totalAmount: number }>> {
  try {
    const validated = barOrderCreateSchema.parse(input);
    const user = await requireAuth();
    const supabase = await createClient();

    // 1. Fetch menu items and verify availability
    const itemIds = Array.from(new Set(validated.items.map((i) => i.menuItemId)));
    const { data: menuItems, error: itemsError } = await supabase
      .from('menu_items')
      .select('id, name, price, is_available')
      .in('id', itemIds);

    if (itemsError || !menuItems || menuItems.length !== itemIds.length) {
      throw new AppError('One or more menu items could not be found.', 'NOT_FOUND', 404);
    }

    const unavailable = menuItems.find((i) => !i.is_available);
    if (unavailable) {
      throw new AppError(`Item "${unavailable.name}" is currently sold out / unavailable.`, 'BAD_REQUEST', 400);
    }

    const priceMap = new Map(menuItems.map((i) => [i.id, Number(i.price)]));

    // 2. Compute subtotal
    let subtotal = 0;
    const orderItems = validated.items.map((item) => {
      const unitPrice = priceMap.get(item.menuItemId) ?? 0;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        specialInstructions: item.specialInstructions || null,
      };
    });

    // 3. Determine member discount automatically
    let barDiscountPercent = 0;
    let effectiveMemberId = validated.memberId || null;

    // If tab is linked, inherit tab's member if not explicitly passed
    if (!effectiveMemberId && validated.tabId) {
      const { data: tab } = await supabase
        .from('customer_tabs')
        .select('member_id')
        .eq('id', validated.tabId)
        .single();
      if (tab?.member_id) effectiveMemberId = tab.member_id;
    }

    if (effectiveMemberId) {
      const { data: member } = await supabase
        .from('members')
        .select(`
          id,
          status,
          membership_plans (
            tier,
            bar_discount_percent
          )
        `)
        .eq('id', effectiveMemberId)
        .single();

      if (member?.status === 'ACTIVE' && member.membership_plans) {
        barDiscountPercent = Number(member.membership_plans.bar_discount_percent);
      }
    }

    const pricing = calculateBarPrice({
      subtotal,
      barDiscountPercent,
    });

    const orderNumber = `BAR-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    // 4. Create bar order
    const { data: order, error: orderError } = await supabase
      .from('bar_orders')
      .insert({
        order_number: orderNumber,
        tab_id: validated.tabId || null,
        table_id: validated.tableId || null,
        member_id: effectiveMemberId || null,
        notes: validated.notes || null,
        kitchen_status: 'PENDING',
        order_status: 'PROCESSING',
        subtotal: pricing.subtotal,
        discount_amount: pricing.discountAmount,
        total_amount: pricing.totalAmount,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    // 5. Insert order items
    const { error: insertItemsError } = await supabase.from('bar_order_items').insert(
      orderItems.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menuItemId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        special_instructions: item.specialInstructions,
      }))
    );

    if (insertItemsError) {
      await supabase.from('bar_orders').delete().eq('id', order.id);
      throw insertItemsError;
    }

    // 6. Update table status to OCCUPIED if placed on table
    if (validated.tableId) {
      await supabase
        .from('bar_tables')
        .update({ status: 'OCCUPIED' })
        .eq('id', validated.tableId);
    }

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { orderId: order.id, orderNumber, totalAmount: pricing.totalAmount },
      message: `Bar order ${orderNumber} placed and sent to kitchen.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Updates kitchen preparation status (PENDING -> PREPARING -> READY -> SERVED)
 */
export async function updateKitchenStatusAction(
  input: UpdateKitchenStatusInput
): Promise<ActionResult<{ orderId: string; kitchenStatus: string }>> {
  try {
    const validated = updateKitchenStatusSchema.parse(input);
    await requirePermission('bar_orders:manage');
    const supabase = await createClient();

    const updatePayload: { kitchen_status: KitchenStatus; order_status?: OrderStatus; updated_at: string } = {
      kitchen_status: validated.kitchenStatus as KitchenStatus,
      updated_at: new Date().toISOString(),
    };

    // If order served, advance order_status to COMPLETED if not on a running tab
    if (validated.kitchenStatus === 'SERVED') {
      const { data: order } = await supabase
        .from('bar_orders')
        .select('tab_id')
        .eq('id', validated.orderId)
        .single();

      if (!order?.tab_id) {
        updatePayload.order_status = 'COMPLETED';
      }
    } else if (validated.kitchenStatus === 'CANCELLED') {
      updatePayload.order_status = 'CANCELLED';
    }

    const { error } = await supabase
      .from('bar_orders')
      .update(updatePayload)
      .eq('id', validated.orderId);

    if (error) throw error;

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { orderId: validated.orderId, kitchenStatus: validated.kitchenStatus },
      message: `Kitchen status updated to ${validated.kitchenStatus}.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Updates bar order overall status (PENDING -> PROCESSING -> COMPLETED -> CANCELLED)
 */
export async function updateBarOrderStatusAction(
  input: UpdateBarOrderStatusInput
): Promise<ActionResult<{ orderId: string; orderStatus: string }>> {
  try {
    const validated = updateBarOrderStatusSchema.parse(input);
    await requirePermission('bar_orders:manage');
    const supabase = await createClient();

    const { error } = await supabase
      .from('bar_orders')
      .update({
        order_status: validated.orderStatus as OrderStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.orderId);

    if (error) throw error;

    revalidatePath('/dashboard/bar');

    return {
      success: true,
      data: { orderId: validated.orderId, orderStatus: validated.orderStatus },
      message: `Order status updated to ${validated.orderStatus}.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

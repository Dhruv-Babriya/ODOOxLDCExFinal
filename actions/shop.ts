'use server';

import { createClient } from '@/lib/supabase/server';
import {
  shopOrderCreateSchema,
  cancelShopOrderSchema,
  updateShopOrderStatusSchema,
  productCreateSchema,
  productUpdateSchema,
  productToggleActiveSchema,
  productCategoryCreateSchema,
  inventoryAdjustmentSchema,
  updateShopOrderFulfillmentStatusSchema,
  recordCommercePaymentSchema,
  type ShopOrderCreateInput,
  type CancelShopOrderInput,
  type UpdateShopOrderStatusInput,
  type ProductCreateInput,
  type ProductUpdateInput,
  type ProductToggleActiveInput,
  type ProductCategoryCreateInput,
  type InventoryAdjustmentInput,
  type UpdateShopOrderFulfillmentStatusInput,
  type RecordCommercePaymentInput,
} from '@/lib/validations/shop';
import { handleActionError, AppError, AuthorizationError } from '@/lib/errors';
import { requireAuth, requirePermission } from '@/lib/auth/session';
import { calculateShopPrice } from '@/lib/pricing';
import type { ActionResult, OrderChannel, OrderStatus, InventoryTransactionType, FulfillmentStatus } from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Creates a shop order with server-side pricing, member tier discounts,
 * safe concurrent stock deduction, and support for pickup / delivery fulfillment.
 */
export async function createShopOrderAction(
  input: ShopOrderCreateInput
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  try {
    const validated = shopOrderCreateSchema.parse(input);
    const user = await requireAuth();
    const supabase = await createClient();

    // Enforce channel permissions
    if (validated.orderChannel === 'COUNTER') {
      const allowedRoles = ['OWNER', 'ADMIN', 'SHOP_STAFF', 'FRONT_DESK'];
      if (!allowedRoles.includes(user.role)) {
        throw new AuthorizationError('Only staff can process physical counter sales.');
      }
    }

    // 1. Fetch products and verify active status
    const productIds = Array.from(new Set(validated.items.map((i) => i.productId)));
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, price, is_active')
      .in('id', productIds);

    if (prodError || !products || products.length !== productIds.length) {
      throw new AppError('One or more selected products could not be found.', 'NOT_FOUND', 404);
    }

    const inactiveProduct = products.find((p) => !p.is_active);
    if (inactiveProduct) {
      throw new AppError(`Product "${inactiveProduct.name}" is currently deactivated.`, 'BAD_REQUEST', 400);
    }

    const priceMap = new Map(products.map((p) => [p.id, Number(p.price)]));

    // 2. Pre-verify current inventory levels to fail fast before mutation
    const { data: inventoryLevels, error: invError } = await supabase
      .from('inventory')
      .select('product_id, quantity_on_hand')
      .in('product_id', productIds);

    if (invError) throw invError;
    const invMap = new Map(inventoryLevels?.map((i) => [i.product_id, i.quantity_on_hand]) ?? []);

    for (const item of validated.items) {
      const available = invMap.get(item.productId) ?? 0;
      if (available < item.quantity) {
        const prod = products.find((p) => p.id === item.productId);
        throw new AppError(
          `Insufficient stock for "${prod?.name || 'Item'}". Requested: ${item.quantity}, Available: ${available}`,
          'INSUFFICIENT_STOCK',
          400
        );
      }
    }

    // 3. Compute subtotal server-side
    let subtotal = 0;
    const orderItems = validated.items.map((item) => {
      const unitPrice = priceMap.get(item.productId) ?? 0;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    // 4. Compute member discount server-side using shared contract
    let shopDiscountPercent = 0;
    const effectiveMemberId = validated.memberId || (user.role === 'MEMBER' ? user.memberId : null);

    if (effectiveMemberId) {
      const { data: member } = await supabase
        .from('members')
        .select(`
          id,
          status,
          end_date,
          membership_plans (
            tier,
            shop_discount_percent
          )
        `)
        .eq('id', effectiveMemberId)
        .single();

      const todayStr = new Date().toISOString().split('T')[0];
      const isMemberActive =
        member &&
        member.status === 'ACTIVE' &&
        (!member.end_date || member.end_date >= todayStr);

      if (isMemberActive && member.membership_plans) {
        shopDiscountPercent = Number(member.membership_plans.shop_discount_percent);
      }
    }

    const pricing = calculateShopPrice({
      subtotal,
      shopDiscountPercent,
    });

    // Generate unique order number (e.g. SH-2026-X1Y2Z)
    const orderNumber = `SH-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}-${Math.floor(
      100 + Math.random() * 900
    )}`;

    // 5. Create shop order record
    const { data: order, error: orderError } = await supabase
      .from('shop_orders')
      .insert({
        order_number: orderNumber,
        member_id: effectiveMemberId || null,
        order_channel: validated.orderChannel as OrderChannel,
        fulfillment_type: validated.fulfillmentType,
        delivery_address: validated.deliveryAddress || null,
        customer_name: validated.customerName || (user.role === 'MEMBER' ? user.fullName : null),
        customer_phone: validated.customerPhone || user.phone || null,
        customer_email: validated.customerEmail || (user.role === 'MEMBER' ? user.email : null),
        notes: validated.notes || null,
        status: 'PROCESSING',
        subtotal: pricing.subtotal,
        discount_amount: pricing.discountAmount,
        total_amount: pricing.totalAmount,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    // 6. Insert order items
    const { error: itemsError } = await supabase.from('shop_order_items').insert(
      orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
      }))
    );

    if (itemsError) {
      // Cleanup order record on failure
      await supabase.from('shop_orders').delete().eq('id', order.id);
      throw itemsError;
    }

    // 7. Atomically deduct inventory with row locking in stored procedure.
    // If any deduction fails (e.g. race condition), roll back previously deducted items and clean up.
    const txType = validated.orderChannel === 'COUNTER' ? 'SALE_COUNTER' : 'SALE_ONLINE';
    const deductedItems: Array<{ productId: string; quantity: number }> = [];

    for (const item of orderItems) {
      const { error: deductError } = await supabase.rpc('deduct_inventory', {
        p_product_id: item.productId,
        p_quantity: item.quantity,
        p_tx_type: txType,
        p_reference_id: order.id,
        p_notes: `Order ${orderNumber} (${validated.fulfillmentType})`,
      });

      if (deductError) {
        // Rollback already deducted items in this order
        for (const done of deductedItems) {
          await supabase.rpc('adjust_inventory', {
            p_product_id: done.productId,
            p_quantity_change: done.quantity,
            p_tx_type: 'RETURN',
            p_reference_id: order.id,
            p_notes: `Rollback deduction failure for order ${orderNumber}`,
          });
        }
        // Mark order as cancelled
        await supabase.from('shop_orders').update({ status: 'CANCELLED' }).eq('id', order.id);
        throw deductError;
      }

      deductedItems.push({ productId: item.productId, quantity: item.quantity });
    }

    revalidatePath('/dashboard/shop');
    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard/portal');
    revalidatePath('/shop');

    return {
      success: true,
      data: { orderId: order.id, orderNumber },
      message: `Order ${orderNumber} created successfully.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Cancels a shop order and restores inventory atomically via cancel_shop_order RPC
 */
export async function cancelShopOrderAction(
  input: CancelShopOrderInput
): Promise<ActionResult<{ orderId: string }>> {
  try {
    const validated = cancelShopOrderSchema.parse(input);
    const user = await requireAuth();
    const supabase = await createClient();

    // Verify order exists and caller has authority
    const { data: order, error: fetchError } = await supabase
      .from('shop_orders')
      .select('id, member_id, status, fulfillment_status')
      .eq('id', validated.orderId)
      .single();

    if (fetchError || !order) {
      throw new AppError('Order not found', 'NOT_FOUND', 404);
    }

    if (order.status === 'CANCELLED' || order.fulfillment_status === 'CANCELLED') {
      throw new AppError('Order is already cancelled.', 'BAD_REQUEST', 400);
    }

    if (order.status === 'COMPLETED' || ['COLLECTED', 'DELIVERED', 'COMPLETED'].includes(order.fulfillment_status)) {
      throw new AppError('Completed or collected orders cannot be cancelled.', 'BAD_REQUEST', 400);
    }

    // Authorization: Shop staff/admins/owners, or member cancelling own non-completed order
    const isStaff = ['OWNER', 'ADMIN', 'SHOP_STAFF'].includes(user.role);
    const isOwnMemberOrder = user.role === 'MEMBER' && user.memberId && order.member_id === user.memberId;

    if (!isStaff && !isOwnMemberOrder) {
      throw new AuthorizationError('You do not have permission to cancel this order.');
    }

    // Call atomic cancel RPC which restores inventory & writes RETURN transactions
    const { error: cancelError } = await supabase.rpc('cancel_shop_order', {
      p_order_id: validated.orderId,
      p_reason: validated.reason ?? 'Order cancelled by user',
    });

    if (cancelError) throw cancelError;

    revalidatePath('/dashboard/shop');
    revalidatePath('/dashboard/inventory');
    revalidatePath('/shop');

    return {
      success: true,
      data: { orderId: validated.orderId },
      message: 'Order cancelled and stock restored to inventory.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Updates shop order status (PENDING -> PROCESSING -> COMPLETED)
 */
export async function updateShopOrderStatusAction(
  input: UpdateShopOrderStatusInput
): Promise<ActionResult<{ orderId: string; status: string }>> {
  try {
    const validated = updateShopOrderStatusSchema.parse(input);
    await requirePermission('shop_orders:manage');
    const supabase = await createClient();

    if (validated.status === 'CANCELLED') {
      // Delegate to cancel action for safe stock restoration
      const cancelRes = await cancelShopOrderAction({ orderId: validated.orderId, reason: 'Status updated to cancelled' });
      if (!cancelRes.success) return cancelRes;
      return {
        success: true,
        data: { orderId: validated.orderId, status: 'CANCELLED' },
        message: cancelRes.message,
      };
    }

    const { error } = await supabase
      .from('shop_orders')
      .update({ status: validated.status as OrderStatus, updated_at: new Date().toISOString() })
      .eq('id', validated.orderId);

    if (error) throw error;

    revalidatePath('/dashboard/shop');

    return {
      success: true,
      data: { orderId: validated.orderId, status: validated.status },
      message: `Order status updated to ${validated.status}.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Creates a new catalog product with optional initial inventory
 */
export async function createProductAction(
  input: ProductCreateInput
): Promise<ActionResult<{ productId: string }>> {
  try {
    const validated = productCreateSchema.parse(input);
    await requirePermission('shop:manage_products');
    const supabase = await createClient();

    // Verify SKU uniqueness
    const { data: existingSku } = await supabase
      .from('products')
      .select('id')
      .eq('sku', validated.sku)
      .maybeSingle();

    if (existingSku) {
      throw new AppError(`A product with SKU "${validated.sku}" already exists.`, 'CONFLICT', 409);
    }

    const { data: product, error: prodError } = await supabase
      .from('products')
      .insert({
        sku: validated.sku,
        name: validated.name,
        description: validated.description || null,
        category_id: validated.categoryId || null,
        price: validated.price,
        low_stock_threshold: validated.lowStockThreshold,
        image_url: validated.imageUrl || null,
        is_active: validated.isActive,
      })
      .select('id')
      .single();

    if (prodError) throw prodError;

    // Initialize inventory record
    if (validated.initialStock > 0) {
      const { error: stockError } = await supabase.rpc('adjust_inventory', {
        p_product_id: product.id,
        p_quantity_change: validated.initialStock,
        p_tx_type: 'PURCHASE_RECEIPT',
        p_notes: 'Initial inventory on product creation',
      });
      if (stockError) throw stockError;
    } else {
      await supabase.from('inventory').insert({
        product_id: product.id,
        quantity_on_hand: 0,
      });
    }

    revalidatePath('/dashboard/shop');
    revalidatePath('/dashboard/inventory');
    revalidatePath('/shop');

    return {
      success: true,
      data: { productId: product.id },
      message: `Product "${validated.name}" created successfully.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Edits an existing catalog product
 */
export async function updateProductAction(
  input: ProductUpdateInput
): Promise<ActionResult<{ productId: string }>> {
  try {
    const validated = productUpdateSchema.parse(input);
    await requirePermission('shop:manage_products');
    const supabase = await createClient();

    const { error } = await supabase
      .from('products')
      .update({
        category_id: validated.categoryId || null,
        name: validated.name,
        description: validated.description || null,
        price: validated.price,
        low_stock_threshold: validated.lowStockThreshold,
        image_url: validated.imageUrl || null,
        is_active: validated.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.id);

    if (error) throw error;

    revalidatePath('/dashboard/shop');
    revalidatePath('/dashboard/inventory');
    revalidatePath('/shop');

    return {
      success: true,
      data: { productId: validated.id },
      message: 'Product details updated successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Toggles product active/deactivated status
 */
export async function toggleProductActiveAction(
  input: ProductToggleActiveInput
): Promise<ActionResult<{ productId: string; isActive: boolean }>> {
  try {
    const validated = productToggleActiveSchema.parse(input);
    await requirePermission('shop:manage_products');
    const supabase = await createClient();

    const { error } = await supabase
      .from('products')
      .update({
        is_active: validated.isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.id);

    if (error) throw error;

    revalidatePath('/dashboard/shop');
    revalidatePath('/dashboard/inventory');
    revalidatePath('/shop');

    return {
      success: true,
      data: { productId: validated.id, isActive: validated.isActive },
      message: `Product ${validated.isActive ? 'activated' : 'deactivated'} successfully.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Creates a product category
 */
export async function createProductCategoryAction(
  input: ProductCategoryCreateInput
): Promise<ActionResult<{ categoryId: string }>> {
  try {
    const validated = productCategoryCreateSchema.parse(input);
    await requirePermission('shop:manage_products');
    const supabase = await createClient();

    const { data: category, error } = await supabase
      .from('product_categories')
      .insert({
        name: validated.name,
        description: validated.description || null,
      })
      .select('id')
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/shop');
    revalidatePath('/shop');

    return {
      success: true,
      data: { categoryId: category.id },
      message: `Category "${validated.name}" created.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Manual stock adjustment with traceable audit transaction
 */
export async function adjustInventoryAction(
  input: InventoryAdjustmentInput
): Promise<ActionResult<{ newQuantity: number }>> {
  try {
    const validated = inventoryAdjustmentSchema.parse(input);
    await requirePermission('inventory:manage');
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('adjust_inventory', {
      p_product_id: validated.productId,
      p_quantity_change: validated.changeQuantity,
      p_tx_type: validated.transactionType as InventoryTransactionType,
      p_notes: validated.notes || null,
    });

    if (error) throw error;

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard/shop');
    revalidatePath('/shop');

    return {
      success: true,
      data: { newQuantity: Number(data) },
      message: `Stock updated successfully (new level: ${data}).`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Phase 2: Updates shop order fulfillment lifecycle with state machine validation
 * Pickup: PENDING -> CONFIRMED -> READY_FOR_PICKUP -> COLLECTED -> COMPLETED
 * Delivery: PENDING -> CONFIRMED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED
 */
export async function updateShopOrderFulfillmentStatusAction(
  input: UpdateShopOrderFulfillmentStatusInput
): Promise<ActionResult<{ orderId: string; fulfillmentStatus: FulfillmentStatus; status: OrderStatus }>> {
  try {
    const validated = updateShopOrderFulfillmentStatusSchema.parse(input);
    await requirePermission('shop_orders:manage');
    const supabase = await createClient();

    // 1. Fetch current order state
    const { data: order, error: fetchErr } = await supabase
      .from('shop_orders')
      .select('id, fulfillment_type, fulfillment_status, status')
      .eq('id', validated.orderId)
      .single();

    if (fetchErr || !order) {
      throw new AppError('Shop order not found', 'NOT_FOUND', 404);
    }

    if (order.status === 'CANCELLED' || order.fulfillment_status === 'CANCELLED') {
      throw new AppError('Cannot update status of a cancelled order.', 'BAD_REQUEST', 400);
    }

    if (order.status === 'COMPLETED' && validated.fulfillmentStatus !== 'COMPLETED') {
      throw new AppError('Cannot revert a completed order to an earlier status.', 'BAD_REQUEST', 400);
    }

    // 2. If cancelling, route through cancel action for safe stock restoration
    if (validated.fulfillmentStatus === 'CANCELLED') {
      const cancelRes = await cancelShopOrderAction({
        orderId: validated.orderId,
        reason: validated.notes ?? 'Cancelled during fulfillment review',
      });
      if (!cancelRes.success) return { success: false, error: cancelRes.error };
      return {
        success: true,
        data: {
          orderId: validated.orderId,
          fulfillmentStatus: 'CANCELLED',
          status: 'CANCELLED',
        },
        message: 'Order cancelled and stock restored to inventory.',
      };
    }

    // 3. Validate fulfillment type matches workflow step
    if (order.fulfillment_type === 'PICKUP' && validated.fulfillmentStatus === 'OUT_FOR_DELIVERY') {
      throw new AppError('Pickup orders cannot be set to Out for Delivery.', 'BAD_REQUEST', 400);
    }
    if (order.fulfillment_type === 'DELIVERY' && validated.fulfillmentStatus === 'READY_FOR_PICKUP') {
      throw new AppError('Delivery orders cannot be set to Ready for Pickup.', 'BAD_REQUEST', 400);
    }

    // 4. Call database stored procedure update_shop_order_fulfillment
    const { error: rpcErr } = await supabase.rpc('update_shop_order_fulfillment', {
      p_order_id: validated.orderId,
      p_new_fulfillment_status: validated.fulfillmentStatus,
      p_notes: validated.notes || null,
    });

    if (rpcErr) {
      if (rpcErr.message.includes('ALREADY_COLLECTED') || (rpcErr as { code?: string }).code === 'P0004') {
        throw new AppError('This order has already been collected by the customer.', 'CONFLICT', 409);
      }
      if (rpcErr.message.includes('ALREADY_DELIVERED')) {
        throw new AppError('This order has already been delivered.', 'CONFLICT', 409);
      }
      if (rpcErr.message.includes('INVALID_TRANSITION')) {
        throw new AppError(rpcErr.message.replace(/^.*?INVALID_TRANSITION:\s*/, ''), 'BAD_REQUEST', 400);
      }
      throw rpcErr;
    }

    // Determine derived app status for return payload
    let derivedStatus: OrderStatus = 'PENDING';
    if (['COLLECTED', 'DELIVERED', 'COMPLETED'].includes(validated.fulfillmentStatus)) {
      derivedStatus = 'COMPLETED';
    } else if (['CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY'].includes(validated.fulfillmentStatus)) {
      derivedStatus = 'PROCESSING';
    }

    revalidatePath('/dashboard/shop');
    revalidatePath('/shop');

    return {
      success: true,
      data: {
        orderId: validated.orderId,
        fulfillmentStatus: validated.fulfillmentStatus as FulfillmentStatus,
        status: derivedStatus,
      },
      message: `Order progressed to ${validated.fulfillmentStatus.replace(/_/g, ' ')}.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Phase 2 Member Portal Integration: Retrieve shop orders for member view
 */
export async function getMemberShopOrdersAction(
  targetMemberId?: string
): Promise<ActionResult<Array<Record<string, unknown>>>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    let queryMemberId: string | null = null;

    if (user.role === 'MEMBER') {
      if (!user.memberId) {
        return { success: true, data: [] };
      }
      queryMemberId = user.memberId;
    } else {
      // Staff can query for any member
      queryMemberId = targetMemberId || null;
    }

    let query = supabase
      .from('shop_orders')
      .select(`
        id,
        order_number,
        order_channel,
        fulfillment_type,
        fulfillment_status,
        delivery_address,
        status,
        subtotal,
        discount_amount,
        total_amount,
        notes,
        created_at,
        confirmed_at,
        ready_at,
        completed_at,
        shop_order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products (name, sku, image_url)
        )
      `)
      .order('created_at', { ascending: false });

    if (queryMemberId) {
      query = query.eq('member_id', queryMemberId);
    }

    const { data: orders, error } = await query;
    if (error) throw error;

    return {
      success: true,
      data: orders || [],
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Phase 2 Member Portal Integration: Retrieve detailed order breakdown by ID
 */
export async function getMemberOrderDetailsAction(
  orderId: string
): Promise<ActionResult<Record<string, unknown>>> {
  try {
    const user = await requireAuth();
    const supabase = await createClient();

    const { data: order, error } = await supabase
      .from('shop_orders')
      .select(`
        id,
        order_number,
        member_id,
        order_channel,
        fulfillment_type,
        fulfillment_status,
        delivery_address,
        customer_name,
        customer_phone,
        status,
        subtotal,
        discount_amount,
        total_amount,
        notes,
        created_at,
        confirmed_at,
        ready_at,
        completed_at,
        shop_order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          products (name, sku, price)
        )
      `)
      .eq('id', orderId)
      .single();

    if (error || !order) {
      throw new AppError('Order not found', 'NOT_FOUND', 404);
    }

    // Verify member permissions if not staff
    if (user.role === 'MEMBER' && order.member_id !== user.memberId) {
      throw new AuthorizationError('You do not have access to this order.');
    }

    return {
      success: true,
      data: order,
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Phase 2: Operational summary for Shop staff dashboard
 */
export async function getShopOperationalMetricsAction(): Promise<
  ActionResult<{
    pendingPickups: number;
    pendingDeliveries: number;
    lowStockSkus: number;
    totalOrdersToday: number;
  }>
> {
  try {
    await requirePermission('shop:read_products');
    const supabase = await createClient();

    const [{ count: pendingPickups }, { count: pendingDeliveries }, { data: products }] = await Promise.all([
      supabase
        .from('shop_orders')
        .select('*', { count: 'exact', head: true })
        .eq('fulfillment_type', 'PICKUP')
        .in('fulfillment_status', ['CONFIRMED', 'READY_FOR_PICKUP']),
      supabase
        .from('shop_orders')
        .select('*', { count: 'exact', head: true })
        .eq('fulfillment_type', 'DELIVERY')
        .in('fulfillment_status', ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY']),
      supabase
        .from('products')
        .select('low_stock_threshold, inventory(quantity_on_hand)'),
    ]);

    interface ProductThresholdRecord {
      low_stock_threshold: number;
      inventory: { quantity_on_hand: number } | null;
    }

    const lowStockSkus = ((products as unknown as ProductThresholdRecord[]) || []).filter((p) => {
      const qty = p.inventory?.quantity_on_hand ?? 0;
      return qty <= p.low_stock_threshold;
    }).length;

    return {
      success: true,
      data: {
        pendingPickups: pendingPickups ?? 0,
        pendingDeliveries: pendingDeliveries ?? 0,
        lowStockSkus,
        totalOrdersToday: (pendingPickups ?? 0) + (pendingDeliveries ?? 0),
      },
    };
  } catch (err) {
    return handleActionError(err);
  }
}

/**
 * Hardened Finance Integration: Records a completed payment for a shop order.
 * Prevents duplicate payments using database partial unique index and transaction checks.
 */
export async function recordShopOrderPaymentAction(
  input: RecordCommercePaymentInput
): Promise<ActionResult<{ paymentId: string; paymentNumber: string }>> {
  try {
    const validated = recordCommercePaymentSchema.parse(input);
    const user = await requireAuth();
    const supabase = await createClient();

    // 1. Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('shop_orders')
      .select('id, order_number, member_id, total_amount, status')
      .eq('id', validated.orderId)
      .single();

    if (orderErr || !order) {
      throw new AppError('Shop order not found.', 'NOT_FOUND', 404);
    }

    if (order.status === 'CANCELLED') {
      throw new AppError('Cannot record payment for a cancelled order.', 'BAD_REQUEST', 400);
    }

    // Authorization: staff/admin or the purchasing member
    const isStaff = ['OWNER', 'ADMIN', 'SHOP_STAFF', 'FRONT_DESK'].includes(user.role);
    const isOwnerMember = user.role === 'MEMBER' && user.memberId && order.member_id === user.memberId;
    if (!isStaff && !isOwnerMember) {
      throw new AuthorizationError('You do not have permission to record payment for this order.');
    }

    // 2. Concurrency & Duplication Guard: Check if completed payment already exists
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, payment_number')
      .eq('shop_order_id', validated.orderId)
      .eq('status', 'COMPLETED')
      .maybeSingle();

    if (existingPayment) {
      throw new AppError(
        `Payment already recorded for this order (${existingPayment.payment_number}). Duplicate payment rejected.`,
        'CONFLICT',
        409
      );
    }

    // 3. Insert payment record into public.payments
    const paymentNumber = `PAY-SHOP-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        payment_number: paymentNumber,
        shop_order_id: validated.orderId,
        member_id: order.member_id || null,
        amount: validated.amount,
        payment_method: validated.paymentMethod,
        status: 'COMPLETED',
        transaction_reference: validated.transactionReference || null,
        recorded_by: user.id,
      })
      .select('id')
      .single();

    if (payErr) {
      if (payErr.message.includes('idx_payments_shop_order_completed') || payErr.code === '23505') {
        throw new AppError('Duplicate payment detected by database constraint.', 'CONFLICT', 409);
      }
      throw payErr;
    }

    revalidatePath('/dashboard/shop');
    revalidatePath('/dashboard/payments');
    revalidatePath('/dashboard/reports');

    return {
      success: true,
      data: { paymentId: payment.id, paymentNumber },
      message: `Payment ${paymentNumber} of ₹${validated.amount.toFixed(2)} recorded successfully.`,
    };
  } catch (err) {
    return handleActionError(err);
  }
}


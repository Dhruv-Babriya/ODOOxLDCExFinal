'use server';

import { createClient } from '@/lib/supabase/server';
import { shopOrderCreateSchema, type ShopOrderCreateInput } from '@/lib/validations/shop';
import { handleActionError, AppError } from '@/lib/errors';
import { requireAuth } from '@/lib/auth/session';
import { calculateShopPrice } from '@/lib/pricing';
import type { ActionResult } from '@/types/shared';
import { revalidatePath } from 'next/cache';

/**
 * Server action to create a shop order and atomically deduct inventory
 */
export async function createShopOrderAction(
  input: ShopOrderCreateInput
): Promise<ActionResult<{ orderId: string; orderNumber: string }>> {
  try {
    const validated = shopOrderCreateSchema.parse(input);
    const user = await requireAuth();
    const supabase = await createClient();

    // 1. Fetch product prices and verify availability
    const productIds = validated.items.map((i) => i.productId);
    const { data: products, error: prodError } = await supabase
      .from('products')
      .select('id, name, price, is_active')
      .in('id', productIds);

    if (prodError || !products || products.length !== productIds.length) {
      throw new AppError('One or more products could not be found', 'NOT_FOUND', 404);
    }

    const priceMap = new Map(products.map((p) => [p.id, Number(p.price)]));

    // 2. Calculate subtotal
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

    // 3. Determine member discount
    let shopDiscountPercent = 0;
    if (validated.memberId) {
      const { data: member } = await supabase
        .from('members')
        .select(`
          id,
          status,
          membership_plans (shop_discount_percent)
        `)
        .eq('id', validated.memberId)
        .single();

      if (member?.status === 'ACTIVE' && member.membership_plans) {
        shopDiscountPercent = Number(member.membership_plans.shop_discount_percent);
      }
    }

    const pricing = calculateShopPrice({
      subtotal,
      shopDiscountPercent,
    });

    // Generate unique order number
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    // 4. Create shop order record
    const { data: order, error: orderError } = await supabase
      .from('shop_orders')
      .insert({
        order_number: orderNumber,
        member_id: validated.memberId || null,
        order_channel: validated.orderChannel,
        status: 'PROCESSING',
        subtotal: pricing.subtotal,
        discount_amount: pricing.discountAmount,
        total_amount: pricing.totalAmount,
        created_by: user.id,
      })
      .select('id')
      .single();

    if (orderError) throw orderError;

    // 5. Insert order items
    const { error: itemsError } = await supabase.from('shop_order_items').insert(
      orderItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
      }))
    );

    if (itemsError) throw itemsError;

    // 6. Atomically deduct inventory for each item using stored procedure
    const txType = validated.orderChannel === 'COUNTER' ? 'SALE_COUNTER' : 'SALE_ONLINE';
    for (const item of orderItems) {
      const { error: deductError } = await supabase.rpc('deduct_inventory', {
        p_product_id: item.productId,
        p_quantity: item.quantity,
        p_tx_type: txType,
        p_reference_id: order.id,
        p_notes: `Order ${orderNumber}`,
      });

      if (deductError) {
        throw deductError;
      }
    }

    revalidatePath('/dashboard/shop');
    revalidatePath('/dashboard/inventory');

    return {
      success: true,
      data: { orderId: order.id, orderNumber },
      message: 'Order created successfully.',
    };
  } catch (err) {
    return handleActionError(err);
  }
}

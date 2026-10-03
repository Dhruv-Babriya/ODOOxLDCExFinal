-- ============================================================================
-- The Champions Club - Phase 3 Migration: Shop, Inventory & Bar Hardening
-- Author: Developer 3 (Shop, Inventory & Bar Specialist)
-- ============================================================================

-- 1. Inventory Integrity: Ensure stock cannot become negative
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'inventory' AND constraint_name = 'inventory_quantity_on_hand_check'
  ) THEN
    ALTER TABLE public.inventory
      ADD CONSTRAINT inventory_quantity_on_hand_check CHECK (quantity_on_hand >= 0);
  END IF;
END $$;

-- 2. Traceability & Performance Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_tx_reference
  ON public.inventory_transactions (reference_id);

CREATE INDEX IF NOT EXISTS idx_inventory_tx_type_created
  ON public.inventory_transactions (transaction_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bar_orders_table_status
  ON public.bar_orders (table_id, order_status);

CREATE INDEX IF NOT EXISTS idx_customer_tabs_table_status
  ON public.customer_tabs (table_id, status);

CREATE INDEX IF NOT EXISTS idx_customer_tabs_member_status
  ON public.customer_tabs (member_id, status);

-- 3. Finance Integration Hardening: Prevent duplicate completed payments
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_shop_order_completed
  ON public.payments (shop_order_id)
  WHERE shop_order_id IS NOT NULL AND status = 'COMPLETED';

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_bar_order_completed
  ON public.payments (bar_order_id)
  WHERE bar_order_id IS NOT NULL AND status = 'COMPLETED';

-- 4. Hardened Shop Order Fulfillment State Machine
CREATE OR REPLACE FUNCTION public.update_shop_order_fulfillment(
  p_order_id UUID,
  p_new_fulfillment_status TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_next_app_status app_order_status;
BEGIN
  SELECT * INTO v_order
  FROM public.shop_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Shop order % not found', p_order_id
      USING ERRCODE = 'P0001';
  END IF;

  -- Rule 1: Cannot modify a cancelled order
  IF v_order.status = 'CANCELLED' OR v_order.fulfillment_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot modify a cancelled order'
      USING ERRCODE = 'P0001';
  END IF;

  -- Rule 2: Cannot revert a completed or collected order
  IF v_order.status = 'COMPLETED' AND p_new_fulfillment_status NOT IN ('COMPLETED', 'COLLECTED', 'DELIVERED') THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot revert a completed order to %', p_new_fulfillment_status
      USING ERRCODE = 'P0001';
  END IF;

  -- Rule 3: Guard against duplicate collection / delivery
  IF v_order.fulfillment_status = 'COLLECTED' AND p_new_fulfillment_status = 'COLLECTED' THEN
    RAISE EXCEPTION 'ALREADY_COLLECTED: Shop order % has already been collected', v_order.order_number
      USING ERRCODE = 'P0004';
  END IF;

  IF v_order.fulfillment_status = 'DELIVERED' AND p_new_fulfillment_status = 'DELIVERED' THEN
    RAISE EXCEPTION 'ALREADY_DELIVERED: Shop order % has already been delivered', v_order.order_number
      USING ERRCODE = 'P0004';
  END IF;

  -- Rule 4: Strict Step-by-Step Transition Matrix
  IF v_order.fulfillment_type = 'PICKUP' THEN
    IF v_order.fulfillment_status = 'PENDING' AND p_new_fulfillment_status NOT IN ('CONFIRMED', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Pickup orders must be CONFIRMED before advancing to %', p_new_fulfillment_status
        USING ERRCODE = 'P0001';
    ELSIF v_order.fulfillment_status = 'CONFIRMED' AND p_new_fulfillment_status NOT IN ('READY_FOR_PICKUP', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Confirmed pickup orders must be marked READY_FOR_PICKUP before %', p_new_fulfillment_status
        USING ERRCODE = 'P0001';
    ELSIF v_order.fulfillment_status = 'READY_FOR_PICKUP' AND p_new_fulfillment_status NOT IN ('COLLECTED', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Ready pickup orders must be COLLECTED or CANCELLED, not %', p_new_fulfillment_status
        USING ERRCODE = 'P0001';
    END IF;
  ELSIF v_order.fulfillment_type = 'DELIVERY' THEN
    IF v_order.fulfillment_status = 'PENDING' AND p_new_fulfillment_status NOT IN ('CONFIRMED', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Delivery orders must be CONFIRMED before advancing to %', p_new_fulfillment_status
        USING ERRCODE = 'P0001';
    ELSIF v_order.fulfillment_status = 'CONFIRMED' AND p_new_fulfillment_status NOT IN ('PREPARING', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Confirmed delivery orders must transition to PREPARING before %', p_new_fulfillment_status
        USING ERRCODE = 'P0001';
    ELSIF v_order.fulfillment_status = 'PREPARING' AND p_new_fulfillment_status NOT IN ('OUT_FOR_DELIVERY', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Preparing delivery orders must transition to OUT_FOR_DELIVERY before %', p_new_fulfillment_status
        USING ERRCODE = 'P0001';
    ELSIF v_order.fulfillment_status = 'OUT_FOR_DELIVERY' AND p_new_fulfillment_status NOT IN ('DELIVERED', 'CANCELLED') THEN
      RAISE EXCEPTION 'INVALID_TRANSITION: Out for delivery orders must be marked DELIVERED or CANCELLED, not %', p_new_fulfillment_status
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Determine sync with Phase 0 app_order_status
  IF p_new_fulfillment_status IN ('COLLECTED', 'DELIVERED', 'COMPLETED') THEN
    v_next_app_status := 'COMPLETED';
  ELSIF p_new_fulfillment_status IN ('CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY') THEN
    v_next_app_status := 'PROCESSING';
  ELSIF p_new_fulfillment_status = 'CANCELLED' THEN
    v_next_app_status := 'CANCELLED';
  ELSE
    v_next_app_status := 'PENDING';
  END IF;

  -- Update order with corresponding timestamp
  UPDATE public.shop_orders
  SET fulfillment_status = p_new_fulfillment_status,
      status = v_next_app_status,
      confirmed_at = CASE WHEN p_new_fulfillment_status = 'CONFIRMED' AND confirmed_at IS NULL THEN NOW() ELSE confirmed_at END,
      ready_at = CASE WHEN p_new_fulfillment_status IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY') AND ready_at IS NULL THEN NOW() ELSE ready_at END,
      completed_at = CASE WHEN p_new_fulfillment_status IN ('COLLECTED', 'DELIVERED', 'COMPLETED') AND completed_at IS NULL THEN NOW() ELSE completed_at END,
      notes = COALESCE(p_notes, notes),
      updated_at = NOW()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Hardened Cancellation: Prevent cancelling completed/collected orders
CREATE OR REPLACE FUNCTION public.cancel_shop_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  SELECT * INTO v_order
  FROM public.shop_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Shop order % not found', p_order_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order.status = 'CANCELLED' OR v_order.fulfillment_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'ORDER_ALREADY_CANCELLED: Shop order is already cancelled'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order.status = 'COMPLETED' OR v_order.fulfillment_status IN ('COLLECTED', 'DELIVERED', 'COMPLETED') THEN
    RAISE EXCEPTION 'CANNOT_CANCEL_COMPLETED: Completed or collected orders cannot be cancelled'
      USING ERRCODE = 'P0001';
  END IF;

  -- Mark order as cancelled with Phase 2/3 operational lifecycle tracking
  UPDATE public.shop_orders
  SET status = 'CANCELLED',
      fulfillment_status = 'CANCELLED',
      cancelled_at = NOW(),
      cancellation_reason = COALESCE(p_reason, 'Order cancelled'),
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Restore stock for all items in the order
  FOR v_item IN
    SELECT product_id, quantity
    FROM public.shop_order_items
    WHERE order_id = p_order_id
  LOOP
    UPDATE public.inventory
    SET quantity_on_hand = quantity_on_hand + v_item.quantity,
        updated_at = NOW()
    WHERE product_id = v_item.product_id;

    INSERT INTO public.inventory_transactions (
      product_id,
      change_quantity,
      transaction_type,
      reference_id,
      notes,
      created_by
    )
    VALUES (
      v_item.product_id,
      v_item.quantity,
      'RETURN',
      p_order_id,
      COALESCE(p_reason, 'Stock restored on shop order cancellation'),
      auth.uid()
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

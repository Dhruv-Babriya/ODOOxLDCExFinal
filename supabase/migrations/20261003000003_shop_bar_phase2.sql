-- ============================================================================
-- The Champions Club - Phase 2 Migration: Shop & Bar Operations
-- Author: Developer 3 (Shop, Inventory & Bar Specialist)
-- ============================================================================

-- 1. Shop Orders: Operational Lifecycle & Tracking Fields
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS fulfillment_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT DEFAULT NULL;

-- Index for operational queue queries (pickup queue, delivery queue, pending dispatch)
CREATE INDEX IF NOT EXISTS idx_shop_orders_operational
  ON public.shop_orders (fulfillment_type, fulfillment_status, created_at DESC);

-- 2. Helper: Get Table Outstanding Balance
-- Sums total_amount for all unsettled bar orders currently on the table or its open tab
CREATE OR REPLACE FUNCTION public.get_table_outstanding_balance(p_table_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_total NUMERIC := 0.00;
BEGIN
  -- Sum orders directly on table or on an active tab linked to this table
  SELECT COALESCE(SUM(bo.total_amount), 0.00) INTO v_total
  FROM public.bar_orders bo
  LEFT JOIN public.customer_tabs ct ON bo.tab_id = ct.id
  WHERE (bo.table_id = p_table_id OR ct.table_id = p_table_id)
    AND bo.order_status NOT IN ('COMPLETED', 'CANCELLED');

  RETURN v_total;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 3. Helper: Check if Customer Tab has Unserved Kitchen Orders
-- Returns count of orders still in PENDING or PREPARING state
CREATE OR REPLACE FUNCTION public.check_tab_has_unserved_orders(p_tab_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM public.bar_orders
  WHERE tab_id = p_tab_id
    AND kitchen_status IN ('PENDING', 'PREPARING');

  RETURN v_count;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 4. Enhanced Customer Tab Closure Function
-- Prevents closing tab if unserved food orders exist (unless p_force is true)
CREATE OR REPLACE FUNCTION public.close_customer_tab(
  p_tab_id UUID,
  p_force BOOLEAN DEFAULT FALSE
)
RETURNS NUMERIC AS $$
DECLARE
  v_tab RECORD;
  v_unserved_count INTEGER;
  v_total_amount NUMERIC := 0.00;
BEGIN
  -- 1. Lock the tab row
  SELECT * INTO v_tab
  FROM public.customer_tabs
  WHERE id = p_tab_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TAB_NOT_FOUND: Customer tab % not found', p_tab_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_tab.status = 'CLOSED' THEN
    RAISE EXCEPTION 'TAB_ALREADY_CLOSED: Customer tab % is already closed', p_tab_id
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Check for unserved kitchen tickets
  IF NOT p_force THEN
    SELECT public.check_tab_has_unserved_orders(p_tab_id) INTO v_unserved_count;
    IF v_unserved_count > 0 THEN
      RAISE EXCEPTION 'UNSERVED_KITCHEN_ORDERS: Tab % has % unserved order(s) currently in preparation. Serve or cancel them before settling.',
        p_tab_id, v_unserved_count USING ERRCODE = 'P0003';
    END IF;
  END IF;

  -- 3. Sum total amount of all active orders on this tab
  SELECT COALESCE(SUM(total_amount), 0.00) INTO v_total_amount
  FROM public.bar_orders
  WHERE tab_id = p_tab_id
    AND order_status != 'CANCELLED';

  -- 4. Close the tab
  UPDATE public.customer_tabs
  SET status = 'CLOSED',
      closed_at = NOW()
  WHERE id = p_tab_id;

  -- 5. Mark all orders on this tab as COMPLETED
  UPDATE public.bar_orders
  SET order_status = 'COMPLETED',
      updated_at = NOW()
  WHERE tab_id = p_tab_id
    AND order_status != 'CANCELLED';

  -- 6. Release associated floor table to AVAILABLE
  IF v_tab.table_id IS NOT NULL THEN
    UPDATE public.bar_tables
    SET status = 'AVAILABLE'
    WHERE id = v_tab.table_id;
  END IF;

  RETURN v_total_amount;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Atomic Shop Order Fulfillment Lifecycle State Transition Function
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

  IF v_order.status = 'CANCELLED' OR v_order.fulfillment_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot modify a cancelled order'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_order.status = 'COMPLETED' AND p_new_fulfillment_status != 'COMPLETED' THEN
    RAISE EXCEPTION 'INVALID_TRANSITION: Cannot revert a completed order'
      USING ERRCODE = 'P0001';
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

-- 6. Atomic Shop Order Cancellation with Stock Restoration & Lifecycle Timestamps
CREATE OR REPLACE FUNCTION public.cancel_shop_order(
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_current_status app_order_status;
  v_item RECORD;
BEGIN
  SELECT status INTO v_current_status
  FROM public.shop_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Shop order % not found', p_order_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_current_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'ORDER_ALREADY_CANCELLED: Shop order is already cancelled'
      USING ERRCODE = 'P0001';
  END IF;

  -- Mark order as cancelled with Phase 2 operational lifecycle tracking
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


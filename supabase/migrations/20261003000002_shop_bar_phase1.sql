-- =============================================================================
-- THE CHAMPIONS CLUB - PHASE 1: SHOP, INVENTORY & BAR/CAFETERIA EXTENSIONS
-- Developer 3 (Shop & Bar Specialist)
-- Migration: 20261003000002_shop_bar_phase1.sql
-- =============================================================================

-- 1. Shop Orders: Pickup/Delivery & Contact Details
ALTER TABLE public.shop_orders
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NOT NULL DEFAULT 'PICKUP'
    CONSTRAINT check_shop_order_fulfillment CHECK (fulfillment_type IN ('PICKUP', 'DELIVERY')),
  ADD COLUMN IF NOT EXISTS delivery_address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS customer_email TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- 2. Customer Tabs: Tab Number, Guest Name, Credit Limit & Notes
ALTER TABLE public.customer_tabs
  ADD COLUMN IF NOT EXISTS tab_number TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS guest_name TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS credit_limit NUMERIC(10,2) NOT NULL DEFAULT 0.00
    CONSTRAINT check_tab_credit_limit CHECK (credit_limit >= 0),
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_tabs_tab_number
  ON public.customer_tabs(tab_number)
  WHERE tab_number IS NOT NULL;

-- 3. Bar Orders: Notes
ALTER TABLE public.bar_orders
  ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT NULL;

-- 4. Atomic Inventory Adjustment & Restocking Function
CREATE OR REPLACE FUNCTION public.adjust_inventory(
  p_product_id UUID,
  p_quantity_change INTEGER,
  p_tx_type app_inventory_transaction_type,
  p_reference_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_new_quantity INTEGER;
BEGIN
  IF p_quantity_change = 0 THEN
    RAISE EXCEPTION 'ZERO_QUANTITY_CHANGE: Quantity change cannot be zero.'
      USING ERRCODE = 'P0001';
  END IF;

  -- If subtracting, atomically lock row and check for non-negative stock
  IF p_quantity_change < 0 THEN
    UPDATE public.inventory
    SET quantity_on_hand = quantity_on_hand + p_quantity_change,
        updated_at = NOW()
    WHERE product_id = p_product_id
      AND quantity_on_hand >= ABS(p_quantity_change)
    RETURNING quantity_on_hand INTO v_new_quantity;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % has insufficient stock for deduction of %',
        p_product_id, ABS(p_quantity_change) USING ERRCODE = 'P0002';
    END IF;
  ELSE
    -- If adding/restocking
    UPDATE public.inventory
    SET quantity_on_hand = quantity_on_hand + p_quantity_change,
        updated_at = NOW()
    WHERE product_id = p_product_id
    RETURNING quantity_on_hand INTO v_new_quantity;

    IF NOT FOUND THEN
      INSERT INTO public.inventory (product_id, quantity_on_hand, updated_at)
      VALUES (p_product_id, p_quantity_change, NOW())
      RETURNING quantity_on_hand INTO v_new_quantity;
    END IF;
  END IF;

  -- Record in audit ledger
  INSERT INTO public.inventory_transactions (
    product_id,
    change_quantity,
    transaction_type,
    reference_id,
    notes,
    created_by
  )
  VALUES (
    p_product_id,
    p_quantity_change,
    p_tx_type,
    p_reference_id,
    p_notes,
    auth.uid()
  );

  RETURN v_new_quantity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Atomic Shop Order Cancellation with Stock Restoration
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

  -- Mark order as cancelled
  UPDATE public.shop_orders
  SET status = 'CANCELLED',
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

-- 6. Atomic Close Tab & Free Associated Table
CREATE OR REPLACE FUNCTION public.close_customer_tab(
  p_tab_id UUID
)
RETURNS NUMERIC AS $$
DECLARE
  v_status app_tab_status;
  v_table_id UUID;
  v_total_outstanding NUMERIC(10,2) := 0.00;
  v_other_open_tabs INTEGER;
BEGIN
  SELECT status, table_id INTO v_status, v_table_id
  FROM public.customer_tabs
  WHERE id = p_tab_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TAB_NOT_FOUND: Customer tab % not found', p_tab_id
      USING ERRCODE = 'P0001';
  END IF;

  IF v_status != 'OPEN' THEN
    RAISE EXCEPTION 'TAB_NOT_OPEN: Tab is already % and cannot be closed', v_status
      USING ERRCODE = 'P0001';
  END IF;

  -- Calculate total amount across all non-cancelled orders on this tab
  SELECT COALESCE(SUM(total_amount), 0.00) INTO v_total_outstanding
  FROM public.bar_orders
  WHERE tab_id = p_tab_id
    AND order_status != 'CANCELLED';

  -- Close the tab
  UPDATE public.customer_tabs
  SET status = 'CLOSED',
      closed_at = NOW()
  WHERE id = p_tab_id;

  -- If tied to a table, verify whether any other tabs are open on that table
  IF v_table_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_other_open_tabs
    FROM public.customer_tabs
    WHERE table_id = v_table_id
      AND status = 'OPEN'
      AND id != p_tab_id;

    IF v_other_open_tabs = 0 THEN
      UPDATE public.bar_tables
      SET status = 'AVAILABLE'
      WHERE id = v_table_id;
    END IF;
  END IF;

  RETURN v_total_outstanding;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Ensure RLS policies support required staff and member workflows
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shop_orders' AND policyname = 'shop_orders_manage'
  ) THEN
    CREATE POLICY "shop_orders_manage" ON public.shop_orders
      FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shop_order_items' AND policyname = 'shop_order_items_insert'
  ) THEN
    CREATE POLICY "shop_order_items_insert" ON public.shop_order_items
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'bar_order_items' AND policyname = 'bar_order_items_manage'
  ) THEN
    CREATE POLICY "bar_order_items_manage" ON public.bar_order_items
      FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'BAR_STAFF', 'FRONT_DESK'));
  END IF;
END $$;

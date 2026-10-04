-- =============================================================================
-- Migration: 20261003000013_allow_members_read_inventory.sql
-- Description:
--   Allow authenticated members and public store visitors to read inventory stock levels.
--   Ensures when managers restock products, updated stock levels are immediately visible
--   in the Member Pro Shop portal and public catalog.
-- =============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'inventory' AND policyname = 'inventory_select') THEN
    ALTER POLICY "inventory_select" ON public.inventory USING (true);
  ELSE
    CREATE POLICY "inventory_select" ON public.inventory FOR SELECT USING (true);
  END IF;
END $$;

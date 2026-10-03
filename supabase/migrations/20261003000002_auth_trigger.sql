-- =============================================================================
-- Migration: 20261003000002_auth_trigger.sql
-- Description: Attach handle_new_user trigger to auth.users for automatic profile synchronization
-- Module: Developer 1 (Core Platform & Auth)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END $$;

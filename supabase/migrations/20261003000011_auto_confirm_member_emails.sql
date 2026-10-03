-- =============================================================================
-- Migration: 20261003000011_auto_confirm_member_emails.sql
-- Description:
--   1. Create auto_confirm_user_email function and attach BEFORE INSERT trigger
--      on auth.users so that member self-registrations are immediately verified
--      and can log in without waiting for external SMTP email verification.
--   2. Create public.confirm_user_email RPC helper for seamless auto-confirm on login.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.auto_confirm_user_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trig_auto_confirm_auth_users'
  ) THEN
    CREATE TRIGGER trig_auto_confirm_auth_users
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_confirm_user_email();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_user_email(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE lower(email) = lower(trim(p_email));
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_user_email(text) TO anon, authenticated, service_role;

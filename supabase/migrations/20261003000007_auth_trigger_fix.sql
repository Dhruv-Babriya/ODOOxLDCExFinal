-- =============================================================================
-- Migration: 20261003000007_auth_trigger_fix.sql
-- Description: Harden handle_new_user and get_user_role with explicit search_path and safe role casting
-- Fixes: "type app_role does not exist" / "Database error saving new user" during user registration
-- =============================================================================

-- Ensure handle_new_user has explicit search_path and safe role enum resolution
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role public.app_role := 'MEMBER'::public.app_role;
  v_raw_role text;
BEGIN
  v_raw_role := NEW.raw_user_meta_data->>'role';
  IF v_raw_role IS NOT NULL AND v_raw_role IN ('OWNER', 'ADMIN', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF', 'MEMBER') THEN
    v_role := v_raw_role::public.app_role;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Ensure get_user_role has explicit search_path and explicit schema reference
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.app_role
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'MEMBER'::public.app_role);
END;
$$;

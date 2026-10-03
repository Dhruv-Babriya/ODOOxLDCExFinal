-- =============================================================================
-- Migration: 20261003000008_register_member_direct.sql
-- Description: Direct member registration function to bypass email rate limits
-- Allows seamless registration even when built-in SMTP rate limit is exceeded
-- =============================================================================

CREATE OR REPLACE FUNCTION public.register_member_direct(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_encrypted_pw text;
BEGIN
  -- Check if user already exists
  IF EXISTS (SELECT 1 FROM auth.users WHERE lower(email) = lower(p_email)) THEN
    RAISE EXCEPTION 'User already registered with this email';
  END IF;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone_change_token,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) VALUES (
    v_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    lower(p_email),
    v_encrypted_pw,
    NOW(),
    '',
    '',
    '',
    '',
    '',
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object(
      'sub', v_user_id,
      'email', lower(p_email),
      'full_name', p_full_name,
      'phone', p_phone,
      'role', 'MEMBER',
      'email_verified', true
    ),
    NOW(),
    NOW(),
    false,
    false
  );

  INSERT INTO auth.identities (
    id,
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_user_id::text,
    v_user_id,
    jsonb_build_object(
      'sub', v_user_id,
      'email', lower(p_email),
      'full_name', p_full_name,
      'phone', p_phone,
      'role', 'MEMBER',
      'email_verified', true
    ),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RETURN v_user_id;
END;
$$;

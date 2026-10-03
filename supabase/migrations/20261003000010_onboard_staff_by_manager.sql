-- =============================================================================
-- Migration: 20261003000010_onboard_staff_by_manager.sql
-- Description:
--   1. Harden handle_new_user so public registration ALWAYS forces 'MEMBER' role.
--      Staff cannot self-register under any circumstances.
--   2. Implement onboard_staff_direct function callable only by Managers (ADMIN)
--      or Club Owners to provision staff accounts and create staff roster records.
-- =============================================================================

-- 1. Harden handle_new_user: Any self-registration is strictly 'MEMBER'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Public self-registration ALWAYS receives 'MEMBER' role to prevent privilege escalation.
  -- Staff roles (ADMIN, FRONT_DESK, SHOP_STAFF, BAR_STAFF) can ONLY be provisioned
  -- by Managers/Owners via onboard_staff_direct.
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    'MEMBER'::public.app_role
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

-- 2. Create onboard_staff_direct for Manager & Owner staff provisioning
CREATE OR REPLACE FUNCTION public.onboard_staff_direct(
  p_email text,
  p_password text,
  p_full_name text,
  p_phone text DEFAULT NULL,
  p_role text DEFAULT 'FRONT_DESK',
  p_employee_code text DEFAULT '',
  p_department text DEFAULT 'FRONT_DESK',
  p_position text DEFAULT 'Staff Member',
  p_hourly_rate numeric DEFAULT 0.00,
  p_salary_monthly numeric DEFAULT 0.00,
  p_hire_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_caller_role public.app_role;
  v_user_id uuid;
  v_encrypted_pw text;
  v_staff_id uuid;
  v_target_role public.app_role;
  v_target_dept public.app_department;
BEGIN
  -- 1. Security Check: Caller MUST be an authenticated manager (ADMIN) or club OWNER
  SELECT role INTO v_caller_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('OWNER', 'ADMIN') THEN
    RAISE EXCEPTION 'Access denied: Only managers (ADMIN) or club owners can onboard staff.';
  END IF;

  -- 2. Validate target role (staff must NOT be MEMBER)
  IF p_role NOT IN ('ADMIN', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF') THEN
    RAISE EXCEPTION 'Invalid staff role: %. Staff must be assigned one of: ADMIN, FRONT_DESK, SHOP_STAFF, BAR_STAFF.', p_role;
  END IF;
  v_target_role := p_role::public.app_role;

  -- 3. Validate target department
  IF p_department NOT IN ('MANAGEMENT', 'FRONT_DESK', 'COURTS', 'SHOP', 'BAR', 'MAINTENANCE') THEN
    RAISE EXCEPTION 'Invalid department: %. Must be one of: MANAGEMENT, FRONT_DESK, COURTS, SHOP, BAR, MAINTENANCE.', p_department;
  END IF;
  v_target_dept := p_department::public.app_department;

  -- 4. Validate employee code
  IF p_employee_code IS NULL OR trim(p_employee_code) = '' THEN
    RAISE EXCEPTION 'Employee code is required.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.staff WHERE lower(employee_code) = lower(trim(p_employee_code))) THEN
    RAISE EXCEPTION 'Employee code "%" is already assigned to an existing staff member.', p_employee_code;
  END IF;

  -- 5. Find if user exists in auth.users OR in public.profiles
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(trim(p_email));

  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id
    FROM public.profiles
    WHERE lower(email) = lower(trim(p_email));
  END IF;

  IF v_user_id IS NOT NULL THEN
    -- Check if user already has an active staff record
    IF EXISTS (SELECT 1 FROM public.staff WHERE profile_id = v_user_id) THEN
      RAISE EXCEPTION 'A staff or manager record already exists for email "%".', p_email;
    END IF;

    -- Ensure auth.users exists (if they existed only in profiles)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_user_id) THEN
      v_encrypted_pw := extensions.crypt(COALESCE(p_password, 'ManagerPass123!'), extensions.gen_salt('bf', 10));
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
      ) VALUES (
        v_user_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
        lower(trim(p_email)), v_encrypted_pw, NOW(),
        jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
        jsonb_build_object('sub', v_user_id, 'email', lower(trim(p_email)), 'full_name', p_full_name, 'phone', p_phone, 'role', p_role, 'email_verified', true),
        NOW(), NOW(), false, false
      );
    ELSE
      -- Update password and user metadata if provided
      IF p_password IS NOT NULL AND length(p_password) >= 6 THEN
        v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
        UPDATE auth.users
        SET encrypted_password = v_encrypted_pw,
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
              'full_name', p_full_name,
              'phone', p_phone,
              'role', p_role
            ),
            updated_at = NOW()
        WHERE id = v_user_id;
      END IF;
    END IF;

    -- Upsert profile record
    INSERT INTO public.profiles (
      id, email, full_name, phone, role, is_active
    ) VALUES (
      v_user_id, lower(trim(p_email)), COALESCE(nullif(trim(p_full_name), ''), 'Club Manager'), p_phone, v_target_role, true
    )
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      email = EXCLUDED.email,
      is_active = true,
      updated_at = NOW();

  ELSE
    -- Brand new user
    IF p_password IS NULL OR length(p_password) < 6 THEN
      RAISE EXCEPTION 'Password must be at least 6 characters.';
    END IF;

    v_user_id := gen_random_uuid();
    v_encrypted_pw := extensions.crypt(p_password, extensions.gen_salt('bf', 10));

    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      confirmation_token, recovery_token, email_change_token_new, email_change, phone_change_token,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at, is_sso_user, is_anonymous
    ) VALUES (
      v_user_id, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated',
      lower(trim(p_email)), v_encrypted_pw, NOW(), '', '', '', '', '',
      jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
      jsonb_build_object('sub', v_user_id, 'email', lower(trim(p_email)), 'full_name', p_full_name, 'phone', p_phone, 'role', p_role, 'email_verified', true),
      NOW(), NOW(), false, false
    );

    INSERT INTO auth.identities (
      id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), v_user_id::text, v_user_id,
      jsonb_build_object('sub', v_user_id, 'email', lower(trim(p_email)), 'full_name', p_full_name, 'phone', p_phone, 'role', p_role, 'email_verified', true),
      'email', NOW(), NOW(), NOW()
    );

    INSERT INTO public.profiles (
      id, email, full_name, phone, role, is_active
    ) VALUES (
      v_user_id, lower(trim(p_email)), p_full_name, p_phone, v_target_role, true
    )
    ON CONFLICT (id) DO UPDATE SET
      role = EXCLUDED.role,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
      email = EXCLUDED.email,
      is_active = true,
      updated_at = NOW();
  END IF;

  -- 6. Insert staff record
  INSERT INTO public.staff (
    id,
    profile_id,
    employee_code,
    department,
    position,
    hourly_rate,
    salary_monthly,
    hire_date,
    is_active
  ) VALUES (
    gen_random_uuid(),
    v_user_id,
    trim(p_employee_code),
    v_target_dept,
    trim(p_position),
    COALESCE(p_hourly_rate, 0.00),
    COALESCE(p_salary_monthly, 0.00),
    COALESCE(p_hire_date, CURRENT_DATE),
    true
  )
  ON CONFLICT (profile_id) DO UPDATE SET
    employee_code = EXCLUDED.employee_code,
    department = EXCLUDED.department,
    position = EXCLUDED.position,
    salary_monthly = EXCLUDED.salary_monthly,
    is_active = true
  RETURNING id INTO v_staff_id;

  RETURN jsonb_build_object(
    'success', true,
    'staff_id', v_staff_id,
    'profile_id', v_user_id,
    'email', lower(trim(p_email)),
    'full_name', p_full_name,
    'role', p_role,
    'department', p_department,
    'position', p_position,
    'employee_code', p_employee_code
  );
END;
$$;

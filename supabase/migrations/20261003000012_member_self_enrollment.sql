-- =============================================================================
-- Migration: 20261003000012_member_self_enrollment.sql
-- Description:
--   1. Add atomic SECURITY DEFINER functions for member self-enrollment and renewal
--   2. Add RLS policies allowing authenticated users to manage their own membership records,
--      invoices, invoice items, and payments
-- =============================================================================

-- 1. Atomic self-service membership enrollment function
CREATE OR REPLACE FUNCTION public.enroll_member_self(
  p_user_id UUID,
  p_plan_id UUID,
  p_payment_method TEXT DEFAULT 'CARD',
  p_payment_reference TEXT DEFAULT NULL,
  p_emergency_contact TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role public.app_role;
  v_existing_member RECORD;
  v_plan RECORD;
  v_start_date DATE;
  v_end_date DATE;
  v_membership_number TEXT;
  v_member_id UUID;
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_payment_number TEXT;
  v_is_paid BOOLEAN;
  v_user_email TEXT;
  v_user_name TEXT;
  v_plan_price NUMERIC(10,2);
BEGIN
  -- 1. Authentication & authorization check
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    SELECT role, email, full_name INTO v_caller_role, v_user_email, v_user_name
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_caller_role IS NULL THEN
      RAISE EXCEPTION 'User profile not found' USING ERRCODE = 'P0001';
    END IF;
  ELSE
    SELECT role, email, full_name INTO v_caller_role, v_user_email, v_user_name
    FROM public.profiles
    WHERE id = v_caller_id;

    IF v_caller_id != p_user_id AND v_caller_role NOT IN ('OWNER', 'ADMIN', 'FRONT_DESK') THEN
      RAISE EXCEPTION 'Access denied. You do not have sufficient privileges to complete this action.' USING ERRCODE = '42501';
    END IF;

    IF v_caller_id != p_user_id THEN
      SELECT email, full_name INTO v_user_email, v_user_name
      FROM public.profiles
      WHERE id = p_user_id;
    END IF;
  END IF;

  -- 2. Check if user already has an active or pending membership record
  SELECT id, membership_number, status INTO v_existing_member
  FROM public.members
  WHERE profile_id = p_user_id
  LIMIT 1;

  IF v_existing_member.id IS NOT NULL AND v_existing_member.status IN ('ACTIVE', 'PENDING') THEN
    RAISE EXCEPTION 'Account already has an active membership (#%). Please use renewal instead.', v_existing_member.membership_number
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Fetch plan details
  SELECT id, name, price, duration_days, is_active INTO v_plan
  FROM public.membership_plans
  WHERE id = p_plan_id;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Selected membership plan not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_plan.is_active = FALSE THEN
    RAISE EXCEPTION 'Selected membership plan is no longer available' USING ERRCODE = 'P0001';
  END IF;

  v_plan_price := v_plan.price;

  -- 4. Compute validity dates and membership number
  v_start_date := CURRENT_DATE;
  v_end_date := CURRENT_DATE + (v_plan.duration_days || ' days')::INTERVAL;
  v_membership_number := 'CC-' || floor(100000 + random() * 900000)::text;

  IF v_existing_member.id IS NOT NULL THEN
    v_member_id := v_existing_member.id;
    UPDATE public.members
    SET
      current_plan_id = v_plan.id,
      status = 'ACTIVE',
      start_date = v_start_date,
      end_date = v_end_date,
      emergency_contact = COALESCE(NULLIF(p_emergency_contact, ''), emergency_contact),
      notes = COALESCE(NULLIF(p_notes, ''), notes, 'Self-service online enrollment'),
      updated_at = NOW()
    WHERE id = v_member_id;
  ELSE
    INSERT INTO public.members (
      profile_id,
      membership_number,
      current_plan_id,
      status,
      start_date,
      end_date,
      emergency_contact,
      notes
    ) VALUES (
      p_user_id,
      v_membership_number,
      v_plan.id,
      'ACTIVE',
      v_start_date,
      v_end_date,
      NULLIF(p_emergency_contact, ''),
      COALESCE(NULLIF(p_notes, ''), 'Self-service online enrollment')
    ) RETURNING id INTO v_member_id;
  END IF;

  -- 5. Record history
  INSERT INTO public.membership_history (
    member_id,
    plan_id,
    start_date,
    end_date,
    status,
    changed_by,
    notes
  ) VALUES (
    v_member_id,
    v_plan.id,
    v_start_date,
    v_end_date,
    'ACTIVE',
    p_user_id,
    'Initial self-service enrollment in ' || v_plan.name
  );

  -- 6. Create registration invoice and optional payment
  v_is_paid := (p_payment_method IS NOT NULL AND p_payment_method != 'UNPAID');
  v_invoice_number := 'INV-ENR-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' || floor(100 + random() * 900)::text;

  INSERT INTO public.invoices (
    invoice_number,
    member_id,
    recipient_name,
    recipient_email,
    recipient_type,
    subtotal,
    tax_amount,
    total_amount,
    paid_amount,
    status,
    due_date,
    notes,
    created_by
  ) VALUES (
    v_invoice_number,
    v_member_id,
    COALESCE(v_user_name, split_part(v_user_email, '@', 1)),
    v_user_email,
    'MEMBER',
    v_plan_price,
    0,
    v_plan_price,
    CASE WHEN v_is_paid THEN v_plan_price ELSE 0 END,
    CASE WHEN v_is_paid THEN 'PAID'::public.app_invoice_status ELSE 'ISSUED'::public.app_invoice_status END,
    v_start_date,
    'Initial self-enrollment in ' || v_plan.name,
    p_user_id
  ) RETURNING id INTO v_invoice_id;

  -- 7. Insert invoice item
  INSERT INTO public.invoice_items (
    invoice_id,
    description,
    quantity,
    unit_price,
    total_price
  ) VALUES (
    v_invoice_id,
    'Initial Membership: ' || v_plan.name || ' (' || v_start_date || ' to ' || v_end_date || ')',
    1,
    v_plan_price,
    v_plan_price
  );

  -- 8. Record payment if paid
  IF v_is_paid THEN
    v_payment_number := 'PAY-ENR-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' || floor(100 + random() * 900)::text;

    INSERT INTO public.payments (
      payment_number,
      amount,
      payment_method,
      status,
      transaction_reference,
      member_id,
      invoice_id,
      recorded_by
    ) VALUES (
      v_payment_number,
      v_plan_price,
      p_payment_method::public.app_payment_method,
      'COMPLETED',
      NULLIF(p_payment_reference, ''),
      v_member_id,
      v_invoice_id,
      p_user_id
    );
  END IF;

  -- 9. Send welcome notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    link,
    is_read
  ) VALUES (
    p_user_id,
    'Welcome to The Champions Club!',
    'Your ' || v_plan.name || ' membership (#' || v_membership_number || ') is active until ' || v_end_date || '. Enjoy club privileges and court booking discounts!',
    'SUCCESS',
    '/dashboard/portal',
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'member_id', v_member_id,
    'membership_number', v_membership_number,
    'invoice_id', v_invoice_id,
    'invoice_number', v_invoice_number
  );
END;
$$;

-- 2. Atomic self-service membership renewal function
CREATE OR REPLACE FUNCTION public.renew_membership_self(
  p_member_id UUID,
  p_plan_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_payment_method TEXT DEFAULT 'CARD',
  p_payment_reference TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_role public.app_role;
  v_member RECORD;
  v_plan RECORD;
  v_invoice_number TEXT;
  v_invoice_id UUID;
  v_payment_number TEXT;
  v_is_paid BOOLEAN;
  v_plan_price NUMERIC(10,2);
  v_is_plan_change BOOLEAN;
  v_history_notes TEXT;
BEGIN
  -- 1. Fetch current member record
  SELECT m.id, m.profile_id, m.current_plan_id, m.membership_number, p.email, p.full_name
  INTO v_member
  FROM public.members m
  JOIN public.profiles p ON p.id = m.profile_id
  WHERE m.id = p_member_id;

  IF v_member.id IS NULL THEN
    RAISE EXCEPTION 'Member record not found' USING ERRCODE = 'P0001';
  END IF;

  -- 2. Authorization check
  v_caller_id := auth.uid();
  IF v_caller_id IS NOT NULL THEN
    SELECT role INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;
    IF v_caller_id != v_member.profile_id AND v_caller_role NOT IN ('OWNER', 'ADMIN', 'FRONT_DESK') THEN
      RAISE EXCEPTION 'You do not have permission to renew this membership.' USING ERRCODE = '42501';
    END IF;
  ELSE
    v_caller_id := v_member.profile_id;
  END IF;

  -- 3. Fetch new plan
  SELECT id, name, price, duration_days, is_active INTO v_plan
  FROM public.membership_plans
  WHERE id = p_plan_id;

  IF v_plan.id IS NULL THEN
    RAISE EXCEPTION 'Selected membership plan not found' USING ERRCODE = 'P0001';
  END IF;

  IF v_plan.is_active = FALSE THEN
    RAISE EXCEPTION 'Selected membership plan is no longer active' USING ERRCODE = 'P0001';
  END IF;

  v_plan_price := v_plan.price;
  v_is_plan_change := (v_member.current_plan_id != p_plan_id);

  -- 4. Update member record
  UPDATE public.members
  SET
    current_plan_id = p_plan_id,
    start_date = p_start_date,
    end_date = p_end_date,
    status = 'ACTIVE',
    updated_at = NOW()
  WHERE id = p_member_id;

  -- 5. Insert history
  v_history_notes := CASE
    WHEN NULLIF(p_notes, '') IS NOT NULL THEN
      CASE WHEN v_is_plan_change THEN 'Plan upgraded/changed: ' ELSE 'Membership renewed: ' END || p_notes
    WHEN v_is_plan_change THEN 'Membership plan changed'
    ELSE 'Membership renewed for another term'
  END;

  INSERT INTO public.membership_history (
    member_id,
    plan_id,
    start_date,
    end_date,
    status,
    changed_by,
    notes
  ) VALUES (
    p_member_id,
    p_plan_id,
    p_start_date,
    p_end_date,
    'ACTIVE',
    v_caller_id,
    v_history_notes
  );

  -- 6. Create renewal invoice
  v_is_paid := (p_payment_method IS NOT NULL AND p_payment_method != 'UNPAID');
  v_invoice_number := 'INV-REN-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' || floor(100 + random() * 900)::text;

  INSERT INTO public.invoices (
    invoice_number,
    member_id,
    recipient_name,
    recipient_email,
    recipient_type,
    subtotal,
    tax_amount,
    total_amount,
    paid_amount,
    status,
    due_date,
    notes,
    created_by
  ) VALUES (
    v_invoice_number,
    p_member_id,
    COALESCE(v_member.full_name, split_part(v_member.email, '@', 1)),
    v_member.email,
    'MEMBER',
    v_plan_price,
    0,
    v_plan_price,
    CASE WHEN v_is_paid THEN v_plan_price ELSE 0 END,
    CASE WHEN v_is_paid THEN 'PAID'::public.app_invoice_status ELSE 'ISSUED'::public.app_invoice_status END,
    p_start_date,
    CASE WHEN v_is_plan_change THEN 'Plan Upgrade to ' ELSE 'Membership Renewal for ' END || v_plan.name,
    v_caller_id
  ) RETURNING id INTO v_invoice_id;

  -- 7. Insert invoice item
  INSERT INTO public.invoice_items (
    invoice_id,
    description,
    quantity,
    unit_price,
    total_price
  ) VALUES (
    v_invoice_id,
    'Membership Term: ' || v_plan.name || ' (' || p_start_date || ' to ' || p_end_date || ')',
    1,
    v_plan_price,
    v_plan_price
  );

  -- 8. Record payment if paid
  IF v_is_paid THEN
    v_payment_number := 'PAY-REN-' || upper(to_hex(extract(epoch from now())::bigint)) || '-' || floor(100 + random() * 900)::text;

    INSERT INTO public.payments (
      payment_number,
      amount,
      payment_method,
      status,
      transaction_reference,
      member_id,
      invoice_id,
      recorded_by
    ) VALUES (
      v_payment_number,
      v_plan_price,
      p_payment_method::public.app_payment_method,
      'COMPLETED',
      NULLIF(p_payment_reference, ''),
      p_member_id,
      v_invoice_id,
      v_caller_id
    );
  END IF;

  -- 9. Notification
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    link,
    is_read
  ) VALUES (
    v_member.profile_id,
    'Membership Renewed Successfully',
    'Your ' || v_plan.name || ' is confirmed and active until ' || p_end_date || '. Court & club perks renewed.',
    'SUCCESS',
    '/dashboard/portal',
    false
  );

  RETURN jsonb_build_object(
    'success', true,
    'member_id', p_member_id,
    'invoice_number', v_invoice_number,
    'is_plan_change', v_is_plan_change
  );
END;
$$;

-- 3. RLS policies allowing authenticated users to manage their own membership & related items
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'members' AND policyname = 'members_self_insert_policy') THEN
    CREATE POLICY members_self_insert_policy ON public.members
      FOR INSERT TO authenticated
      WITH CHECK (profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'members' AND policyname = 'members_self_update_policy') THEN
    CREATE POLICY members_self_update_policy ON public.members
      FOR UPDATE TO authenticated
      USING (profile_id = auth.uid())
      WITH CHECK (profile_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'membership_history' AND policyname = 'membership_history_self_insert_policy') THEN
    CREATE POLICY membership_history_self_insert_policy ON public.membership_history
      FOR INSERT TO authenticated
      WITH CHECK (changed_by = auth.uid() OR EXISTS (SELECT 1 FROM public.members WHERE members.id = membership_history.member_id AND members.profile_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_self_insert_policy') THEN
    CREATE POLICY invoices_self_insert_policy ON public.invoices
      FOR INSERT TO authenticated
      WITH CHECK (created_by = auth.uid() OR member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_items' AND policyname = 'invoice_items_manage_policy') THEN
    CREATE POLICY invoice_items_manage_policy ON public.invoice_items
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payments' AND policyname = 'payments_self_insert_policy') THEN
    CREATE POLICY payments_self_insert_policy ON public.payments
      FOR INSERT TO authenticated
      WITH CHECK (recorded_by = auth.uid() OR member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bar_tables' AND policyname = 'bar_tables_occupy_policy') THEN
    CREATE POLICY bar_tables_occupy_policy ON public.bar_tables
      FOR UPDATE TO authenticated
      USING (true)
      WITH CHECK (status IN ('OCCUPIED', 'RESERVED', 'AVAILABLE'));
  END IF;
END $$;

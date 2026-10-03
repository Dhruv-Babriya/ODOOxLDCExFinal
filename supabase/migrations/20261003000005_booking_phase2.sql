-- =============================================================================
-- PHASE 2: ADVANCED COURT BOOKING & OPERATIONS (Developer 2)
-- Migration: 20261003000004_booking_phase2.sql
-- =============================================================================

-- 1. Reschedule Court Booking Stored Procedure
CREATE OR REPLACE FUNCTION public.reschedule_court_booking(
  p_booking_id UUID,
  p_new_court_id UUID,
  p_new_start_time TIMESTAMPTZ,
  p_new_end_time TIMESTAMPTZ,
  p_new_base_price NUMERIC(10,2),
  p_new_discount_amount NUMERIC(10,2),
  p_new_final_price NUMERIC(10,2),
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_booking RECORD;
  v_court_active BOOLEAN;
  v_daily_bookings INTEGER;
  v_new_booking_date DATE := (p_new_start_time AT TIME ZONE 'UTC')::DATE;
BEGIN
  -- 1. Fetch current booking
  SELECT * INTO v_booking
  FROM public.court_bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: The requested booking does not exist.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'CANNOT_RESCHEDULE_CANCELLED: Cancelled bookings cannot be rescheduled.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_booking.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'CANNOT_RESCHEDULE_COMPLETED: Completed bookings cannot be rescheduled.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Validate duration: exactly 1 hour
  IF (p_new_end_time - p_new_start_time) <> INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Court bookings must be exactly 1 hour in duration'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Validate slot alignment: :00 or :30
  IF (EXTRACT(MINUTE FROM p_new_start_time)::INT NOT IN (0, 30))
     OR (EXTRACT(SECOND FROM p_new_start_time)::INT <> 0) THEN
    RAISE EXCEPTION 'Booking start time must be on the hour or half-hour'
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. Check court is active
  SELECT is_active INTO v_court_active
  FROM public.courts
  WHERE id = p_new_court_id;

  IF NOT FOUND OR NOT v_court_active THEN
    RAISE EXCEPTION 'COURT_INACTIVE: Selected court is inactive or under maintenance.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Daily limit check on target date (excluding the booking itself)
  IF v_booking.member_id IS NOT NULL AND v_booking.booking_type IN ('STANDARD', 'COACHING') THEN
    SELECT COUNT(*) INTO v_daily_bookings
    FROM public.court_bookings
    WHERE member_id = v_booking.member_id
      AND id <> p_booking_id
      AND (start_time AT TIME ZONE 'UTC')::DATE = v_new_booking_date
      AND status NOT IN ('CANCELLED')
      AND booking_type IN ('STANDARD', 'COACHING');

    IF v_daily_bookings >= 2 THEN
      RAISE EXCEPTION 'MEMBER_DAILY_LIMIT_EXCEEDED: Members may book a maximum of 2 sessions per day.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 6. Atomic update; Exclusion constraint guarantees no overlap
  UPDATE public.court_bookings
  SET
    court_id = p_new_court_id,
    start_time = p_new_start_time,
    end_time = p_new_end_time,
    base_price = p_new_base_price,
    discount_amount = p_new_discount_amount,
    final_price = p_new_final_price,
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Add Booking Participant Helper (Security Definer)
CREATE OR REPLACE FUNCTION public.add_booking_participant(
  p_booking_id UUID,
  p_member_id UUID DEFAULT NULL,
  p_guest_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_participant_id UUID;
BEGIN
  INSERT INTO public.booking_participants (booking_id, member_id, guest_name)
  VALUES (p_booking_id, p_member_id, p_guest_name)
  RETURNING id INTO v_participant_id;

  RETURN v_participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Remove Booking Participant Helper (Security Definer)
CREATE OR REPLACE FUNCTION public.remove_booking_participant(
  p_participant_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.booking_participants
  WHERE id = p_participant_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Record Booking Payment Helper (Finance Integration, Security Definer)
CREATE OR REPLACE FUNCTION public.record_booking_payment(
  p_booking_id UUID,
  p_member_id UUID,
  p_amount NUMERIC(10,2),
  p_payment_method app_payment_method,
  p_transaction_reference TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_payment_id UUID;
  v_payment_number TEXT;
BEGIN
  v_payment_number := 'PAY-BKG-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT FROM 1 FOR 8));

  INSERT INTO public.payments (
    payment_number,
    booking_id,
    member_id,
    amount,
    payment_method,
    status,
    transaction_reference
  )
  VALUES (
    v_payment_number,
    p_booking_id,
    p_member_id,
    p_amount,
    p_payment_method,
    'COMPLETED',
    p_transaction_reference
  )
  RETURNING id INTO v_payment_id;

  RETURN v_payment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Cancel Court Booking Helper (Security Definer)
CREATE OR REPLACE FUNCTION public.cancel_court_booking(
  p_booking_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.court_bookings
  SET
    status = 'CANCELLED',
    cancellation_reason = p_reason,
    cancelled_at = NOW()
  WHERE id = p_booking_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

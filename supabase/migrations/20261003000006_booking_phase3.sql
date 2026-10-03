-- =============================================================================
-- PHASE 3: BOOKING RELIABILITY, CONCURRENCY & SCHEDULING HARDENING (Developer 2)
-- Migration: 20261003000006_booking_phase3.sql
-- =============================================================================

-- 1. Contract & Schema Alignment: Add total_price as generated column if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'court_bookings' 
      AND column_name = 'total_price'
  ) THEN
    ALTER TABLE public.court_bookings
      ADD COLUMN total_price NUMERIC(10,2) GENERATED ALWAYS AS (final_price) STORED;
  END IF;
END $$;

-- 2. Performance Indexes for Availability, Daily Limit & Booking Schedules
CREATE INDEX IF NOT EXISTS idx_court_bookings_availability
  ON public.court_bookings (court_id, start_time, end_time)
  WHERE (status NOT IN ('CANCELLED'));

CREATE INDEX IF NOT EXISTS idx_court_bookings_member_daily
  ON public.court_bookings (member_id, start_time)
  WHERE (status NOT IN ('CANCELLED'));

CREATE INDEX IF NOT EXISTS idx_court_bookings_status_dates
  ON public.court_bookings (status, start_time DESC);

CREATE INDEX IF NOT EXISTS idx_booking_participants_unique_member
  ON public.booking_participants (booking_id, member_id)
  WHERE (member_id IS NOT NULL);

-- 3. Hardened Atomic Booking Procedure: create_court_booking
-- Includes:
-- - Exact 1-hour session duration check
-- - :00 and :30 slot interval alignment
-- - Operating hours enforcement (06:00 to 22:00, last slot starts at 21:00 or 21:30)
-- - Past booking prevention (cannot book slots in the past)
-- - Friday-only restriction for SOCIAL_PLAY sessions
-- - Inactive court check
-- - 2-bookings-per-day member quota limit
-- - Protected by GIST exclusion constraint (no_overlapping_court_bookings)
CREATE OR REPLACE FUNCTION public.create_court_booking(
  p_court_id UUID,
  p_member_id UUID,
  p_booking_type app_booking_type,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_base_price NUMERIC(10,2),
  p_discount_amount NUMERIC(10,2),
  p_final_price NUMERIC(10,2),
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_daily_bookings INTEGER;
  v_booking_date DATE := (p_start_time AT TIME ZONE 'UTC')::DATE;
  v_start_hour INTEGER := EXTRACT(HOUR FROM (p_start_time AT TIME ZONE 'UTC'))::INT;
  v_start_dow INTEGER := EXTRACT(DOW FROM (p_start_time AT TIME ZONE 'UTC'))::INT;
  v_court_active BOOLEAN;
  v_new_booking_id UUID;
BEGIN
  -- 1. Duration validation: exactly 1 hour
  IF (p_end_time - p_start_time) <> INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'INVALID_DURATION: Court bookings must be exactly 1 hour in duration.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Slot interval check: must start on :00 or :30
  IF (EXTRACT(MINUTE FROM p_start_time)::INT NOT IN (0, 30))
     OR (EXTRACT(SECOND FROM p_start_time)::INT <> 0) THEN
    RAISE EXCEPTION 'INVALID_SLOT: Booking start time must be on the hour or half-hour.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Operating hours: 06:00 to 22:00 (first slot 06:00, last session ends by 22:30, start <= 21:30)
  IF v_start_hour < 6 OR v_start_hour > 21 THEN
    RAISE EXCEPTION 'OUT_OF_OPERATING_HOURS: Courts are open from 06:00 to 22:00. Sessions cannot start before 06:00 or after 21:30.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. Past time check (allow 5 min grace period for clock skew / form submission)
  IF p_start_time < (NOW() - INTERVAL '5 minutes') THEN
    RAISE EXCEPTION 'PAST_BOOKING_PROHIBITED: Cannot book a court slot in the past.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Friday-only restriction for Social Play
  IF p_booking_type = 'SOCIAL_PLAY' AND v_start_dow <> 5 THEN
    RAISE EXCEPTION 'SOCIAL_PLAY_FRIDAY_ONLY: Friday Social Play sessions are strictly permitted on Fridays only.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 6. Court active check
  SELECT is_active INTO v_court_active
  FROM public.courts
  WHERE id = p_court_id;

  IF NOT FOUND OR NOT v_court_active THEN
    IF p_booking_type <> 'MAINTENANCE' THEN
      RAISE EXCEPTION 'COURT_INACTIVE: Selected court is inactive or undergoing maintenance.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 7. Daily limit check: max 2 non-cancelled bookings per member per day
  -- Social play bookings do NOT consume the regular private booking quota
  IF p_member_id IS NOT NULL AND p_booking_type IN ('STANDARD', 'COACHING') THEN
    SELECT COUNT(*) INTO v_daily_bookings
    FROM public.court_bookings
    WHERE member_id = p_member_id
      AND (start_time AT TIME ZONE 'UTC')::DATE = v_booking_date
      AND status NOT IN ('CANCELLED')
      AND booking_type IN ('STANDARD', 'COACHING');

    IF v_daily_bookings >= 2 THEN
      RAISE EXCEPTION 'MEMBER_DAILY_LIMIT_EXCEEDED: Members may book a maximum of 2 sessions per day.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 8. Insert booking (Protected by no_overlapping_court_bookings exclusion constraint)
  INSERT INTO public.court_bookings (
    court_id,
    member_id,
    booking_type,
    start_time,
    end_time,
    status,
    base_price,
    discount_amount,
    final_price,
    notes,
    created_by
  )
  VALUES (
    p_court_id,
    p_member_id,
    p_booking_type,
    p_start_time,
    p_end_time,
    'CONFIRMED',
    p_base_price,
    p_discount_amount,
    p_final_price,
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_new_booking_id;

  RETURN v_new_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Hardened Atomic Reschedule Procedure: reschedule_court_booking
-- Includes:
-- - Verified booking exists
-- - Rejection of cancelled or completed bookings
-- - Duration and slot interval validation
-- - Operating hours validation
-- - Past time check
-- - Friday-only check for social play
-- - Target court active check
-- - Re-check daily booking limit on target date (excluding this booking)
-- - Preserves historical audit notes
-- - Protected by GIST exclusion constraint
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
  v_start_hour INTEGER := EXTRACT(HOUR FROM (p_new_start_time AT TIME ZONE 'UTC'))::INT;
  v_start_dow INTEGER := EXTRACT(DOW FROM (p_new_start_time AT TIME ZONE 'UTC'))::INT;
  v_audit_note TEXT;
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
    RAISE EXCEPTION 'INVALID_DURATION: Court bookings must be exactly 1 hour in duration.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Validate slot alignment: :00 or :30
  IF (EXTRACT(MINUTE FROM p_new_start_time)::INT NOT IN (0, 30))
     OR (EXTRACT(SECOND FROM p_new_start_time)::INT <> 0) THEN
    RAISE EXCEPTION 'INVALID_SLOT: Booking start time must be on the hour or half-hour.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 4. Operating hours check
  IF v_start_hour < 6 OR v_start_hour > 21 THEN
    RAISE EXCEPTION 'OUT_OF_OPERATING_HOURS: Courts are open from 06:00 to 22:00. Sessions cannot start before 06:00 or after 21:30.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 5. Past time check (with 5 min grace period)
  IF p_new_start_time < (NOW() - INTERVAL '5 minutes') THEN
    RAISE EXCEPTION 'PAST_BOOKING_PROHIBITED: Cannot reschedule a court to a past date or time.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 6. Social play Friday check
  IF v_booking.booking_type = 'SOCIAL_PLAY' AND v_start_dow <> 5 THEN
    RAISE EXCEPTION 'SOCIAL_PLAY_FRIDAY_ONLY: Friday Social Play sessions are strictly permitted on Fridays only.'
      USING ERRCODE = 'P0001';
  END IF;

  -- 7. Check target court is active
  SELECT is_active INTO v_court_active
  FROM public.courts
  WHERE id = p_new_court_id;

  IF NOT FOUND OR NOT v_court_active THEN
    IF v_booking.booking_type <> 'MAINTENANCE' THEN
      RAISE EXCEPTION 'COURT_INACTIVE: Selected target court is inactive or under maintenance.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 8. Daily limit check on target date (excluding the booking itself)
  IF v_booking.member_id IS NOT NULL AND v_booking.booking_type IN ('STANDARD', 'COACHING') THEN
    SELECT COUNT(*) INTO v_daily_bookings
    FROM public.court_bookings
    WHERE member_id = v_booking.member_id
      AND id <> p_booking_id
      AND (start_time AT TIME ZONE 'UTC')::DATE = v_new_booking_date
      AND status NOT IN ('CANCELLED')
      AND booking_type IN ('STANDARD', 'COACHING');

    IF v_daily_bookings >= 2 THEN
      RAISE EXCEPTION 'MEMBER_DAILY_LIMIT_EXCEEDED: Members may book a maximum of 2 sessions per day on the target date.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- 9. Preserve historical audit trail
  v_audit_note := '[Rescheduled from ' || 
    to_char(v_booking.start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || 
    ' UTC to ' || 
    to_char(p_new_start_time AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') || ' UTC]';

  IF p_notes IS NOT NULL AND p_notes <> '' THEN
    v_audit_note := v_audit_note || ' ' || p_notes;
  END IF;

  IF v_booking.notes IS NOT NULL AND v_booking.notes <> '' THEN
    v_audit_note := v_booking.notes || ' | ' || v_audit_note;
  END IF;

  -- 10. Atomic update; Exclusion constraint guarantees no overlap on new slot
  UPDATE public.court_bookings
  SET
    court_id = p_new_court_id,
    start_time = p_new_start_time,
    end_time = p_new_end_time,
    base_price = p_new_base_price,
    discount_amount = p_new_discount_amount,
    final_price = p_new_final_price,
    notes = v_audit_note,
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN p_booking_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Hardened Cancellation Stored Procedure: cancel_court_booking
CREATE OR REPLACE FUNCTION public.cancel_court_booking(
  p_booking_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_status app_booking_status;
BEGIN
  SELECT status INTO v_status
  FROM public.court_bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: The requested booking does not exist.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_status = 'CANCELLED' THEN
    RAISE EXCEPTION 'ALREADY_CANCELLED: This booking is already cancelled.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'CANNOT_CANCEL_COMPLETED: Completed court sessions cannot be cancelled.'
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.court_bookings
  SET
    status = 'CANCELLED',
    cancellation_reason = p_reason,
    cancelled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_booking_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Hardened Social Play Participant Procedure: add_booking_participant
CREATE OR REPLACE FUNCTION public.add_booking_participant(
  p_booking_id UUID,
  p_member_id UUID DEFAULT NULL,
  p_guest_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_booking RECORD;
  v_count INTEGER;
  v_participant_id UUID;
BEGIN
  -- Verify booking
  SELECT id, booking_type, status, start_time
  INTO v_booking
  FROM public.court_bookings
  WHERE id = p_booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_NOT_FOUND: Booking not found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_booking.booking_type <> 'SOCIAL_PLAY' THEN
    RAISE EXCEPTION 'INVALID_BOOKING_TYPE: Participants can only be added to Friday Social Play sessions.'
      USING ERRCODE = 'P0001';
  END IF;

  IF v_booking.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'BOOKING_CANCELLED: Cannot add participants to a cancelled session.'
      USING ERRCODE = 'P0001';
  END IF;

  -- Capacity limit: max 12 players
  SELECT COUNT(*) INTO v_count
  FROM public.booking_participants
  WHERE booking_id = p_booking_id;

  IF v_count >= 12 THEN
    RAISE EXCEPTION 'CAPACITY_REACHED: This social play session is full (maximum 12 players).'
      USING ERRCODE = 'P0001';
  END IF;

  -- Prevent duplicate participant
  IF p_member_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.booking_participants
      WHERE booking_id = p_booking_id AND member_id = p_member_id
    ) THEN
      RAISE EXCEPTION 'DUPLICATE_PARTICIPANT: This member is already registered for this session.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.booking_participants (booking_id, member_id, guest_name)
  VALUES (p_booking_id, p_member_id, p_guest_name)
  RETURNING id INTO v_participant_id;

  RETURN v_participant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Secure & Accurate Availability Query: get_court_bookings_for_date
CREATE OR REPLACE FUNCTION public.get_court_bookings_for_date(
  p_court_id UUID,
  p_date DATE
)
RETURNS TABLE (
  booking_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status app_booking_status,
  booking_type app_booking_type,
  member_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cb.id AS booking_id,
    cb.start_time,
    cb.end_time,
    cb.status,
    cb.booking_type,
    COALESCE(p.full_name, 'Walk-in Guest') AS member_name
  FROM public.court_bookings cb
  LEFT JOIN public.members m ON cb.member_id = m.id
  LEFT JOIN public.profiles p ON m.profile_id = p.id
  WHERE cb.court_id = p_court_id
    AND (cb.start_time AT TIME ZONE 'UTC')::DATE = p_date
    AND cb.status NOT IN ('CANCELLED')
  ORDER BY cb.start_time;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

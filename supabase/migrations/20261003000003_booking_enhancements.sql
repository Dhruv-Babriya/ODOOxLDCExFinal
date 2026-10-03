-- =============================================================================
-- PHASE 1: BOOKING ENHANCEMENTS (Developer 2)
-- Migration: 20261003000002_booking_enhancements.sql
-- =============================================================================

-- 1. Replace create_court_booking to fix column name mapping and add social play support
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
  v_new_booking_id UUID;
BEGIN
  -- 1. Validate: 1-hour duration
  IF (p_end_time - p_start_time) <> INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Court bookings must be exactly 1 hour in duration'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Validate: Start on :00 or :30
  IF (EXTRACT(MINUTE FROM p_start_time)::INT NOT IN (0, 30))
     OR (EXTRACT(SECOND FROM p_start_time)::INT <> 0) THEN
    RAISE EXCEPTION 'Booking start time must be on the hour or half-hour'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Daily limit check: max 2 non-cancelled bookings per member per day
  --    Social play bookings do NOT count toward the daily limit
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

  -- 4. Insert booking; Exclusion constraint guarantees no overlap for non-cancelled bookings
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

-- 2. Helper function: Get available slots for a court on a given date
-- Returns existing bookings so the application layer can compute open slots
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

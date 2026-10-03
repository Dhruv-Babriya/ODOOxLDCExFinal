-- =============================================================================
-- MIGRATION: 20261003000009_server_pagination_and_aggregates.sql
-- High-Performance Server-Side Pagination, Filtering, Search & Dashboard Aggregates
-- Designed to handle 50,000+ booking records efficiently without client memory overhead
-- =============================================================================

-- 1. Optimized Composite Indexes for Deterministic Pagination & Filtering
CREATE INDEX IF NOT EXISTS idx_court_bookings_pagination
  ON public.court_bookings (start_time DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_court_bookings_created_pagination
  ON public.court_bookings (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_court_bookings_search_filters
  ON public.court_bookings (court_id, status, booking_type, start_time DESC);

-- 2. Database-level Aggregate Queries for Owner Dashboard (Avoids downloading all rows)
CREATE OR REPLACE FUNCTION public.get_court_booking_aggregates()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today_start TIMESTAMPTZ := date_trunc('day', NOW());
  v_today_end TIMESTAMPTZ := v_today_start + INTERVAL '1 day' - INTERVAL '1 millisecond';
  v_week_start TIMESTAMPTZ := date_trunc('week', NOW());
  v_week_end TIMESTAMPTZ := v_week_start + INTERVAL '1 week' - INTERVAL '1 millisecond';
  v_month_start TIMESTAMPTZ := date_trunc('month', NOW());
  v_month_end TIMESTAMPTZ := v_month_start + INTERVAL '1 month' - INTERVAL '1 millisecond';
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'today', json_build_object(
      'totalBookings', COUNT(*) FILTER (WHERE start_time >= v_today_start AND start_time <= v_today_end AND status != 'CANCELLED'),
      'courtRevenue', COALESCE(SUM(final_price) FILTER (WHERE start_time >= v_today_start AND start_time <= v_today_end AND status != 'CANCELLED'), 0),
      'activeMembers', COUNT(DISTINCT member_id) FILTER (WHERE start_time >= v_today_start AND start_time <= v_today_end AND status != 'CANCELLED' AND member_id IS NOT NULL)
    ),
    'thisWeek', json_build_object(
      'totalBookings', COUNT(*) FILTER (WHERE start_time >= v_week_start AND start_time <= v_week_end AND status != 'CANCELLED'),
      'revenue', COALESCE(SUM(final_price) FILTER (WHERE start_time >= v_week_start AND start_time <= v_week_end AND status != 'CANCELLED'), 0),
      'bookingActivity', COUNT(*) FILTER (WHERE start_time >= v_week_start AND start_time <= v_week_end)
    ),
    'thisMonth', json_build_object(
      'totalBookings', COUNT(*) FILTER (WHERE start_time >= v_month_start AND start_time <= v_month_end AND status != 'CANCELLED'),
      'revenue', COALESCE(SUM(final_price) FILTER (WHERE start_time >= v_month_start AND start_time <= v_month_end AND status != 'CANCELLED'), 0),
      'courtUsageHours', COUNT(*) FILTER (WHERE start_time >= v_month_start AND start_time <= v_month_end AND status != 'CANCELLED')
    ),
    'overall', json_build_object(
      'totalBookings', COUNT(*),
      'confirmedBookings', COUNT(*) FILTER (WHERE status = 'CONFIRMED'),
      'completedBookings', COUNT(*) FILTER (WHERE status = 'COMPLETED'),
      'cancelledBookings', COUNT(*) FILTER (WHERE status = 'CANCELLED')
    )
  )
  INTO v_result
  FROM public.court_bookings;

  RETURN v_result;
END;
$$;

-- 3. Stored Procedure for Unified Server-Side Paginated Query with Exact Matching Count
CREATE OR REPLACE FUNCTION public.get_court_bookings_paginated(
  p_search TEXT DEFAULT NULL,
  p_court_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT NULL,
  p_booking_type TEXT DEFAULT NULL,
  p_date DATE DEFAULT NULL,
  p_member_id UUID DEFAULT NULL,
  p_sort_by TEXT DEFAULT 'start_time_desc',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  court_id UUID,
  court_name TEXT,
  sport_type TEXT,
  member_id UUID,
  member_name TEXT,
  membership_number TEXT,
  booking_type app_booking_type,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  status app_booking_status,
  base_price NUMERIC,
  discount_amount NUMERIC,
  final_price NUMERIC,
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ,
  member_profile_id UUID,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_search_pattern TEXT;
BEGIN
  IF p_search IS NOT NULL AND trim(p_search) <> '' THEN
    v_search_pattern := '%' || trim(p_search) || '%';
  ELSE
    v_search_pattern := NULL;
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT
      cb.id,
      cb.court_id,
      c.name::TEXT AS court_name,
      c.sport_type::TEXT AS sport_type,
      cb.member_id,
      p.full_name::TEXT AS member_name,
      m.membership_number::TEXT AS membership_number,
      cb.booking_type,
      cb.start_time,
      cb.end_time,
      cb.status,
      cb.base_price,
      cb.discount_amount,
      cb.final_price,
      cb.cancellation_reason,
      cb.cancelled_at,
      cb.notes,
      cb.created_at,
      m.profile_id AS member_profile_id
    FROM public.court_bookings cb
    LEFT JOIN public.courts c ON cb.court_id = c.id
    LEFT JOIN public.members m ON cb.member_id = m.id
    LEFT JOIN public.profiles p ON m.profile_id = p.id
    WHERE
      (p_court_id IS NULL OR cb.court_id = p_court_id)
      AND (p_status IS NULL OR p_status = '' OR cb.status::TEXT = p_status)
      AND (p_booking_type IS NULL OR p_booking_type = '' OR cb.booking_type::TEXT = p_booking_type)
      AND (p_member_id IS NULL OR cb.member_id = p_member_id)
      AND (p_date IS NULL OR (cb.start_time >= p_date::TIMESTAMPTZ AND cb.start_time < (p_date + INTERVAL '1 day')::TIMESTAMPTZ))
      AND (
        v_search_pattern IS NULL
        OR cb.id::TEXT ILIKE v_search_pattern
        OR c.name ILIKE v_search_pattern
        OR p.full_name ILIKE v_search_pattern
        OR m.membership_number ILIKE v_search_pattern
        OR cb.notes ILIKE v_search_pattern
      )
  ),
  counted AS (
    SELECT count(*) AS total_matches FROM filtered
  )
  SELECT
    f.id,
    f.court_id,
    f.court_name,
    f.sport_type,
    f.member_id,
    f.member_name,
    f.membership_number,
    f.booking_type,
    f.start_time,
    f.end_time,
    f.status,
    f.base_price,
    f.discount_amount,
    f.final_price,
    f.cancellation_reason,
    f.cancelled_at,
    f.notes,
    f.created_at,
    f.member_profile_id,
    COALESCE(c.total_matches, 0)::BIGINT AS total_count
  FROM filtered f
  CROSS JOIN counted c
  ORDER BY
    CASE WHEN p_sort_by = 'start_time_asc' THEN f.start_time END ASC,
    CASE WHEN p_sort_by = 'start_time_desc' THEN f.start_time END DESC,
    CASE WHEN p_sort_by = 'created_at_asc' THEN f.created_at END ASC,
    CASE WHEN p_sort_by = 'created_at_desc' THEN f.created_at END DESC,
    CASE WHEN p_sort_by = 'price_asc' THEN f.final_price END ASC,
    CASE WHEN p_sort_by = 'price_desc' THEN f.final_price END DESC,
    f.start_time DESC,
    f.id DESC
  LIMIT GREATEST(1, p_limit)
  OFFSET GREATEST(0, p_offset);
END;
$$;

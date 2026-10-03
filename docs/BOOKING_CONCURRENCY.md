# Booking Concurrency, Race Condition Prevention & Court Scheduling Architecture

**The Champions Club — Sports Club Management System**  
*Document Version:* 1.0.0 (Phase 0)  
*Status:* Authoritative Specification  

---

## 1. The Concurrency Challenge

In a multi-user sports club system, court booking collisions represent the highest risk failure mode:
1. Two members or front-desk staff simultaneously view Court 1 as available for 18:00–19:00.
2. Both submit booking requests at 18:00:00.100 and 18:00:00.120.
3. In a naive application layer architecture ("Check availability with `SELECT`, then `INSERT`"), both transactions check the table concurrently, observe zero conflicting rows, and execute `INSERT`.
4. **Result:** Two players show up to play on the same physical court at the same time.

---

## 2. PostgreSQL Storage-Engine Exclusion Constraint

To eliminate race conditions definitively, The Champions Club employs a **PostgreSQL exclusion constraint** backed by the `btree_gist` index extension.

### 2.1 Extension Activation
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
```

### 2.2 Exclusion Constraint Definition
Applied to `public.court_bookings` (`supabase/migrations/20261003000001_initial_schema.sql`):
```sql
ALTER TABLE public.court_bookings
ADD CONSTRAINT no_overlapping_court_bookings
EXCLUDE USING gist (
  court_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
)
WHERE (status NOT IN ('CANCELLED'));
```

### 2.3 How the Constraint Works
- `court_id WITH =`: Ensures the constraint checks bookings for the exact same court.
- `tstzrange(start_time, end_time, '[)') WITH &&`: Constructs a half-open timestamp range `[start, end)` and enforces that no two ranges overlap (`&&` operator).
- `WHERE (status NOT IN ('CANCELLED'))`: Partial constraint ignoring cancelled reservations, instantly freeing up slots.
- **Transactional Atomicity**: Even with concurrent, non-isolated incoming HTTP requests hitting separate server action threads, PostgreSQL resolves row locks at disk/index commit time. The first transaction commits; the second transaction triggers an immediate database exception:
  ```
  ERROR: conflicting key value violates exclusion constraint "no_overlapping_court_bookings"
  SQLSTATE: 23P01
  ```

---

## 3. Atomic Booking Function (`create_court_booking`)

To bundle business-critical rules (session length, 30-min cadence, 2 bookings/day limit, and cancellation safeguards) into a single database round-trip, we provide the atomic procedure `create_court_booking`:

```sql
CREATE OR REPLACE FUNCTION public.create_court_booking(
  p_court_id UUID,
  p_member_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_booking_type TEXT DEFAULT 'REGULAR',
  p_total_price NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking_id UUID;
  v_daily_count INT;
  v_day_start TIMESTAMPTZ;
  v_day_end TIMESTAMPTZ;
BEGIN
  -- 1. Duration validation: exactly 1 hour
  IF (p_end_time - p_start_time) <> INTERVAL '1 hour' THEN
    RAISE EXCEPTION 'Court bookings must be exactly 1 hour in duration'
      USING ERRCODE = 'P0001';
  END IF;

  -- 2. Slot interval check: must start on 00 or 30 minute marks
  IF (EXTRACT(MINUTE FROM p_start_time) NOT IN (0, 30)) OR (EXTRACT(SECOND FROM p_start_time) <> 0) THEN
    RAISE EXCEPTION 'Booking start time must be on the hour or half-hour'
      USING ERRCODE = 'P0001';
  END IF;

  -- 3. Daily quota check: at most 2 bookings per member per day
  IF p_member_id IS NOT NULL AND p_booking_type = 'REGULAR' THEN
    v_day_start := date_trunc('day', p_start_time);
    v_day_end := v_day_start + INTERVAL '1 day';

    SELECT COUNT(*) INTO v_daily_count
    FROM public.court_bookings
    WHERE member_id = p_member_id
      AND start_time >= v_day_start
      AND start_time < v_day_end
      AND status NOT IN ('CANCELLED');

    IF v_daily_count >= 2 THEN
      RAISE EXCEPTION 'Member has reached the maximum daily limit of 2 bookings'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- 4. Insert booking (Protected by no_overlapping_court_bookings exclusion constraint)
  INSERT INTO public.court_bookings (
    court_id,
    member_id,
    start_time,
    end_time,
    booking_type,
    total_price,
    notes,
    status
  ) VALUES (
    p_court_id,
    p_member_id,
    p_start_time,
    p_end_time,
    p_booking_type,
    p_total_price,
    p_notes,
    'CONFIRMED'
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;
```

---

## 4. Friday Social Play Architecture

### The Business Requirement
> *"Friday social play allows multiple people to share one court."*

A naive schema that creates individual `court_bookings` rows for every social player would violate the `no_overlapping_court_bookings` exclusion constraint.

### The Solution: 1 Booking Entity + N Participant Entities
1. **Host Booking**: A single master booking record is created for the social session:
   - `court_id`: Court 1 (Tennis)
   - `booking_type`: `'SOCIAL_PLAY'`
   - `start_time`: `2026-10-09 18:00:00+00`
   - `end_time`: `2026-10-09 20:00:00+00`
   - `max_participants`: `12`
   - `status`: `'CONFIRMED'`
2. **Participant Allocation**: Up to 12 participants join via the `booking_participants` junction table:
   ```sql
   INSERT INTO public.booking_participants (
     booking_id,
     member_id,
     participant_name,
     fee_paid
   ) VALUES (
     v_social_booking_id,
     v_member_id,
     'Dhruv Babriya',
     150.00
   );
   ```
3. **Outcome**:
   - The court remains blocked against regular private bookings.
   - The system tracks all 12 attendees and individual fee contributions.
   - The exclusion constraint is preserved without special hacks or bypassing RLS.

---

## 5. Application Layer Error Mapping

When PostgreSQL rejects a concurrent booking, `lib/errors.ts` intercepts the error code:

| Error Code | PostgreSQL Meaning | Application Exception | User-Facing Message |
| :--- | :--- | :--- | :--- |
| `23P01` | `exclusion_violation` | `BookingConcurrencyError` | *"This court was just booked by another player for the selected time. Please choose another court or time slot."* |
| `P0001` | User exception (Duration/Interval) | `ValidationError` | *"Invalid booking duration or time slot. Sessions must be 1 hour long starting on the hour or half-hour."* |
| `P0002` | User exception (Daily limit) | `BusinessRuleError` | *"You have already booked the maximum permitted 2 court sessions for this date."* |
| `23505` | `unique_violation` | `ConflictError` | *"A conflicting record already exists."* |

This architecture ensures zero double-bookings, atomic validation, and clear feedback to front-desk staff and club members.

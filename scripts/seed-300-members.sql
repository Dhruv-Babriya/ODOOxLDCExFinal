-- =============================================================================
-- The Champions Club - 300 Members Dataset Seeder
-- Generates 275+ realistic members across Gold, Silver, and Junior tiers
-- with diverse statuses (Active, Expiring Soon, Expired, Suspended, Pending)
-- =============================================================================

DO $$
DECLARE
  v_first_names TEXT[] := ARRAY[
    'Aarav', 'Aditya', 'Arjun', 'Dhruv', 'Ishaan', 'Kabir', 'Rohan', 'Vihaan', 'Krishna', 'Reyansh',
    'Ayaan', 'Shaurya', 'Advik', 'Pranav', 'Rudra', 'Kian', 'Siddharth', 'Vikram', 'Nikhil', 'Dev',
    'Manish', 'Rahul', 'Sameer', 'Tarun', 'Kunal', 'Abhishek', 'Gaurav', 'Varun', 'Rishi', 'Harsh',
    'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Pari', 'Anika', 'Navya', 'Riya', 'Myra', 'Sara',
    'Avani', 'Aditi', 'Prisha', 'Khushi', 'Tara', 'Samaira', 'Shanaya', 'Sneha', 'Pooja', 'Neha',
    'Divya', 'Kavita', 'Meera', 'Roshni', 'Simran', 'Tanvi', 'Shreya', 'Anjali', 'Deepika', 'Kareena',
    'Marcus', 'Alexander', 'Lucas', 'Oliver', 'James', 'Daniel', 'Julian', 'Sebastian', 'Adrian', 'Leo',
    'Sophia', 'Emma', 'Isabella', 'Mia', 'Elena', 'Chloe', 'Amara', 'Zoe', 'Maya', 'Nora'
  ];
  v_last_names TEXT[] := ARRAY[
    'Patel', 'Shah', 'Sharma', 'Verma', 'Mehta', 'Singh', 'Desai', 'Joshi', 'Bhatia', 'Malhotra',
    'Kapoor', 'Khanna', 'Chopra', 'Reddy', 'Nair', 'Iyer', 'Menon', 'Rao', 'Kulkarni', 'Gokhale',
    'Mukherjee', 'Banerjee', 'Chatterjee', 'Gupta', 'Agarwal', 'Mittal', 'Jain', 'Saxena', 'Trivedi', 'Pandey',
    'Vance', 'Wright', 'Chen', 'Davies', 'Fischer', 'Sterling', 'Mercer', 'Gallagher', 'Novak', 'Sinclair'
  ];
  v_notes_pool TEXT[] := ARRAY[
    'Regular morning tennis singles player. Court 1 enthusiast.',
    'Weekend doubles tournament squad. High racket maintenance.',
    'Senior league table tennis semifinalist. Regular cafeteria visitor.',
    'Fast-bowling cricket nets development trainee.',
    'Corporate executive membership. Evening badminton slots.',
    'Junior state championships qualifying contender.',
    'Clay court specialist. Prefers weekend slots between 7-9 AM.',
    'Member of club tournament organizing committee.',
    'Avid pro-shop customer. Uses custom Wilson stringing.',
    'Joined via corporate executive tier sponsorship.',
    'Under-19 cricket academy opener.',
    'Cross-training squash league competitor.',
    'Regular swimmer and indoor court player.',
    'Gold VIP lounge patron. Frequent dining tab user.',
    'Hard court weekend morning regular.'
  ];
  v_gold_id UUID := '11111111-1111-1111-1111-111111111101';
  v_silver_id UUID := '11111111-1111-1111-1111-111111111102';
  v_junior_id UUID := '11111111-1111-1111-1111-111111111103';
  v_owner_id UUID := '00000000-0000-0000-0000-000000000001';

  i INT;
  v_uid UUID;
  v_member_id UUID;
  v_first TEXT;
  v_last TEXT;
  v_name TEXT;
  v_email TEXT;
  v_phone TEXT;
  v_mem_num TEXT;
  v_plan_id UUID;
  v_status app_membership_status;
  v_start DATE;
  v_end DATE;
  v_em_contact TEXT;
  v_note TEXT;
BEGIN
  FOR i IN 1026..1300 LOOP
    v_uid := gen_random_uuid();
    v_member_id := gen_random_uuid();
    v_first := v_first_names[1 + ((i * 7) % array_length(v_first_names, 1))];
    v_last := v_last_names[1 + ((i * 13) % array_length(v_last_names, 1))];
    v_name := v_first || ' ' || v_last;
    v_email := lower(v_first) || '.' || lower(v_last) || i || '@championsclub.in';
    v_phone := '+91 98' || lpad((10000000 + i * 473)::text, 8, '0');
    v_mem_num := 'CC-2026-' || i::text;

    -- Plan distribution: 45% Gold, 35% Silver, 20% Junior
    IF (i % 10) < 5 THEN
      v_plan_id := v_gold_id;
    ELSIF (i % 10) < 8 THEN
      v_plan_id := v_silver_id;
    ELSE
      v_plan_id := v_junior_id;
    END IF;

    -- Status & Date distribution
    IF (i % 10 = 1 OR i % 10 = 3) THEN
      -- Expiring soon
      v_status := 'ACTIVE';
      v_start := DATE '2025-10-15' + ((i % 12)::int);
      v_end := DATE '2026-10-06' + ((i % 22)::int);
    ELSIF (i % 10 = 2 OR i % 10 = 6) THEN
      -- Expired
      v_status := 'EXPIRED';
      v_start := DATE '2025-05-01' + ((i % 40)::int);
      v_end := DATE '2026-05-01' + ((i % 40)::int);
    ELSIF (i = 1050 OR i = 1150 OR i = 1250) THEN
      v_status := 'SUSPENDED';
      v_start := DATE '2026-02-01';
      v_end := DATE '2027-02-01';
    ELSIF (i = 1090 OR i = 1180 OR i = 1290) THEN
      v_status := 'PENDING';
      v_start := DATE '2026-10-01';
      v_end := DATE '2027-10-01';
    ELSE
      -- Healthy Active
      v_status := 'ACTIVE';
      v_start := DATE '2026-01-05' + ((i % 160)::int);
      v_end := v_start + 365;
    END IF;

    v_em_contact := v_last_names[1 + ((i * 3) % array_length(v_last_names, 1))] || ' Family - +91 98' || lpad((20000000 + i * 231)::text, 8, '0');
    v_note := v_notes_pool[1 + (i % array_length(v_notes_pool, 1))];

    -- 1. Insert into auth.users (triggers handle_new_user -> public.profiles)
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt('password123', gen_salt('bf')),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', v_name, 'role', 'MEMBER', 'phone', v_phone),
      v_start::timestamptz,
      NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- Profile upsert
    INSERT INTO public.profiles (id, email, full_name, phone, role)
    VALUES (v_uid, v_email, v_name, v_phone, 'MEMBER')
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone;

    -- 2. Insert into public.members
    INSERT INTO public.members (
      id, profile_id, membership_number, current_plan_id, status, start_date, end_date, emergency_contact, notes, created_at, updated_at
    ) VALUES (
      v_member_id,
      v_uid,
      v_mem_num,
      v_plan_id,
      v_status,
      v_start,
      v_end,
      v_em_contact,
      v_note,
      v_start::timestamptz,
      NOW()
    ) ON CONFLICT (membership_number) DO NOTHING;

    -- 3. Insert into public.membership_history
    INSERT INTO public.membership_history (
      member_id, plan_id, start_date, end_date, status, changed_by, notes, created_at
    ) VALUES (
      v_member_id,
      v_plan_id,
      v_start,
      v_end,
      v_status,
      v_owner_id,
      'Annual membership enrollment - ' || v_status,
      v_start::timestamptz
    ) ON CONFLICT DO NOTHING;

  END LOOP;
END;
$$;

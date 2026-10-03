-- =============================================================================
-- THE CHAMPIONS CLUB - INITIAL DATABASE SCHEMA & SECURITY POLICIES
-- Migration: 20261003000001_initial_schema.sql
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- -----------------------------------------------------------------------------
-- 1. ENUMS
-- -----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM (
    'OWNER',
    'ADMIN',
    'FRONT_DESK',
    'SHOP_STAFF',
    'BAR_STAFF',
    'MEMBER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_membership_tier AS ENUM (
    'GOLD',
    'SILVER',
    'JUNIOR'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_membership_status AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'SUSPENDED',
    'CANCELLED',
    'PENDING'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_sport_type AS ENUM (
    'TENNIS',
    'CRICKET'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_booking_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'CANCELLED',
    'COMPLETED',
    'NO_SHOW'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_booking_type AS ENUM (
    'STANDARD',
    'SOCIAL_PLAY',
    'COACHING',
    'MAINTENANCE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_order_channel AS ENUM (
    'COUNTER',
    'ONLINE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_order_status AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_inventory_transaction_type AS ENUM (
    'PURCHASE_RECEIPT',
    'SALE_COUNTER',
    'SALE_ONLINE',
    'ADJUSTMENT',
    'RETURN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_table_status AS ENUM (
    'AVAILABLE',
    'OCCUPIED',
    'RESERVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_kitchen_status AS ENUM (
    'PENDING',
    'PREPARING',
    'READY',
    'SERVED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_tab_status AS ENUM (
    'OPEN',
    'CLOSED',
    'VOID'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_payment_method AS ENUM (
    'CASH',
    'CARD',
    'UPI',
    'BANK_TRANSFER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_payment_status AS ENUM (
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REFUNDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_recipient_type AS ENUM (
    'MEMBER',
    'BUSINESS_CLIENT',
    'WALK_IN'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_invoice_status AS ENUM (
    'DRAFT',
    'ISSUED',
    'PARTIALLY_PAID',
    'PAID',
    'OVERDUE',
    'VOID'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_department AS ENUM (
    'MANAGEMENT',
    'FRONT_DESK',
    'COURTS',
    'SHOP',
    'BAR',
    'MAINTENANCE'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_shift_status AS ENUM (
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'MISSED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_leave_type AS ENUM (
    'CASUAL',
    'SICK',
    'ANNUAL',
    'UNPAID'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_leave_status AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_enquiry_status AS ENUM (
    'NEW',
    'CONTACTED',
    'TRIAL_SCHEDULED',
    'QUOTE_SENT',
    'CONVERTED',
    'CLOSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE app_quote_status AS ENUM (
    'DRAFT',
    'SENT',
    'ACCEPTED',
    'EXPIRED',
    'REJECTED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- -----------------------------------------------------------------------------
-- 2. HELPER FUNCTIONS & TRIGGERS
-- -----------------------------------------------------------------------------

-- Trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- 3. PROFILES & USERS (Developer 1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  role app_role NOT NULL DEFAULT 'MEMBER',
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to safely lookup user role without recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS app_role AS $$
DECLARE
  v_role app_role;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN COALESCE(v_role, 'MEMBER'::app_role);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Trigger to sync auth.users with public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.phone,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'MEMBER'::app_role)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 4. MEMBERSHIPS & PLANS (Developer 1)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tier app_membership_tier NOT NULL,
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 365 CHECK (duration_days > 0),
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  court_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (court_discount_percent BETWEEN 0 AND 100),
  shop_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (shop_discount_percent BETWEEN 0 AND 100),
  bar_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (bar_discount_percent BETWEEN 0 AND 100),
  free_court_hours_per_day INTEGER NOT NULL DEFAULT 0 CHECK (free_court_hours_per_day >= 0),
  max_daily_bookings INTEGER NOT NULL DEFAULT 2 CHECK (max_daily_bookings >= 1),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_membership_plans_updated_at
  BEFORE UPDATE ON public.membership_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  membership_number TEXT NOT NULL UNIQUE,
  current_plan_id UUID REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
  status app_membership_status NOT NULL DEFAULT 'ACTIVE',
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  emergency_contact TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_member_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_members_profile_id ON public.members(profile_id);
CREATE INDEX idx_members_status ON public.members(status);
CREATE INDEX idx_members_number ON public.members(membership_number);

CREATE TRIGGER update_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.membership_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.membership_plans(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status app_membership_status NOT NULL,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_history_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_membership_history_member ON public.membership_history(member_id);

-- -----------------------------------------------------------------------------
-- 5. COURTS & BOOKINGS (Developer 2)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  sport_type app_sport_type NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL CHECK (hourly_rate >= 0),
  is_indoor BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_courts_updated_at
  BEFORE UPDATE ON public.courts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.court_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  court_id UUID NOT NULL REFERENCES public.courts(id) ON DELETE RESTRICT,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  booking_type app_booking_type NOT NULL DEFAULT 'STANDARD',
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status app_booking_status NOT NULL DEFAULT 'CONFIRMED',
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (base_price >= 0),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  final_price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (final_price >= 0),
  cancellation_reason TEXT,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_booking_timespan CHECK (end_time > start_time)
);

-- EXCLUSION CONSTRAINT: Guaranteed atomic prevention of double-booked courts
ALTER TABLE public.court_bookings
  ADD CONSTRAINT no_overlapping_court_bookings
  EXCLUDE USING gist (
    court_id WITH =,
    tstzrange(start_time, end_time, '[)') WITH &&
  )
  WHERE (status NOT IN ('CANCELLED'));

CREATE INDEX idx_court_bookings_court ON public.court_bookings(court_id);
CREATE INDEX idx_court_bookings_member ON public.court_bookings(member_id);
CREATE INDEX idx_court_bookings_timerange ON public.court_bookings(start_time, end_time);
CREATE INDEX idx_court_bookings_status ON public.court_bookings(status);

CREATE TRIGGER update_court_bookings_updated_at
  BEFORE UPDATE ON public.court_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Participants for social play or multi-player sessions
CREATE TABLE IF NOT EXISTS public.booking_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.court_bookings(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  guest_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_participants_booking ON public.booking_participants(booking_id);

-- Stored procedure for atomic booking with daily limit verification
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
  -- Rule: Member can play at most twice per day
  IF p_member_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_daily_bookings
    FROM public.court_bookings
    WHERE member_id = p_member_id
      AND (start_time AT TIME ZONE 'UTC')::DATE = v_booking_date
      AND status NOT IN ('CANCELLED');

    IF v_daily_bookings >= 2 THEN
      RAISE EXCEPTION 'MEMBER_DAILY_LIMIT_EXCEEDED: Members may book a maximum of 2 sessions per day.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Insert booking; Exclusion constraint guarantees no overlap
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

-- -----------------------------------------------------------------------------
-- 6. SHOP & INVENTORY (Developer 3)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Shared Inventory Table: Single source of truth for counter sales and online orders
CREATE TABLE IF NOT EXISTS public.inventory (
  product_id UUID PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0 CHECK (quantity_on_hand >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  change_quantity INTEGER NOT NULL CHECK (change_quantity != 0),
  transaction_type app_inventory_transaction_type NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_tx_product ON public.inventory_transactions(product_id);

CREATE TABLE IF NOT EXISTS public.shop_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  order_channel app_order_channel NOT NULL DEFAULT 'COUNTER',
  status app_order_status NOT NULL DEFAULT 'PENDING',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_orders_member ON public.shop_orders(member_id);
CREATE INDEX idx_shop_orders_status ON public.shop_orders(status);

CREATE TRIGGER update_shop_orders_updated_at
  BEFORE UPDATE ON public.shop_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.shop_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.shop_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shop_order_items_order ON public.shop_order_items(order_id);

-- Atomic inventory deduction helper
CREATE OR REPLACE FUNCTION public.deduct_inventory(
  p_product_id UUID,
  p_quantity INTEGER,
  p_tx_type app_inventory_transaction_type,
  p_reference_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- Row-level locking to prevent race condition during deduction
  UPDATE public.inventory
  SET quantity_on_hand = quantity_on_hand - p_quantity,
      updated_at = NOW()
  WHERE product_id = p_product_id
    AND quantity_on_hand >= p_quantity;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK: Product % has insufficient stock for deduction of %',
      p_product_id, p_quantity USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.inventory_transactions (
    product_id,
    change_quantity,
    transaction_type,
    reference_id,
    notes,
    created_by
  )
  VALUES (
    p_product_id,
    -p_quantity,
    p_tx_type,
    p_reference_id,
    p_notes,
    auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- 7. BAR & CAFETERIA (Developer 3)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bar_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_number TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 4 CHECK (capacity > 0),
  status app_table_status NOT NULL DEFAULT 'AVAILABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.bar_tables(id) ON DELETE SET NULL,
  status app_tab_status NOT NULL DEFAULT 'OPEN',
  opened_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.bar_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  tab_id UUID REFERENCES public.customer_tabs(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.bar_tables(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  kitchen_status app_kitchen_status NOT NULL DEFAULT 'PENDING',
  order_status app_order_status NOT NULL DEFAULT 'PENDING',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bar_orders_tab ON public.bar_orders(tab_id);
CREATE INDEX idx_bar_orders_kitchen ON public.bar_orders(kitchen_status);

CREATE TRIGGER update_bar_orders_updated_at
  BEFORE UPDATE ON public.bar_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.bar_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.bar_orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  special_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bar_order_items_order ON public.bar_order_items(order_id);

-- -----------------------------------------------------------------------------
-- 8. STAFF, SHIFTS & LEAVE (Developer 4)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE RESTRICT,
  employee_code TEXT NOT NULL UNIQUE,
  department app_department NOT NULL,
  position TEXT NOT NULL,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (hourly_rate >= 0),
  salary_monthly NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (salary_monthly >= 0),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.staff_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status app_shift_status NOT NULL DEFAULT 'SCHEDULED',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_shift_timespan CHECK (end_time > start_time)
);

CREATE INDEX idx_staff_shifts_staff ON public.staff_shifts(staff_id);
CREATE INDEX idx_staff_shifts_date ON public.staff_shifts(shift_date);

CREATE TRIGGER update_staff_shifts_updated_at
  BEFORE UPDATE ON public.staff_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  leave_type app_leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status app_leave_status NOT NULL DEFAULT 'PENDING',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_leave_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_staff ON public.leave_requests(staff_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 9. INVOICES & PAYMENTS (Developer 4)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_type app_recipient_type NOT NULL DEFAULT 'MEMBER',
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
  tax_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
  paid_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
  status app_invoice_status NOT NULL DEFAULT 'ISSUED',
  due_date DATE NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_member ON public.invoices(member_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(10,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoice_items_invoice ON public.invoice_items(invoice_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT NOT NULL UNIQUE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.court_bookings(id) ON DELETE SET NULL,
  shop_order_id UUID REFERENCES public.shop_orders(id) ON DELETE SET NULL,
  bar_order_id UUID REFERENCES public.bar_orders(id) ON DELETE SET NULL,
  member_id UUID REFERENCES public.members(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method app_payment_method NOT NULL,
  status app_payment_status NOT NULL DEFAULT 'COMPLETED',
  transaction_reference TEXT,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_member ON public.payments(member_id);
CREATE INDEX idx_payments_invoice ON public.payments(invoice_id);
CREATE INDEX idx_payments_status ON public.payments(status);

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 10. ENQUIRIES & QUOTES (Developer 4)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  interested_sport app_sport_type,
  interested_plan_id UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  requested_trial_date DATE,
  status app_enquiry_status NOT NULL DEFAULT 'NEW',
  message TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enquiries_status ON public.enquiries(status);

CREATE TRIGGER update_enquiries_updated_at
  BEFORE UPDATE ON public.enquiries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  enquiry_id UUID REFERENCES public.enquiries(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  membership_plan_id UUID REFERENCES public.membership_plans(id) ON DELETE SET NULL,
  quoted_amount NUMERIC(10,2) NOT NULL CHECK (quoted_amount >= 0),
  valid_until DATE NOT NULL,
  status app_quote_status NOT NULL DEFAULT 'DRAFT',
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- 11. AUDIT LOGS
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at);

-- -----------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.court_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bar_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 12.1 PROFILES POLICIES
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK')
  );

CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid() OR
    public.get_user_role() IN ('OWNER', 'ADMIN')
  );

-- 12.2 MEMBERSHIP PLANS (Publicly readable, managed by Owner/Admin)
CREATE POLICY "plans_select_policy" ON public.membership_plans
  FOR SELECT USING (true);

CREATE POLICY "plans_manage_policy" ON public.membership_plans
  FOR ALL USING (
    public.get_user_role() IN ('OWNER', 'ADMIN')
  );

-- 12.3 MEMBERS
CREATE POLICY "members_select_policy" ON public.members
  FOR SELECT USING (
    profile_id = auth.uid() OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK')
  );

CREATE POLICY "members_manage_policy" ON public.members
  FOR ALL USING (
    public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK')
  );

-- 12.4 MEMBERSHIP HISTORY
CREATE POLICY "membership_history_select_policy" ON public.membership_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.members WHERE members.id = membership_history.member_id AND members.profile_id = auth.uid()) OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK')
  );

-- 12.5 COURTS (All users can view active courts; staff manage)
CREATE POLICY "courts_select_policy" ON public.courts
  FOR SELECT USING (true);

CREATE POLICY "courts_manage_policy" ON public.courts
  FOR ALL USING (
    public.get_user_role() IN ('OWNER', 'ADMIN')
  );

-- 12.6 COURT BOOKINGS
CREATE POLICY "court_bookings_select_policy" ON public.court_bookings
  FOR SELECT USING (
    member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()) OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK')
  );

CREATE POLICY "court_bookings_insert_policy" ON public.court_bookings
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

CREATE POLICY "court_bookings_modify_policy" ON public.court_bookings
  FOR UPDATE USING (
    (member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()) AND status = 'CONFIRMED') OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK')
  );

-- 12.7 BOOKING PARTICIPANTS
CREATE POLICY "booking_participants_select" ON public.booking_participants
  FOR SELECT USING (true);

CREATE POLICY "booking_participants_insert" ON public.booking_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 12.8 SHOP & INVENTORY
CREATE POLICY "products_select_policy" ON public.products
  FOR SELECT USING (is_active = TRUE OR public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF'));

CREATE POLICY "products_manage_policy" ON public.products
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF'));

CREATE POLICY "product_categories_select" ON public.product_categories
  FOR SELECT USING (true);

CREATE POLICY "product_categories_manage" ON public.product_categories
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF'));

CREATE POLICY "inventory_select" ON public.inventory
  FOR SELECT USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF', 'FRONT_DESK'));

CREATE POLICY "inventory_manage" ON public.inventory
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF'));

CREATE POLICY "inventory_tx_select" ON public.inventory_transactions
  FOR SELECT USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF'));

CREATE POLICY "shop_orders_select" ON public.shop_orders
  FOR SELECT USING (
    member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()) OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF', 'FRONT_DESK')
  );

CREATE POLICY "shop_orders_insert" ON public.shop_orders
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "shop_order_items_select" ON public.shop_order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.shop_orders
      WHERE shop_orders.id = shop_order_items.order_id
        AND (
          shop_orders.member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()) OR
          public.get_user_role() IN ('OWNER', 'ADMIN', 'SHOP_STAFF', 'FRONT_DESK')
        )
    )
  );

-- 12.9 BAR & CAFETERIA
CREATE POLICY "bar_tables_select" ON public.bar_tables
  FOR SELECT USING (true);

CREATE POLICY "bar_tables_manage" ON public.bar_tables
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'BAR_STAFF'));

CREATE POLICY "menu_categories_select" ON public.menu_categories
  FOR SELECT USING (true);

CREATE POLICY "menu_items_select" ON public.menu_items
  FOR SELECT USING (true);

CREATE POLICY "menu_manage" ON public.menu_items
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'BAR_STAFF'));

CREATE POLICY "customer_tabs_select" ON public.customer_tabs
  FOR SELECT USING (
    member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()) OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'BAR_STAFF', 'FRONT_DESK')
  );

CREATE POLICY "customer_tabs_manage" ON public.customer_tabs
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'BAR_STAFF'));

CREATE POLICY "bar_orders_select" ON public.bar_orders
  FOR SELECT USING (
    member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()) OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'BAR_STAFF')
  );

CREATE POLICY "bar_orders_manage" ON public.bar_orders
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'BAR_STAFF'));

CREATE POLICY "bar_order_items_select" ON public.bar_order_items
  FOR SELECT USING (true);

-- 12.10 STAFF, SHIFTS & LEAVE
CREATE POLICY "staff_select" ON public.staff
  FOR SELECT USING (
    profile_id = auth.uid() OR
    public.get_user_role() IN ('OWNER', 'ADMIN')
  );

CREATE POLICY "staff_manage" ON public.staff
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN'));

CREATE POLICY "shifts_select" ON public.staff_shifts
  FOR SELECT USING (
    staff_id IN (SELECT id FROM public.staff WHERE profile_id = auth.uid()) OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF')
  );

CREATE POLICY "shifts_manage" ON public.staff_shifts
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN'));

CREATE POLICY "leave_select" ON public.leave_requests
  FOR SELECT USING (
    staff_id IN (SELECT id FROM public.staff WHERE profile_id = auth.uid()) OR
    public.get_user_role() IN ('OWNER', 'ADMIN')
  );

CREATE POLICY "leave_insert" ON public.leave_requests
  FOR INSERT WITH CHECK (
    staff_id IN (SELECT id FROM public.staff WHERE profile_id = auth.uid()) OR
    public.get_user_role() IN ('OWNER', 'ADMIN')
  );

CREATE POLICY "leave_manage" ON public.leave_requests
  FOR UPDATE USING (public.get_user_role() IN ('OWNER', 'ADMIN'));

-- 12.11 INVOICES & PAYMENTS
CREATE POLICY "invoices_select" ON public.invoices
  FOR SELECT USING (
    member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()) OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK')
  );

CREATE POLICY "invoices_manage" ON public.invoices
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK'));

CREATE POLICY "invoice_items_select" ON public.invoice_items
  FOR SELECT USING (true);

CREATE POLICY "payments_select" ON public.payments
  FOR SELECT USING (
    member_id IN (SELECT id FROM public.members WHERE profile_id = auth.uid()) OR
    public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK', 'SHOP_STAFF', 'BAR_STAFF')
  );

CREATE POLICY "payments_manage" ON public.payments
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK'));

-- 12.12 ENQUIRIES & QUOTES
CREATE POLICY "enquiries_insert" ON public.enquiries
  FOR INSERT WITH CHECK (true); -- Public enquiry submission from landing page

CREATE POLICY "enquiries_select_manage" ON public.enquiries
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK'));

CREATE POLICY "quotes_manage" ON public.quotes
  FOR ALL USING (public.get_user_role() IN ('OWNER', 'ADMIN', 'FRONT_DESK'));

-- 12.13 AUDIT LOGS
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (public.get_user_role() IN ('OWNER', 'ADMIN'));

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (true);

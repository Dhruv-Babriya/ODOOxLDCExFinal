# DATABASE SCHEMA & DATA DICTIONARY SPECIFICATION
## The Champions Club — Supabase PostgreSQL 17

---

## 1. Schema Overview

The database is built on **PostgreSQL 17** within Supabase (Project ID: `kgdubokkpkiwxcksmobi`). It features **28 fully normalized relational tables**, all operating under strict **Row Level Security (RLS)**, typed database enums, referential integrity foreign keys, and PostgreSQL transactional stored procedures.

---

## 2. PostgreSQL Enumerated Types (`public.app_*`)

All status and categorization columns across the schema use strictly typed PostgreSQL ENUMs to guarantee zero inconsistency between modules:

| Enum Name | Values |
| :--- | :--- |
| `app_role` | `'OWNER'`, `'ADMIN'`, `'FRONT_DESK'`, `'SHOP_STAFF'`, `'BAR_STAFF'`, `'MEMBER'` |
| `app_membership_tier` | `'GOLD'`, `'SILVER'`, `'JUNIOR'` |
| `app_membership_status` | `'ACTIVE'`, `'EXPIRED'`, `'SUSPENDED'`, `'CANCELLED'`, `'PENDING'` |
| `app_sport_type` | `'TENNIS'`, `'CRICKET'` |
| `app_booking_status` | `'PENDING'`, `'CONFIRMED'`, `'CANCELLED'`, `'COMPLETED'`, `'NO_SHOW'` |
| `app_booking_type` | `'STANDARD'`, `'SOCIAL_PLAY'`, `'COACHING'`, `'MAINTENANCE'` |
| `app_order_channel` | `'COUNTER'`, `'ONLINE'` |
| `app_order_status` | `'PENDING'`, `'PROCESSING'`, `'COMPLETED'`, `'CANCELLED'` |
| `app_inventory_transaction_type` | `'PURCHASE_RECEIPT'`, `'SALE_COUNTER'`, `'SALE_ONLINE'`, `'ADJUSTMENT'`, `'RETURN'` |
| `app_table_status` | `'AVAILABLE'`, `'OCCUPIED'`, `'RESERVED'` |
| `app_kitchen_status` | `'PENDING'`, `'PREPARING'`, `'READY'`, `'SERVED'`, `'CANCELLED'` |
| `app_tab_status` | `'OPEN'`, `'CLOSED'`, `'VOID'` |
| `app_payment_method` | `'CASH'`, `'CARD'`, `'UPI'`, `'BANK_TRANSFER'` |
| `app_payment_status` | `'PENDING'`, `'COMPLETED'`, `'FAILED'`, `'REFUNDED'` |
| `app_recipient_type` | `'MEMBER'`, `'BUSINESS_CLIENT'`, `'WALK_IN'` |
| `app_invoice_status` | `'DRAFT'`, `'ISSUED'`, `'PARTIALLY_PAID'`, `'PAID'`, `'OVERDUE'`, `'VOID'` |
| `app_department` | `'MANAGEMENT'`, `'FRONT_DESK'`, `'COURTS'`, `'SHOP'`, `'BAR'`, `'MAINTENANCE'` |
| `app_shift_status` | `'SCHEDULED'`, `'IN_PROGRESS'`, `'COMPLETED'`, `'MISSED'`, `'CANCELLED'` |
| `app_leave_type` | `'CASUAL'`, `'SICK'`, `'ANNUAL'`, `'UNPAID'` |
| `app_leave_status` | `'PENDING'`, `'APPROVED'`, `'REJECTED'`, `'CANCELLED'` |
| `app_enquiry_status` | `'NEW'`, `'CONTACTED'`, `'TRIAL_SCHEDULED'`, `'QUOTE_SENT'`, `'CONVERTED'`, `'CLOSED'` |
| `app_quote_status` | `'DRAFT'`, `'SENT'`, `'ACCEPTED'`, `'EXPIRED'`, `'REJECTED'` |

---

## 3. Data Dictionary: Tables by Module Ownership

### 3.1 Developer 1 — Core Platform & Membership

#### `public.profiles`
*Linked 1-to-1 with Supabase `auth.users`.*
* `id` (`UUID`, PK, `REFERENCES auth.users(id) ON DELETE CASCADE`)
* `email` (`TEXT`, NOT NULL, UNIQUE)
* `full_name` (`TEXT`, NOT NULL)
* `phone` (`TEXT`, NULLABLE)
* `role` (`app_role`, NOT NULL, DEFAULT `'MEMBER'`)
* `avatar_url` (`TEXT`, NULLABLE)
* `is_active` (`BOOLEAN`, NOT NULL, DEFAULT `TRUE`)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)
* `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

#### `public.membership_plans`
*Defines Gold, Silver, and Junior tiers and club-wide discount privileges.*
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `name` (`TEXT`, NOT NULL, UNIQUE)
* `tier` (`app_membership_tier`, NOT NULL)
* `description` (`TEXT`, NULLABLE)
* `duration_days` (`INTEGER`, NOT NULL, DEFAULT `365`, CHECK `> 0`)
* `price` (`NUMERIC(10,2)`, NOT NULL, CHECK `>= 0`)
* `court_discount_percent` (`NUMERIC(5,2)`, DEFAULT `0`, CHECK `BETWEEN 0 AND 100`)
* `shop_discount_percent` (`NUMERIC(5,2)`, DEFAULT `0`, CHECK `BETWEEN 0 AND 100`)
* `bar_discount_percent` (`NUMERIC(5,2)`, DEFAULT `0`, CHECK `BETWEEN 0 AND 100`)
* `free_court_hours_per_day` (`INTEGER`, DEFAULT `0`, CHECK `>= 0`)
* `max_daily_bookings` (`INTEGER`, DEFAULT `2`, CHECK `>= 1`)
* `is_active` (`BOOLEAN`, DEFAULT `TRUE`)
* `created_at`, `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

#### `public.members`
*Active member records, enrollment dates, and tier associations.*
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `profile_id` (`UUID`, NOT NULL, UNIQUE, `REFERENCES public.profiles(id) ON DELETE RESTRICT`)
* `membership_number` (`TEXT`, NOT NULL, UNIQUE) — e.g. `CC-2026-0042`
* `current_plan_id` (`UUID`, `REFERENCES public.membership_plans(id) ON DELETE RESTRICT`)
* `status` (`app_membership_status`, NOT NULL, DEFAULT `'ACTIVE'`)
* `start_date` (`DATE`, NOT NULL, DEFAULT `CURRENT_DATE`)
* `end_date` (`DATE`, NOT NULL)
* `emergency_contact` (`TEXT`, NULLABLE)
* `notes` (`TEXT`, NULLABLE)
* `created_at`, `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)
* **Constraints**: `CHECK (end_date >= start_date)`

#### `public.membership_history`
*Preserves historical records across tier upgrades, renewals, and expirations.*
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `member_id` (`UUID`, NOT NULL, `REFERENCES public.members(id) ON DELETE CASCADE`)
* `plan_id` (`UUID`, NOT NULL, `REFERENCES public.membership_plans(id) ON DELETE RESTRICT`)
* `start_date` (`DATE`, NOT NULL)
* `end_date` (`DATE`, NOT NULL)
* `status` (`app_membership_status`, NOT NULL)
* `changed_by` (`UUID`, `REFERENCES public.profiles(id) ON DELETE SET NULL`)
* `notes` (`TEXT`, NULLABLE)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)
* **Constraints**: `CHECK (end_date >= start_date)`

---

### 3.2 Developer 2 — Courts & Booking

#### `public.courts`
*Tennis and cricket facility inventory.*
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `name` (`TEXT`, NOT NULL, UNIQUE)
* `sport_type` (`app_sport_type`, NOT NULL)
* `hourly_rate` (`NUMERIC(10,2)`, NOT NULL, CHECK `>= 0`)
* `is_indoor` (`BOOLEAN`, DEFAULT `FALSE`)
* `is_active` (`BOOLEAN`, DEFAULT `TRUE`)
* `created_at`, `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

#### `public.court_bookings`
*Individual court reservation blocks.*
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `court_id` (`UUID`, NOT NULL, `REFERENCES public.courts(id) ON DELETE RESTRICT`)
* `member_id` (`UUID`, NULLABLE, `REFERENCES public.members(id) ON DELETE SET NULL`)
* `booking_type` (`app_booking_type`, NOT NULL, DEFAULT `'STANDARD'`)
* `start_time` (`TIMESTAMPTZ`, NOT NULL)
* `end_time` (`TIMESTAMPTZ`, NOT NULL)
* `status` (`app_booking_status`, NOT NULL, DEFAULT `'CONFIRMED'`)
* `base_price` (`NUMERIC(10,2)`, DEFAULT `0.00`, CHECK `>= 0`)
* `discount_amount` (`NUMERIC(10,2)`, DEFAULT `0.00`, CHECK `>= 0`)
* `final_price` (`NUMERIC(10,2)`, DEFAULT `0.00`, CHECK `>= 0`)
* `cancellation_reason` (`TEXT`, NULLABLE)
* `cancelled_at` (`TIMESTAMPTZ`, NULLABLE)
* `notes` (`TEXT`, NULLABLE)
* `created_by` (`UUID`, `REFERENCES public.profiles(id) ON DELETE SET NULL`)
* `created_at`, `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)
* **Constraints**:
  * `CHECK (end_time > start_time)`
  * **Exclusion Constraint**:
    ```sql
    CONSTRAINT no_overlapping_court_bookings
    EXCLUDE USING gist (
      court_id WITH =,
      tstzrange(start_time, end_time, '[)') WITH &&
    )
    WHERE (status NOT IN ('CANCELLED'));
    ```

#### `public.booking_participants`
*Multi-player / Friday social play participants on a shared court slot.*
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `booking_id` (`UUID`, NOT NULL, `REFERENCES public.court_bookings(id) ON DELETE CASCADE`)
* `member_id` (`UUID`, NULLABLE, `REFERENCES public.members(id) ON DELETE SET NULL`)
* `guest_name` (`TEXT`, NULLABLE)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

---

### 3.3 Developer 3 — Shop, Inventory & Bar

#### `public.product_categories`
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `name` (`TEXT`, NOT NULL, UNIQUE)
* `description` (`TEXT`, NULLABLE)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

#### `public.products`
*Rackets, balls, footwear, apparel, accessories.*
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `category_id` (`UUID`, `REFERENCES public.product_categories(id) ON DELETE SET NULL`)
* `sku` (`TEXT`, NOT NULL, UNIQUE)
* `name` (`TEXT`, NOT NULL)
* `description` (`TEXT`, NULLABLE)
* `price` (`NUMERIC(10,2)`, NOT NULL, CHECK `>= 0`)
* `low_stock_threshold` (`INTEGER`, DEFAULT `5`, CHECK `>= 0`)
* `is_active` (`BOOLEAN`, DEFAULT `TRUE`)
* `image_url` (`TEXT`, NULLABLE)
* `created_at`, `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

#### `public.inventory`
*Single source of truth for stock quantities across physical counter sales and online orders.*
* `product_id` (`UUID`, PK, `REFERENCES public.products(id) ON DELETE CASCADE`)
* `quantity_on_hand` (`INTEGER`, NOT NULL, DEFAULT `0`, CHECK `>= 0`)
* `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

#### `public.inventory_transactions`
*Traceable ledger of all stock modifications.*
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `product_id` (`UUID`, NOT NULL, `REFERENCES public.products(id) ON DELETE CASCADE`)
* `change_quantity` (`INTEGER`, NOT NULL, CHECK `!= 0`)
* `transaction_type` (`app_inventory_transaction_type`, NOT NULL)
* `reference_id` (`UUID`, NULLABLE) — Links to `shop_orders.id`
* `notes` (`TEXT`, NULLABLE)
* `created_by` (`UUID`, `REFERENCES public.profiles(id) ON DELETE SET NULL`)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

#### `public.shop_orders` & `public.shop_order_items`
* `shop_orders`: `id`, `order_number` (UNIQUE), `member_id` (FK), `order_channel` (`COUNTER`/`ONLINE`), `status` (`app_order_status`), `subtotal`, `discount_amount`, `total_amount`, `created_by` (FK), `created_at`, `updated_at`.
* `shop_order_items`: `id`, `order_id` (FK cascade), `product_id` (FK restrict), `quantity` (CHECK `> 0`), `unit_price`, `total_price`, `created_at`.

#### `public.bar_tables`
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `table_number` (`TEXT`, NOT NULL, UNIQUE)
* `capacity` (`INTEGER`, NOT NULL, DEFAULT `4`, CHECK `> 0`)
* `status` (`app_table_status`, DEFAULT `'AVAILABLE'`)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

#### `public.menu_categories` & `public.menu_items`
* `menu_categories`: `id`, `name` (UNIQUE), `display_order`, `created_at`.
* `menu_items`: `id`, `category_id` (FK), `name`, `description`, `price` (CHECK `>= 0`), `is_available`, `created_at`.

#### `public.customer_tabs`
*Open running tabs for members and table patrons.*
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `member_id` (`UUID`, NULLABLE, `REFERENCES public.members(id) ON DELETE SET NULL`)
* `table_id` (`UUID`, NULLABLE, `REFERENCES public.bar_tables(id) ON DELETE SET NULL`)
* `status` (`app_tab_status`, DEFAULT `'OPEN'`)
* `opened_by` (`UUID`, `REFERENCES public.profiles(id) ON DELETE SET NULL`)
* `opened_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`), `closed_at` (`TIMESTAMPTZ`, NULLABLE)

#### `public.bar_orders` & `public.bar_order_items`
* `bar_orders`: `id`, `order_number` (UNIQUE), `tab_id` (FK), `table_id` (FK), `member_id` (FK), `kitchen_status` (`PENDING`/`PREPARING`/`READY`/`SERVED`/`CANCELLED`), `order_status` (`app_order_status`), `subtotal`, `discount_amount`, `total_amount`, `created_by` (FK), `created_at`, `updated_at`.
* `bar_order_items`: `id`, `order_id` (FK cascade), `menu_item_id` (FK restrict), `quantity` (CHECK `> 0`), `unit_price`, `total_price`, `special_instructions`, `created_at`.

---

### 3.4 Developer 4 — Finance, Staff & Reporting

#### `public.staff`, `public.staff_shifts` & `public.leave_requests`
* `staff`: `id`, `profile_id` (UNIQUE FK), `employee_code` (UNIQUE), `department`, `position`, `hourly_rate`, `salary_monthly`, `hire_date`, `is_active`, `created_at`, `updated_at`.
* `staff_shifts`: `id`, `staff_id` (FK cascade), `shift_date`, `start_time`, `end_time` (CHECK `end_time > start_time`), `status` (`app_shift_status`), `notes`, `created_at`, `updated_at`.
* `leave_requests`: `id`, `staff_id` (FK cascade), `leave_type`, `start_date`, `end_date` (CHECK `end_date >= start_date`), `reason`, `status` (`app_leave_status`), `reviewed_by` (FK), `reviewed_at`, `review_notes`, `created_at`, `updated_at`.

#### `public.invoices` & `public.invoice_items`
* `invoices`: `id`, `invoice_number` (UNIQUE), `member_id` (FK), `recipient_name`, `recipient_email`, `recipient_type` (`MEMBER`/`BUSINESS_CLIENT`/`WALK_IN`), `subtotal`, `tax_amount`, `total_amount`, `paid_amount`, `status` (`app_invoice_status`), `due_date`, `notes`, `created_by` (FK), `created_at`, `updated_at`.
* `invoice_items`: `id`, `invoice_id` (FK cascade), `description`, `quantity`, `unit_price`, `total_price`, `created_at`.

#### `public.payments`
*Unified financial ledger consolidating receipts from all club streams.*
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `payment_number` (`TEXT`, NOT NULL, UNIQUE)
* `invoice_id` (`UUID`, NULLABLE, `REFERENCES public.invoices(id) ON DELETE SET NULL`)
* `booking_id` (`UUID`, NULLABLE, `REFERENCES public.court_bookings(id) ON DELETE SET NULL`)
* `shop_order_id` (`UUID`, NULLABLE, `REFERENCES public.shop_orders(id) ON DELETE SET NULL`)
* `bar_order_id` (`UUID`, NULLABLE, `REFERENCES public.bar_orders(id) ON DELETE SET NULL`)
* `member_id` (`UUID`, NULLABLE, `REFERENCES public.members(id) ON DELETE SET NULL`)
* `amount` (`NUMERIC(10,2)`, NOT NULL, CHECK `amount > 0`)
* `payment_method` (`app_payment_method`, NOT NULL)
* `status` (`app_payment_status`, NOT NULL, DEFAULT `'COMPLETED'`)
* `transaction_reference` (`TEXT`, NULLABLE)
* `recorded_by` (`UUID`, `REFERENCES public.profiles(id) ON DELETE SET NULL`)
* `created_at`, `updated_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

#### `public.enquiries` & `public.quotes`
* `enquiries`: `id`, `full_name`, `email`, `phone`, `interested_sport`, `interested_plan_id` (FK), `requested_trial_date`, `status` (`app_enquiry_status`), `message`, `assigned_to` (FK), `created_at`, `updated_at`.
* `quotes`: `id`, `quote_number` (UNIQUE), `enquiry_id` (FK), `recipient_name`, `recipient_email`, `membership_plan_id` (FK), `quoted_amount` (CHECK `>= 0`), `valid_until`, `status` (`app_quote_status`), `created_by` (FK), `created_at`, `updated_at`.

#### `public.audit_logs`
* `id` (`UUID`, PK, DEFAULT `gen_random_uuid()`)
* `actor_id` (`UUID`, `REFERENCES public.profiles(id) ON DELETE SET NULL`)
* `action` (`TEXT`, NOT NULL) — e.g. `'MEMBER_STATUS_CHANGED'`, `'PRICE_OVERRIDE'`
* `entity_type` (`TEXT`, NOT NULL)
* `entity_id` (`UUID`, NULLABLE)
* `details` (`JSONB`, NULLABLE)
* `ip_address` (`TEXT`, NULLABLE)
* `created_at` (`TIMESTAMPTZ`, DEFAULT `NOW()`)

---

## 4. Stored Procedures & Atomic Functions

1. **`public.get_user_role()`**
   * Returns: `app_role`
   * Attributes: `STABLE`, `SECURITY DEFINER`
   * Lookups `public.profiles.role` for `auth.uid()` without triggering recursive RLS evaluation.

2. **`public.create_court_booking(...)`**
   * Parameters: court ID, member ID, booking type, start time, end time, prices, notes.
   * Logic: Validates member daily limit (`< 2` bookings for that date); inserts booking under PostgreSQL transaction; relies on GIST exclusion constraint for absolute collision prevention.

3. **`public.deduct_inventory(...)`**
   * Parameters: product ID, quantity, transaction type, reference order ID, notes.
   * Logic: Performs row-level locked `UPDATE` ensuring `quantity_on_hand >= quantity_to_deduct`. Raises exception `P0002` if stock is insufficient; records change in `public.inventory_transactions`.

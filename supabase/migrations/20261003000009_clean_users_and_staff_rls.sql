-- =============================================================================
-- Migration: 20261003000009_clean_users_and_staff_rls.sql
-- Description: Clean up test members, preserve 1 Owner, 1 Manager, 1 Staff,
--              fix GoTrue scan token NULL error, and grant Staff permissions
--              to update pro shop & bar cafeteria items.
-- =============================================================================

-- 1. Fix NULL tokens in auth.users to prevent GoTrue Go scanner errors
UPDATE auth.users
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  phone_change_token = COALESCE(phone_change_token, '');

-- 2. Clear dummy test bookings and transactional records
DELETE FROM public.booking_participants;
DELETE FROM public.court_bookings;
DELETE FROM public.customer_tabs;
DELETE FROM public.bar_orders;
DELETE FROM public.shop_orders;
DELETE FROM public.payments;
DELETE FROM public.invoices;
DELETE FROM public.membership_history;
DELETE FROM public.notifications;

-- 3. Remove all dummy members
DELETE FROM public.members;

-- 4. Delete member profiles
DELETE FROM public.profiles WHERE role = 'MEMBER';

-- 5. Delete member auth accounts (keep only Owner 01, Manager 02, Staff 03)
DELETE FROM auth.users 
WHERE id NOT IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003'
);

-- 6. Setup exactly ONE Owner account
UPDATE auth.users 
SET 
  email = 'owner@thechampionsclub.com',
  encrypted_password = extensions.crypt('Password123!', extensions.gen_salt('bf', 10)),
  email_confirmed_at = NOW(),
  raw_user_meta_data = '{"full_name":"Club Owner","role":"OWNER"}'
WHERE id = '00000000-0000-0000-0000-000000000001';

UPDATE public.profiles 
SET 
  full_name = 'Club Owner',
  role = 'OWNER'
WHERE id = '00000000-0000-0000-0000-000000000001';

-- 7. Setup exactly ONE Manager account (Role: ADMIN)
UPDATE auth.users 
SET 
  email = 'manager@thechampionsclub.com',
  encrypted_password = extensions.crypt('Password123!', extensions.gen_salt('bf', 10)),
  email_confirmed_at = NOW(),
  raw_user_meta_data = '{"full_name":"Club General Manager","role":"ADMIN"}'
WHERE id = '00000000-0000-0000-0000-000000000002';

UPDATE public.profiles 
SET 
  full_name = 'Club General Manager',
  role = 'ADMIN'
WHERE id = '00000000-0000-0000-0000-000000000002';

-- 8. Setup exactly ONE Staff account (Role: FRONT_DESK)
UPDATE auth.users 
SET 
  email = 'staff@thechampionsclub.com',
  encrypted_password = extensions.crypt('Password123!', extensions.gen_salt('bf', 10)),
  email_confirmed_at = NOW(),
  raw_user_meta_data = '{"full_name":"Club Operations Staff","role":"FRONT_DESK"}'
WHERE id = '00000000-0000-0000-0000-000000000003';

UPDATE public.profiles 
SET 
  full_name = 'Club Operations Staff',
  role = 'FRONT_DESK'
WHERE id = '00000000-0000-0000-0000-000000000003';


-- 9. Allow Staff, Manager, Owner to manage products
DROP POLICY IF EXISTS "products_manage_policy" ON public.products;
CREATE POLICY "products_manage_policy" ON public.products
  FOR ALL
  USING (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'SHOP_STAFF'::app_role, 'FRONT_DESK'::app_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'SHOP_STAFF'::app_role, 'FRONT_DESK'::app_role]));

-- 10. Allow Staff, Manager, Owner to manage inventory
DROP POLICY IF EXISTS "inventory_manage" ON public.inventory;
CREATE POLICY "inventory_manage" ON public.inventory
  FOR ALL
  USING (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'SHOP_STAFF'::app_role, 'FRONT_DESK'::app_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'SHOP_STAFF'::app_role, 'FRONT_DESK'::app_role]));

-- 11. Allow Staff, Manager, Owner to manage menu items (Bar & Cafeteria)
DROP POLICY IF EXISTS "menu_manage" ON public.menu_items;
CREATE POLICY "menu_manage" ON public.menu_items
  FOR ALL
  USING (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'BAR_STAFF'::app_role, 'FRONT_DESK'::app_role]))
  WITH CHECK (get_user_role() = ANY (ARRAY['OWNER'::app_role, 'ADMIN'::app_role, 'BAR_STAFF'::app_role, 'FRONT_DESK'::app_role]));

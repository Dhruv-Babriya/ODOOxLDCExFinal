-- =============================================================================
-- THE CHAMPIONS CLUB - DEVELOPMENT SEED DATA
-- Strictly labeled for development and testing environments
-- =============================================================================

-- 1. Membership Plans
INSERT INTO public.membership_plans (
  id,
  name,
  tier,
  description,
  duration_days,
  price,
  court_discount_percent,
  shop_discount_percent,
  bar_discount_percent,
  free_court_hours_per_day,
  max_daily_bookings,
  is_active
)
VALUES
  (
    '11111111-1111-1111-1111-111111111101',
    'Gold Membership',
    'GOLD',
    'Premium access: 1 free court hour/day, 50% discount on additional court hours, 15% off pro shop & cafeteria.',
    365,
    25000.00,
    50.00,
    15.00,
    15.00,
    1,
    2,
    TRUE
  ),
  (
    '11111111-1111-1111-1111-111111111102',
    'Silver Membership',
    'SILVER',
    'Regular access: 25% discount on all court bookings, 10% off pro shop & cafeteria.',
    365,
    15000.00,
    25.00,
    10.00,
    10.00,
    0,
    2,
    TRUE
  ),
  (
    '11111111-1111-1111-1111-111111111103',
    'Junior Membership',
    'JUNIOR',
    'Designed for under-18 athletes: 30% discount on courts, 10% off gear, youth coaching priority.',
    365,
    8000.00,
    30.00,
    10.00,
    5.00,
    0,
    2,
    TRUE
  )
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  court_discount_percent = EXCLUDED.court_discount_percent,
  shop_discount_percent = EXCLUDED.shop_discount_percent,
  bar_discount_percent = EXCLUDED.bar_discount_percent;

-- 2. Courts
INSERT INTO public.courts (
  id,
  name,
  sport_type,
  hourly_rate,
  is_indoor,
  is_active
)
VALUES
  ('22222222-2222-2222-2222-222222222201', 'Tennis Court 1 (Clay)', 'TENNIS', 600.00, FALSE, TRUE),
  ('22222222-2222-2222-2222-222222222202', 'Tennis Court 2 (Hard Court)', 'TENNIS', 600.00, FALSE, TRUE),
  ('22222222-2222-2222-2222-222222222203', 'Center Indoor Tennis Arena', 'TENNIS', 1000.00, TRUE, TRUE),
  ('22222222-2222-2222-2222-222222222204', 'Cricket Pitch A (Main Oval)', 'CRICKET', 1400.00, FALSE, TRUE),
  ('22222222-2222-2222-2222-222222222205', 'Cricket Net 1 (Bowling Machine)', 'CRICKET', 500.00, TRUE, TRUE)
ON CONFLICT (name) DO UPDATE SET
  hourly_rate = EXCLUDED.hourly_rate;

-- 3. Product Categories
INSERT INTO public.product_categories (id, name, description)
VALUES
  ('33333333-3333-3333-3333-333333333301', 'Rackets', 'Tennis and badminton performance rackets'),
  ('33333333-3333-3333-3333-333333333302', 'Balls & Equipment', 'Championship tennis balls and cricket leather balls'),
  ('33333333-3333-3333-3333-333333333303', 'Footwear', 'Non-marking court shoes and cricket spikes'),
  ('33333333-3333-3333-3333-333333333304', 'Apparel', 'Breathable performance sportswear and caps'),
  ('33333333-3333-3333-3333-333333333305', 'Accessories', 'Grips, wristbands, bags and vibration dampeners')
ON CONFLICT (name) DO NOTHING;

-- 4. Sample Products & Inventory
INSERT INTO public.products (
  id,
  category_id,
  sku,
  name,
  description,
  price,
  low_stock_threshold,
  is_active
)
VALUES
  (
    '44444444-4444-4444-4444-444444444401',
    '33333333-3333-3333-3333-333333333301',
    'PRO-RCK-001',
    'Pro Staff 97 Tennis Racket',
    'Tour-grade precision racket with carbon fiber weave.',
    8999.00,
    5,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-444444444402',
    '33333333-3333-3333-3333-333333333302',
    'BAL-TEN-003',
    'Championship Tennis Balls (Can of 3)',
    'Extra duty felt balls approved for all court surfaces.',
    450.00,
    20,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-444444444403',
    '33333333-3333-3333-3333-333333333302',
    'BAL-CRK-001',
    'Four-Piece Red Leather Cricket Ball',
    'Handmade leather ball meeting match regulation specs.',
    650.00,
    15,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-444444444404',
    '33333333-3333-3333-3333-333333333303',
    'SHO-CRT-001',
    'Gel-Court Performance Shoes',
    'Superior lateral stability and cushioning for clay & hard courts.',
    5499.00,
    6,
    TRUE
  ),
  (
    '44444444-4444-4444-4444-444444444405',
    '33333333-3333-3333-3333-333333333304',
    'APP-POLO-001',
    'Champions Club Athletic Polo',
    'Quick-drying micro-mesh fabric with embroidered club emblem.',
    1299.00,
    10,
    TRUE
  )
ON CONFLICT (sku) DO UPDATE SET
  price = EXCLUDED.price;

-- Initialize inventory for products
INSERT INTO public.inventory (product_id, quantity_on_hand)
VALUES
  ('44444444-4444-4444-4444-444444444401', 12),
  ('44444444-4444-4444-4444-444444444402', 45),
  ('44444444-4444-4444-4444-444444444403', 30),
  ('44444444-4444-4444-4444-444444444404', 8),
  ('44444444-4444-4444-4444-444444444405', 25)
ON CONFLICT (product_id) DO UPDATE SET
  quantity_on_hand = EXCLUDED.quantity_on_hand;

-- 5. Bar Tables
INSERT INTO public.bar_tables (id, table_number, capacity, status)
VALUES
  ('55555555-5555-5555-5555-555555555501', 'T1', 4, 'AVAILABLE'),
  ('55555555-5555-5555-5555-555555555502', 'T2', 4, 'AVAILABLE'),
  ('55555555-5555-5555-5555-555555555503', 'T3', 6, 'AVAILABLE'),
  ('55555555-5555-5555-5555-555555555504', 'T4', 2, 'AVAILABLE'),
  ('55555555-5555-5555-5555-555555555505', 'T5 (Lounge)', 8, 'AVAILABLE')
ON CONFLICT (table_number) DO NOTHING;

-- 6. Menu Categories & Items
INSERT INTO public.menu_categories (id, name, display_order)
VALUES
  ('66666666-6666-6666-6666-666666666601', 'Beverages & Hydration', 1),
  ('66666666-6666-6666-6666-666666666602', 'Healthy Bites & Wraps', 2),
  ('66666666-6666-6666-6666-666666666603', 'Club Classics & Platters', 3)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.menu_items (id, category_id, name, description, price, is_available)
VALUES
  ('77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666601', 'Electrolyte Citrus Refresher', 'Fresh mint, lemon, rock salt and chilled sparkling soda.', 90.00, TRUE),
  ('77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666601', 'Whey Protein Recovery Smoothie', 'Banana, peanut butter, almond milk and organic whey.', 195.00, TRUE),
  ('77777777-7777-7777-7777-777777777703', '66666666-6666-6666-6666-666666666602', 'Grilled Chicken Avocado Wrap', 'Herb-roasted chicken breast with avocado salsa in multigrain wrap.', 240.00, TRUE),
  ('77777777-7777-7777-7777-777777777704', '66666666-6666-6666-6666-666666666602', 'Paneer Tikka Protein Bowl', 'Chargrilled cottage cheese, quinoa, steamed broccoli and mint dip.', 220.00, TRUE),
  ('77777777-7777-7777-7777-777777777705', '66666666-6666-6666-6666-666666666603', 'Champions Club Toasted Sandwich', 'Triple-decker toasted sandwich with cheese, tomatoes and house fries.', 180.00, TRUE)
ON CONFLICT DO NOTHING;

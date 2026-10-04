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

-- 6. Menu Categories & Items (50 Menu Items across 8 Categories)
INSERT INTO public.menu_categories (id, name, display_order)
VALUES
  ('66666666-6666-6666-6666-666666666601', 'Beverages & Hydration', 1),
  ('66666666-6666-6666-6666-666666666602', 'Healthy Bites & Wraps', 2),
  ('66666666-6666-6666-6666-666666666603', 'Club Classics & Platters', 3),
  ('66666666-6666-6666-6666-666666666604', 'Recovery Shakes & Protein Smoothies', 4),
  ('66666666-6666-6666-6666-666666666605', 'Salads & Power Greens', 5),
  ('66666666-6666-6666-6666-666666666606', 'Artisan Coffee & Specialty Teas', 6),
  ('66666666-6666-6666-6666-666666666607', 'Healthy Snacks & Energy Fuel', 7),
  ('66666666-6666-6666-6666-666666666608', 'Guilt-Free Desserts & Bowls', 8)
ON CONFLICT (name) DO UPDATE SET
  display_order = EXCLUDED.display_order;

INSERT INTO public.menu_items (id, category_id, name, description, price, is_available)
VALUES
  -- 1. Beverages & Hydration
  ('77777777-7777-7777-7777-777777777701', '66666666-6666-6666-6666-666666666601', 'Electrolyte Citrus Refresher', 'Fresh mint, lemon, rock salt and chilled sparkling soda.', 90.00, TRUE),
  ('77777777-7777-7777-7777-777777777702', '66666666-6666-6666-6666-666666666601', 'Whey Protein Recovery Smoothie', 'Banana, peanut butter, almond milk and organic whey.', 195.00, TRUE),
  ('038ef3ee-c9b7-4fad-800d-86a0ffd11bf0', '66666666-6666-6666-6666-666666666601', 'Double Shot Iced Cold Brew', 'Slow-steeped Arabica beans, served chilled over ice with oat milk splash.', 120.00, TRUE),
  ('77777777-7777-7777-7777-777777777709', '66666666-6666-6666-6666-666666666601', 'Coconut Water & Chia Seed Quencher', 'Fresh tender coconut water infused with soaked organic chia seeds, lime spritz, and fresh mint.', 110.00, TRUE),
  ('77777777-7777-7777-7777-777777777710', '66666666-6666-6666-6666-666666666601', 'Watermelon Mint Isotonic Cooler', 'Freshly extracted cold-pressed watermelon juice with fresh garden mint and Himalayan pink mineral salt.', 130.00, TRUE),
  ('77777777-7777-7777-7777-777777777711', '66666666-6666-6666-6666-666666666601', 'Kombucha Pomegranate Fizz', 'Artisanal probiotic fermented sparkling tea infused with organic pomegranate and ginger essence.', 160.00, TRUE),
  ('77777777-7777-7777-7777-777777777712', '66666666-6666-6666-6666-666666666601', 'Alkaline Detox Greens Press', 'Cold-pressed celery, Japanese cucumber, green Granny Smith apple, baby spinach, ginger, and lemon.', 150.00, TRUE),
  ('77777777-7777-7777-7777-777777777713', '66666666-6666-6666-6666-666666666601', 'Sparkling Valencia Orange Spritzer', 'Pure cold-pressed Valencia oranges with sparkling mineral water and aromatic rosemary sprig.', 120.00, TRUE),

  -- 2. Healthy Bites & Wraps
  ('77777777-7777-7777-7777-777777777703', '66666666-6666-6666-6666-666666666602', 'Grilled Chicken Avocado Wrap', 'Herb-roasted chicken breast with avocado salsa in multigrain wrap.', 240.00, TRUE),
  ('77777777-7777-7777-7777-777777777704', '66666666-6666-6666-6666-666666666602', 'Paneer Tikka Protein Bowl', 'Chargrilled cottage cheese, quinoa, steamed broccoli and mint dip.', 220.00, TRUE),
  ('349edd13-e603-4b38-89c2-85da4a795a14', '66666666-6666-6666-6666-666666666602', 'Mediterranean Quinoa Power Bowl', 'Organic tri-color quinoa, baby spinach, kalamata olives, cherry tomatoes and feta.', 210.00, TRUE),
  ('77777777-7777-7777-7777-777777777714', '66666666-6666-6666-6666-666666666602', 'Avocado Sourdough Toast with Poached Eggs', 'Artisan sourdough, smashed Hass avocado, free-range poached eggs, microgreens, and chili flakes.', 230.00, TRUE),
  ('77777777-7777-7777-7777-777777777715', '66666666-6666-6666-6666-666666666602', 'Smoked Salmon & Herbed Cream Bagel', 'Norwegian smoked salmon, light dill cream cheese, capers, and pickled shallots on toasted whole wheat bagel.', 310.00, TRUE),
  ('77777777-7777-7777-7777-777777777716', '66666666-6666-6666-6666-666666666602', 'Falafel & Roasted Beet Hummus Wrap', 'Crispy baked herb falafels, ruby beet hummus, English cucumbers, and tahini vinaigrette in spinach tortilla.', 195.00, TRUE),
  ('77777777-7777-7777-7777-777777777717', '66666666-6666-6666-6666-666666666602', 'Tandoori Soya Chaap Protein Bowl', 'High-protein roasted soya chaap skewers with brown rice, sautéed bell peppers, and mint yogurt dressing.', 210.00, TRUE),
  ('77777777-7777-7777-7777-777777777718', '66666666-6666-6666-6666-666666666602', 'Egg White & Baby Spinach Breakfast Burrito', 'Scrambled farm egg whites, sauteed baby spinach, black beans, pico de gallo, and low-fat cheddar.', 185.00, TRUE),
  ('77777777-7777-7777-7777-777777777719', '66666666-6666-6666-6666-666666666602', 'Barbecue Tofu & Edamame Grain Bowl', 'Glazed organic firm tofu, steamed edamame, wild rice blend, shredded purple cabbage, and sesame ginger glaze.', 225.00, TRUE),

  -- 3. Club Classics & Platters
  ('77777777-7777-7777-7777-777777777705', '66666666-6666-6666-6666-666666666603', 'Champions Club Toasted Sandwich', 'Triple-decker toasted sandwich with cheese, tomatoes and house fries.', 180.00, TRUE),
  ('a3f7b8fb-c965-4fdd-aaaa-e2aa76577462', '66666666-6666-6666-6666-666666666603', 'Crispy Herb Sweet Potato Wedges', 'Oven-baked sweet potato wedges dusted with rosemary and smoked paprika dip.', 140.00, TRUE),
  ('77777777-7777-7777-7777-777777777720', '66666666-6666-6666-6666-666666666603', 'Champions Clubhouse Angus Burger', 'Juicy grilled patty, aged cheddar, crisp lettuce, heirloom tomato, caramelized onions, and sweet pickle relish.', 340.00, TRUE),
  ('77777777-7777-7777-7777-777777777721', '66666666-6666-6666-6666-666666666603', 'Pan-Seared Atlantic Salmon Fillet', 'Crispy skin salmon with lemon-herb butter sauce, steamed asparagus, and roasted baby potatoes.', 520.00, TRUE),
  ('77777777-7777-7777-7777-777777777722', '66666666-6666-6666-6666-666666666603', 'Grilled Herb Lemon Chicken Breast Platter', 'Marinated chicken breast steak served with mushroom pepper jus, grilled zucchini, and saffron rice.', 320.00, TRUE),
  ('77777777-7777-7777-7777-777777777723', '66666666-6666-6666-6666-666666666603', 'Wild Mushroom Truffle Risotto', 'Arborio rice simmered with porcini and shiitake mushrooms, finished with white truffle oil and aged parmesan.', 360.00, TRUE),
  ('77777777-7777-7777-7777-777777777724', '66666666-6666-6666-6666-666666666603', 'Neapolitan Sourdough Margherita Pizzetta', 'Hand-stretched slow-fermented crust, San Marzano tomato sugo, fresh buffalo mozzarella, and sweet basil.', 260.00, TRUE),
  ('77777777-7777-7777-7777-777777777725', '66666666-6666-6666-6666-666666666603', 'Char-Grilled Chicken Tikka Skewers', 'Tender yoghurt-marinated chicken skewers with tandoori spices, mint relish, and laccha onions.', 280.00, TRUE),

  -- 4. Recovery Shakes & Protein Smoothies
  ('77777777-7777-7777-7777-777777777726', '66666666-6666-6666-6666-666666666604', 'Chocolate Peanut Butter Whey Slam', 'Double rich Belgian chocolate whey, organic peanut butter, rolled oats, banana, and chilled oat milk.', 210.00, TRUE),
  ('77777777-7777-7777-7777-777777777727', '66666666-6666-6666-6666-666666666604', 'Wild Berry Antioxidant Blast', 'Blueberries, raspberries, strawberries, Greek yogurt, chia seeds, and plant-based vanilla protein.', 220.00, TRUE),
  ('77777777-7777-7777-7777-777777777728', '66666666-6666-6666-6666-666666666604', 'Green Monster Spirulina Shake', 'Organic spirulina, baby kale, green apple, banana, coconut water, and clean unflavored isolate whey.', 230.00, TRUE),
  ('77777777-7777-7777-7777-777777777729', '66666666-6666-6666-6666-666666666604', 'Matcha Vanilla Performance Fuel', 'Japanese ceremonial Uji matcha, vanilla isolate protein, almond milk, and a dash of raw honey.', 240.00, TRUE),
  ('77777777-7777-7777-7777-777777777730', '66666666-6666-6666-6666-666666666604', 'Tropical Mango Coconut Recovery', 'Alphonso mango pulp, coconut milk, chia seeds, whey protein, and crushed ice.', 200.00, TRUE),
  ('77777777-7777-7777-7777-777777777731', '66666666-6666-6666-6666-666666666604', 'Cold Coffee Protein Frappé', 'Espresso shot blended with dark cocoa whey protein, crushed ice, and unsweetened almond milk.', 210.00, TRUE),

  -- 5. Salads & Power Greens
  ('77777777-7777-7777-7777-777777777732', '66666666-6666-6666-6666-666666666605', 'Classic Grilled Chicken Caesar Salad', 'Crisp romaine hearts, herb-grilled chicken, sourdough croutons, shaved parmesan, and light Caesar dressing.', 260.00, TRUE),
  ('77777777-7777-7777-7777-777777777733', '66666666-6666-6666-6666-666666666605', 'Burrata & Heirloom Cherry Tomato Caprese', 'Artisanal fresh burrata ball, marinated cherry tomatoes, basil pesto, balsamic reduction glaze, and pine nuts.', 290.00, TRUE),
  ('77777777-7777-7777-7777-777777777734', '66666666-6666-6666-6666-666666666605', 'Mediterranean Greek Feta & Olive Salad', 'Crisp English cucumber, bell peppers, Kalamata olives, authentic Greek barrel-aged feta, and oregano vinaigrette.', 220.00, TRUE),
  ('77777777-7777-7777-7777-777777777735', '66666666-6666-6666-6666-666666666605', 'Asian Sesame Crunchy Edamame Salad', 'Shredded Napa cabbage, purple kale, shelled edamame beans, mandarin oranges, toasted almonds, and sesame dressing.', 210.00, TRUE),
  ('77777777-7777-7777-7777-777777777736', '66666666-6666-6666-6666-666666666605', 'Warm Roasted Beetroot & Goat Cheese Salad', 'Oven-roasted beets, baby arugula, creamy goat cheese crumbles, candied walnuts, and citrus honey dressing.', 240.00, TRUE),

  -- 6. Artisan Coffee & Specialty Teas
  ('77777777-7777-7777-7777-777777777737', '66666666-6666-6666-6666-666666666606', 'Cortado with Oat Milk', 'Equal parts rich double espresso and silky textured steamed oat milk.', 130.00, TRUE),
  ('77777777-7777-7777-7777-777777777738', '66666666-6666-6666-6666-666666666606', 'Single Origin Pour-Over Coffee', 'Handcrafted pour-over using light-roast Ethiopian Yirgacheffe beans with floral and citrus notes.', 150.00, TRUE),
  ('77777777-7777-7777-7777-777777777739', '66666666-6666-6666-6666-666666666606', 'Matcha Green Tea Latte', 'Whisked ceremonial-grade Japanese matcha with warm microfoam almond milk.', 170.00, TRUE),
  ('77777777-7777-7777-7777-777777777740', '66666666-6666-6666-6666-666666666606', 'Kashmiri Saffron & Cardamom Kahwa', 'Traditional green tea brewed with saffron strands, whole cinnamon, green cardamom, and crushed almonds.', 140.00, TRUE),
  ('77777777-7777-7777-7777-777777777741', '66666666-6666-6666-6666-666666666606', 'Chamomile Honey Herbal Infusion', 'Whole dried chamomile flowers brewed warm with organic wild forest honey and fresh mint.', 120.00, TRUE),

  -- 7. Healthy Snacks & Energy Fuel
  ('77777777-7777-7777-7777-777777777742', '66666666-6666-6666-6666-666666666607', 'Raw Almond Butter & Cacao Energy Bites (3 pcs)', 'No-bake energy balls crafted from Medjool dates, raw almonds, cacao nibs, and chia seeds.', 130.00, TRUE),
  ('77777777-7777-7777-7777-777777777743', '66666666-6666-6666-6666-666666666607', 'Roasted Peri-Peri Edamame Pods', 'Steamed edamame in pods tossed with smoky African peri-peri sea salt and fresh lime juice.', 120.00, TRUE),
  ('77777777-7777-7777-7777-777777777744', '66666666-6666-6666-6666-666666666607', 'Classic Truffle & Parmesan Air-Popped Corn', 'Light air-popped corn kernels misted with Italian white truffle oil and finely grated parmesan.', 110.00, TRUE),
  ('77777777-7777-7777-7777-777777777745', '66666666-6666-6666-6666-666666666607', 'Mediterranean Hummus Duo with Baked Lavash', 'Classic garlic hummus and spicy sundried tomato hummus served with crisp multigrain seeded lavash.', 170.00, TRUE),
  ('77777777-7777-7777-7777-777777777746', '66666666-6666-6666-6666-666666666607', 'Baked Sweet Potato & Zucchini Crisps', 'Crispy oven-dehydrated vegetable crisps served with herbed Greek yogurt dip.', 130.00, TRUE),

  -- 8. Guilt-Free Desserts & Bowls
  ('77777777-7777-7777-7777-777777777747', '66666666-6666-6666-6666-666666666608', 'Acai Berry Superfood Breakfast Bowl', 'Frozen organic acai puree blended thick, topped with hemp seeds, toasted coconut flakes, kiwi, and almond butter drizzle.', 260.00, TRUE),
  ('77777777-7777-7777-7777-777777777748', '66666666-6666-6666-6666-666666666608', 'Dark Chocolate Avocado Silk Mousse', 'Velvety 70% dark Belgian cocoa whipped with ripe Hass avocado, sweetened with organic pure maple syrup.', 180.00, TRUE),
  ('77777777-7777-7777-7777-777777777749', '66666666-6666-6666-6666-666666666608', 'Mango Coconut Chia Seed Pudding', 'Layered vanilla bean chia pudding soaked in coconut milk, topped with fresh mango coulis and mint.', 160.00, TRUE),
  ('77777777-7777-7777-7777-777777777750', '66666666-6666-6666-6666-666666666608', 'High-Protein Warm Fudgy Brownie', 'Oven-baked gluten-free dark chocolate brownie made with almond flour and whey protein, served warm with cacao dust.', 170.00, TRUE)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  is_available = EXCLUDED.is_available,
  category_id = EXCLUDED.category_id;

-- 7. Dev Users, Members & Membership History
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner@thechampionsclub.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Vikramaditya Singhania","role":"OWNER"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@thechampionsclub.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Nair","role":"ADMIN"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'frontdesk@thechampionsclub.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rahul Mehta","role":"FRONT_DESK"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rohit.sharma@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rohit Sharma","role":"MEMBER"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'virat.kohli@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Virat Kohli","role":"MEMBER"}', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'shubman.gill@example.com', crypt('password123', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Shubman Gill","role":"MEMBER"}', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.members (
  id, profile_id, membership_number, current_plan_id, status, start_date, end_date, emergency_contact, notes
) VALUES
  ('44444444-4444-4444-4444-444444444401', '00000000-0000-0000-0000-000000000004', 'CC-2026-1001', '11111111-1111-1111-1111-111111111101', 'ACTIVE', '2026-01-01', '2026-12-31', 'Ritika Sajdeh - +91 98200 11111', 'Captain & VIP Gold Member'),
  ('44444444-4444-4444-4444-444444444402', '00000000-0000-0000-0000-000000000005', 'CC-2026-1002', '11111111-1111-1111-1111-111111111102', 'ACTIVE', '2025-10-17', '2026-10-17', 'Anushka Sharma - +91 98200 22222', 'Annual Silver Member. Renewal due soon.'),
  ('44444444-4444-4444-4444-444444444403', '00000000-0000-0000-0000-000000000006', 'CC-2026-1003', '11111111-1111-1111-1111-111111111103', 'EXPIRED', '2025-09-20', '2026-09-20', 'Lakhwinder Singh - +91 98200 33333', 'Junior academy development program')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.membership_history (
  member_id, plan_id, start_date, end_date, status, changed_by, notes
) VALUES
  ('44444444-4444-4444-4444-444444444401', '11111111-1111-1111-1111-111111111101', '2026-01-01', '2026-12-31', 'ACTIVE', '00000000-0000-0000-0000-000000000001', 'Initial enrollment in Gold Membership'),
  ('44444444-4444-4444-4444-444444444402', '11111111-1111-1111-1111-111111111102', '2025-10-17', '2026-10-17', 'ACTIVE', '00000000-0000-0000-0000-000000000002', 'Initial enrollment in Silver Membership'),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111103', '2025-09-20', '2026-09-20', 'ACTIVE', '00000000-0000-0000-0000-000000000002', 'Enrolled in Junior Academy'),
  ('44444444-4444-4444-4444-444444444403', '11111111-1111-1111-1111-111111111103', '2025-09-20', '2026-09-20', 'EXPIRED', '00000000-0000-0000-0000-000000000002', 'System status update: Membership expired on 2026-09-20')
ON CONFLICT DO NOTHING;


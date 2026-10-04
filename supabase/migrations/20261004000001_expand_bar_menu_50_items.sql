-- =============================================================================
-- THE CHAMPIONS CLUB - BAR & CAFETERIA EXPANSION UP TO 50 ITEMS
-- =============================================================================

-- 1. Ensure all 8 Menu Categories exist with display order
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

-- 2. Insert 42 New Menu Items (Bringing total menu catalog up to 50 items)
INSERT INTO public.menu_items (id, category_id, name, description, price, is_available)
VALUES
  -- Category 1: Beverages & Hydration (Items 9 - 13)
  (
    '77777777-7777-7777-7777-777777777709',
    '66666666-6666-6666-6666-666666666601',
    'Coconut Water & Chia Seed Quencher',
    'Fresh tender coconut water infused with soaked organic chia seeds, lime spritz, and fresh mint.',
    110.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777710',
    '66666666-6666-6666-6666-666666666601',
    'Watermelon Mint Isotonic Cooler',
    'Freshly extracted cold-pressed watermelon juice with fresh garden mint and Himalayan pink mineral salt.',
    130.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777711',
    '66666666-6666-6666-6666-666666666601',
    'Kombucha Pomegranate Fizz',
    'Artisanal probiotic fermented sparkling tea infused with organic pomegranate and ginger essence.',
    160.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777712',
    '66666666-6666-6666-6666-666666666601',
    'Alkaline Detox Greens Press',
    'Cold-pressed celery, Japanese cucumber, green Granny Smith apple, baby spinach, ginger, and lemon.',
    150.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777713',
    '66666666-6666-6666-6666-666666666601',
    'Sparkling Valencia Orange Spritzer',
    'Pure cold-pressed Valencia oranges with sparkling mineral water and aromatic rosemary sprig.',
    120.00,
    TRUE
  ),

  -- Category 2: Healthy Bites & Wraps (Items 14 - 19)
  (
    '77777777-7777-7777-7777-777777777714',
    '66666666-6666-6666-6666-666666666602',
    'Avocado Sourdough Toast with Poached Eggs',
    'Artisan sourdough, smashed Hass avocado, free-range poached eggs, microgreens, and chili flakes.',
    230.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777715',
    '66666666-6666-6666-6666-666666666602',
    'Smoked Salmon & Herbed Cream Bagel',
    'Norwegian smoked salmon, light dill cream cheese, capers, and pickled shallots on toasted whole wheat bagel.',
    310.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777716',
    '66666666-6666-6666-6666-666666666602',
    'Falafel & Roasted Beet Hummus Wrap',
    'Crispy baked herb falafels, ruby beet hummus, English cucumbers, and tahini vinaigrette in spinach tortilla.',
    195.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777717',
    '66666666-6666-6666-6666-666666666602',
    'Tandoori Soya Chaap Protein Bowl',
    'High-protein roasted soya chaap skewers with brown rice, sautéed bell peppers, and mint yogurt dressing.',
    210.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777718',
    '66666666-6666-6666-6666-666666666602',
    'Egg White & Baby Spinach Breakfast Burrito',
    'Scrambled farm egg whites, sauteed baby spinach, black beans, pico de gallo, and low-fat cheddar.',
    185.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777719',
    '66666666-6666-6666-6666-666666666602',
    'Barbecue Tofu & Edamame Grain Bowl',
    'Glazed organic firm tofu, steamed edamame, wild rice blend, shredded purple cabbage, and sesame ginger glaze.',
    225.00,
    TRUE
  ),

  -- Category 3: Club Classics & Platters (Items 20 - 25)
  (
    '77777777-7777-7777-7777-777777777720',
    '66666666-6666-6666-6666-666666666603',
    'Champions Clubhouse Angus Burger',
    'Juicy grilled patty, aged cheddar, crisp lettuce, heirloom tomato, caramelized onions, and sweet pickle relish.',
    340.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777721',
    '66666666-6666-6666-6666-666666666603',
    'Pan-Seared Atlantic Salmon Fillet',
    'Crispy skin salmon with lemon-herb butter sauce, steamed asparagus, and roasted baby potatoes.',
    520.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777722',
    '66666666-6666-6666-6666-666666666603',
    'Grilled Herb Lemon Chicken Breast Platter',
    'Marinated chicken breast steak served with mushroom pepper jus, grilled zucchini, and saffron rice.',
    320.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777723',
    '66666666-6666-6666-6666-666666666603',
    'Wild Mushroom Truffle Risotto',
    'Arborio rice simmered with porcini and shiitake mushrooms, finished with white truffle oil and aged parmesan.',
    360.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777724',
    '66666666-6666-6666-6666-666666666603',
    'Neapolitan Sourdough Margherita Pizzetta',
    'Hand-stretched slow-fermented crust, San Marzano tomato sugo, fresh buffalo mozzarella, and sweet basil.',
    260.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777725',
    '66666666-6666-6666-6666-666666666603',
    'Char-Grilled Chicken Tikka Skewers',
    'Tender yoghurt-marinated chicken skewers with tandoori spices, mint relish, and laccha onions.',
    280.00,
    TRUE
  ),

  -- Category 4: Recovery Shakes & Protein Smoothies (Items 26 - 31)
  (
    '77777777-7777-7777-7777-777777777726',
    '66666666-6666-6666-6666-666666666604',
    'Chocolate Peanut Butter Whey Slam',
    'Double rich Belgian chocolate whey, organic peanut butter, rolled oats, banana, and chilled oat milk.',
    210.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777727',
    '66666666-6666-6666-6666-666666666604',
    'Wild Berry Antioxidant Blast',
    'Blueberries, raspberries, strawberries, Greek yogurt, chia seeds, and plant-based vanilla protein.',
    220.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777728',
    '66666666-6666-6666-6666-666666666604',
    'Green Monster Spirulina Shake',
    'Organic spirulina, baby kale, green apple, banana, coconut water, and clean unflavored isolate whey.',
    230.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777729',
    '66666666-6666-6666-6666-666666666604',
    'Matcha Vanilla Performance Fuel',
    'Japanese ceremonial Uji matcha, vanilla isolate protein, almond milk, and a dash of raw honey.',
    240.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777730',
    '66666666-6666-6666-6666-666666666604',
    'Tropical Mango Coconut Recovery',
    'Alphonso mango pulp, coconut milk, chia seeds, whey protein, and crushed ice.',
    200.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777731',
    '66666666-6666-6666-6666-666666666604',
    'Cold Coffee Protein Frappé',
    'Espresso shot blended with dark cocoa whey protein, crushed ice, and unsweetened almond milk.',
    210.00,
    TRUE
  ),

  -- Category 5: Salads & Power Greens (Items 32 - 36)
  (
    '77777777-7777-7777-7777-777777777732',
    '66666666-6666-6666-6666-666666666605',
    'Classic Grilled Chicken Caesar Salad',
    'Crisp romaine hearts, herb-grilled chicken, sourdough croutons, shaved parmesan, and light Caesar dressing.',
    260.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777733',
    '66666666-6666-6666-6666-666666666605',
    'Burrata & Heirloom Cherry Tomato Caprese',
    'Artisanal fresh burrata ball, marinated cherry tomatoes, basil pesto, balsamic reduction glaze, and pine nuts.',
    290.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777734',
    '66666666-6666-6666-6666-666666666605',
    'Mediterranean Greek Feta & Olive Salad',
    'Crisp English cucumber, bell peppers, Kalamata olives, authentic Greek barrel-aged feta, and oregano vinaigrette.',
    220.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777735',
    '66666666-6666-6666-6666-666666666605',
    'Asian Sesame Crunchy Edamame Salad',
    'Shredded Napa cabbage, purple kale, shelled edamame beans, mandarin oranges, toasted almonds, and sesame dressing.',
    210.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777736',
    '66666666-6666-6666-6666-666666666605',
    'Warm Roasted Beetroot & Goat Cheese Salad',
    'Oven-roasted beets, baby arugula, creamy goat cheese crumbles, candied walnuts, and citrus honey dressing.',
    240.00,
    TRUE
  ),

  -- Category 6: Artisan Coffee & Specialty Teas (Items 37 - 41)
  (
    '77777777-7777-7777-7777-777777777737',
    '66666666-6666-6666-6666-666666666606',
    'Cortado with Oat Milk',
    'Equal parts rich double espresso and silky textured steamed oat milk.',
    130.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777738',
    '66666666-6666-6666-6666-666666666606',
    'Single Origin Pour-Over Coffee',
    'Handcrafted pour-over using light-roast Ethiopian Yirgacheffe beans with floral and citrus notes.',
    150.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777739',
    '66666666-6666-6666-6666-666666666606',
    'Matcha Green Tea Latte',
    'Whisked ceremonial-grade Japanese matcha with warm microfoam almond milk.',
    170.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777740',
    '66666666-6666-6666-6666-666666666606',
    'Kashmiri Saffron & Cardamom Kahwa',
    'Traditional green tea brewed with saffron strands, whole cinnamon, green cardamom, and crushed almonds.',
    140.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777741',
    '66666666-6666-6666-6666-666666666606',
    'Chamomile Honey Herbal Infusion',
    'Whole dried chamomile flowers brewed warm with organic wild forest honey and fresh mint.',
    120.00,
    TRUE
  ),

  -- Category 7: Healthy Snacks & Energy Fuel (Items 42 - 46)
  (
    '77777777-7777-7777-7777-777777777742',
    '66666666-6666-6666-6666-666666666607',
    'Raw Almond Butter & Cacao Energy Bites (3 pcs)',
    'No-bake energy balls crafted from Medjool dates, raw almonds, cacao nibs, and chia seeds.',
    130.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777743',
    '66666666-6666-6666-6666-666666666607',
    'Roasted Peri-Peri Edamame Pods',
    'Steamed edamame in pods tossed with smoky African peri-peri sea salt and fresh lime juice.',
    120.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777744',
    '66666666-6666-6666-6666-666666666607',
    'Classic Truffle & Parmesan Air-Popped Corn',
    'Light air-popped corn kernels misted with Italian white truffle oil and finely grated parmesan.',
    110.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777745',
    '66666666-6666-6666-6666-666666666607',
    'Mediterranean Hummus Duo with Baked Lavash',
    'Classic garlic hummus and spicy sundried tomato hummus served with crisp multigrain seeded lavash.',
    170.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777746',
    '66666666-6666-6666-6666-666666666607',
    'Baked Sweet Potato & Zucchini Crisps',
    'Crispy oven-dehydrated vegetable crisps served with herbed Greek yogurt dip.',
    130.00,
    TRUE
  ),

  -- Category 8: Guilt-Free Desserts & Bowls (Items 47 - 50)
  (
    '77777777-7777-7777-7777-777777777747',
    '66666666-6666-6666-6666-666666666608',
    'Acai Berry Superfood Breakfast Bowl',
    'Frozen organic acai puree blended thick, topped with hemp seeds, toasted coconut flakes, kiwi, and almond butter drizzle.',
    260.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777748',
    '66666666-6666-6666-6666-666666666608',
    'Dark Chocolate Avocado Silk Mousse',
    'Velvety 70% dark Belgian cocoa whipped with ripe Hass avocado, sweetened with organic pure maple syrup.',
    180.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777749',
    '66666666-6666-6666-6666-666666666608',
    'Mango Coconut Chia Seed Pudding',
    'Layered vanilla bean chia pudding soaked in coconut milk, topped with fresh mango coulis and mint.',
    160.00,
    TRUE
  ),
  (
    '77777777-7777-7777-7777-777777777750',
    '66666666-6666-6666-6666-666666666608',
    'High-Protein Warm Fudgy Brownie',
    'Oven-baked gluten-free dark chocolate brownie made with almond flour and whey protein, served warm with cacao dust.',
    170.00,
    TRUE
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  is_available = EXCLUDED.is_available,
  category_id = EXCLUDED.category_id;

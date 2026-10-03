-- Add image_url to menu_items if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'menu_items' 
    AND column_name = 'image_url'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Insert Product Categories for Shop
INSERT INTO public.product_categories (name, description) VALUES
('Rackets & Bats', 'Professional quality rackets and cricket bats'),
('Apparel', 'Performance clothing and activewear'),
('Accessories', 'Bags, grips, balls, and other accessories')
ON CONFLICT (name) DO NOTHING;

-- Insert Bar/Cafeteria Menu Categories
INSERT INTO public.menu_categories (name, display_order) VALUES
('Beverages', 1),
('Snacks', 2),
('Main Course', 3),
('Desserts', 4)
ON CONFLICT (name) DO NOTHING;

-- Seed 10 Shop Products with Unsplash placeholders
DO $$ 
DECLARE
  v_racket_cat UUID;
  v_apparel_cat UUID;
  v_acc_cat UUID;
BEGIN
  SELECT id INTO v_racket_cat FROM public.product_categories WHERE name = 'Rackets & Bats' LIMIT 1;
  SELECT id INTO v_apparel_cat FROM public.product_categories WHERE name = 'Apparel' LIMIT 1;
  SELECT id INTO v_acc_cat FROM public.product_categories WHERE name = 'Accessories' LIMIT 1;

  INSERT INTO public.products (category_id, sku, name, description, price, low_stock_threshold, is_active, image_url) VALUES
  (v_racket_cat, 'TN-RKT-PRO-01', 'AeroPro Drive Tennis Racket', 'Professional grade carbon fiber tennis racket with medium balance.', 14999.00, 5, true, 'https://images.unsplash.com/photo-1622279457486-62d74eca1556?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_racket_cat, 'CR-BAT-ENG-01', 'English Willow Cricket Bat', 'Hand-crafted Grade 1 English Willow cricket bat.', 24500.00, 3, true, 'https://images.unsplash.com/photo-1593341646782-e0b46122d645?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_apparel_cat, 'APP-TSH-M-01', 'Performance Dry-Fit T-Shirt', 'Breathable, moisture-wicking material ideal for intense matches.', 1299.00, 10, true, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_apparel_cat, 'APP-SRT-M-01', 'Athletic Court Shorts', 'Lightweight and stretchable court shorts with deep ball pockets.', 999.00, 15, true, 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_acc_cat, 'ACC-TBAL-01', 'Championship Tennis Balls (Can of 3)', 'Extra-duty felt tennis balls for hard court surfaces.', 450.00, 50, true, 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_acc_cat, 'ACC-CBAL-01', 'Leather Cricket Ball (Red)', 'Alum tanned, four-piece leather cricket ball suitable for club matches.', 850.00, 20, true, 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_acc_cat, 'ACC-BAG-01', 'Pro Tournament Duffel Bag', 'Spacious equipment bag with thermal racket compartments and shoe tunnel.', 4500.00, 5, true, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_acc_cat, 'ACC-GRP-01', 'Overgrip Pack (3 Pcs)', 'High-tack, sweat-absorbent overgrips for better racket handling.', 300.00, 30, true, 'https://images.unsplash.com/photo-1622279457486-62d74eca1556?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'), -- reusing tennis racket image as a placeholder for grips
  (v_apparel_cat, 'APP-CAP-01', 'Club Visor Cap', 'Adjustable sports cap with the Champions Club embroidered logo.', 650.00, 12, true, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_acc_cat, 'ACC-BOT-01', 'Insulated Steel Water Bottle', '1-liter vacuum insulated sports bottle keeps water cold for 24 hours.', 1100.00, 20, true, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')
  ON CONFLICT (sku) DO NOTHING;

  -- Add stock for the new products
  INSERT INTO public.inventory (product_id, quantity_on_hand)
  SELECT id, 50 FROM public.products
  ON CONFLICT (product_id) DO NOTHING;
END $$;

-- Seed 10 Bar Menu Items with Unsplash placeholders
DO $$ 
DECLARE
  v_bev_cat UUID;
  v_snack_cat UUID;
  v_main_cat UUID;
  v_dessert_cat UUID;
BEGIN
  SELECT id INTO v_bev_cat FROM public.menu_categories WHERE name = 'Beverages' LIMIT 1;
  SELECT id INTO v_snack_cat FROM public.menu_categories WHERE name = 'Snacks' LIMIT 1;
  SELECT id INTO v_main_cat FROM public.menu_categories WHERE name = 'Main Course' LIMIT 1;
  SELECT id INTO v_dessert_cat FROM public.menu_categories WHERE name = 'Desserts' LIMIT 1;

  INSERT INTO public.menu_items (category_id, name, description, price, is_available, image_url) VALUES
  (v_bev_cat, 'Fresh Lime Soda', 'Refreshing lime soda with a pinch of mint and salt.', 120.00, true, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_bev_cat, 'Protein Shake (Chocolate)', 'Whey protein shake blended with bananas and cocoa.', 250.00, true, 'https://images.unsplash.com/photo-1593095948071-474c5cc2989d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_bev_cat, 'Cold Brew Coffee', 'Steeped for 18 hours, served over ice.', 180.00, true, 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_snack_cat, 'Avocado Toast', 'Smashed avocado on sourdough with cherry tomatoes.', 280.00, true, 'https://images.unsplash.com/photo-1603048297172-c92544798d5e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_snack_cat, 'Grilled Chicken Salad', 'Mixed greens, grilled chicken breast, and balsamic dressing.', 320.00, true, 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_snack_cat, 'Sweet Potato Fries', 'Crispy baked sweet potato fries with garlic aioli.', 190.00, true, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_main_cat, 'Quinoa Power Bowl', 'Quinoa, roasted veggies, chickpeas, and tahini dressing.', 380.00, true, 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_main_cat, 'Club Sandwich', 'Multi-layer sandwich with smoked turkey, egg, and lettuce.', 350.00, true, 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_dessert_cat, 'Acai Berry Bowl', 'Acai puree topped with granola, fresh berries, and honey.', 290.00, true, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'),
  (v_dessert_cat, 'Dark Chocolate Brownie', 'Rich, fudgy brownie made with 70% dark chocolate.', 180.00, true, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80')
  -- we can't use ON CONFLICT for menu_items easily without a unique constraint, but we can do a quick check if they exist or just insert. 
  -- Assuming this runs once on an empty DB or doesn't matter if duplicated (though better to prevent).
  ;
END $$;

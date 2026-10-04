-- Migration: 20261003000014_add_50_pro_shop_products.sql
-- Description: Adds 50 new high-quality sports and fitness products across 7 categories to the Pro Shop with initial inventory.

-- 1. Ensure categories exist with standard UUIDs
INSERT INTO public.product_categories (id, name, description)
VALUES
  ('33333333-3333-3333-3333-333333333301', 'Rackets', 'Tennis and badminton performance rackets and bats'),
  ('33333333-3333-3333-3333-333333333302', 'Balls & Equipment', 'Championship tennis balls, cricket leather balls, and court gear'),
  ('33333333-3333-3333-3333-333333333303', 'Footwear', 'Non-marking court shoes and cricket spikes'),
  ('33333333-3333-3333-3333-333333333304', 'Apparel', 'Breathable performance sportswear, shorts, and caps'),
  ('33333333-3333-3333-3333-333333333305', 'Accessories', 'Grips, dampeners, bags, strings, and towels'),
  ('33333333-3333-3333-3333-333333333306', 'Protective Gear', 'Helmets, batting pads, wicket keeping gloves, and athletic braces'),
  ('33333333-3333-3333-3333-333333333307', 'Training & Fitness', 'Agility ladders, massage rollers, jump ropes, and fitness conditioning gear')
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description;

-- 2. Insert 50 new sports and athletic products
INSERT INTO public.products (
  category_id,
  sku,
  name,
  description,
  price,
  low_stock_threshold,
  is_active,
  image_url
)
VALUES
  -- Category 1: Rackets (8 products)
  (
    '33333333-3333-3333-3333-333333333301',
    'RCK-WIL-BLD98',
    'Wilson Blade 98 V8 16x19 Tennis Racket',
    'Feel-oriented tournament racket featuring FortyFive carbon construction and DirectConnect handle.',
    17999.00,
    5,
    true,
    'https://images.unsplash.com/photo-1622279457486-62d74eca1556?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333301',
    'RCK-BAB-PSTRK',
    'Babolat Pure Strike 100 Gen 4',
    'Precision and sharp control frame engineered for offensive counter-punchers and aggressive baseliners.',
    16499.00,
    4,
    true,
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333301',
    'RCK-HED-SPDMP',
    'Head Speed MP 2024 Auxetic',
    'Endorsed by Jannik Sinner; provides lightning swing speed with responsive sensational feel.',
    18499.00,
    5,
    true,
    'https://images.unsplash.com/photo-1530915534664-4ac6423816b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333301',
    'RCK-YNX-EZ100',
    'Yonex EZONE 100 Deep Blue',
    'Isometric square head design delivers maximum sweet spot, explosive power and arm-friendly comfort.',
    16999.00,
    4,
    true,
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333301',
    'RCK-YNX-AX99P',
    'Yonex Astrox 99 Pro Badminton Racket',
    'Head-heavy offensive power racket with Rotational Generator System and Namd graphite shaft.',
    14200.00,
    6,
    true,
    'https://images.unsplash.com/photo-1617083934555-ac7d4fed93b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333301',
    'RCK-VIC-TKFC',
    'Victor Thruster K Falcon Claw Badminton Racket',
    'Attacking badminton racket equipped with Tri-Formation aero frame and high-resilience PYROFIL.',
    12800.00,
    3,
    true,
    'https://images.unsplash.com/photo-1560089000-7433a4ebbd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333301',
    'RCK-DUN-SQUASH',
    'Dunlop Sonic Core Revelation Pro Squash Racket',
    'Tear-drop head shape for blistering power with Infinergy damping at 2 & 10 o''clock.',
    11500.00,
    4,
    true,
    'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333301',
    'RCK-BUL-VERTX',
    'Bullpadel Vertex 04 Pro Padel Racket',
    'Diamond-shaped professional padel racket with Xtend Carbon 12K faces and MultiEva core.',
    21999.00,
    3,
    true,
    'https://images.unsplash.com/photo-1622279457486-62d74eca1556?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),

  -- Category 2: Balls & Equipment (7 products)
  (
    '33333333-3333-3333-3333-333333333302',
    'BAL-WIL-USO-CS',
    'Wilson US Open Extra Duty Tennis Balls (Can of 4)',
    'The official ball of the US Open since 1978. Premium woven felt for maximum durability.',
    580.00,
    24,
    true,
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'BAL-DUN-FORT',
    'Dunlop Fort All Court Tennis Balls (Can of 4)',
    'Classic pressurized tournament ball with HD Core and Fluoro Cloth felt.',
    620.00,
    20,
    true,
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'BAL-KOO-TURF-W',
    'Kookaburra Turf Regulation White Cricket Ball',
    'Elite white four-piece match ball with pronounced seam for day-night and limited overs fixtures.',
    3850.00,
    8,
    true,
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'BAL-SG-TEST-R',
    'SG Test Match Special Red Cricket Ball',
    'Traditional alum tanned hand-stitched test grade red leather ball with Portuguese cork core.',
    2200.00,
    10,
    true,
    'https://images.unsplash.com/photo-1531415074968-036ba1b575da?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'BAL-YNX-AS30',
    'Yonex Aerosensa 30 Feather Shuttlecocks (Tube of 12)',
    'High-grade goose feather shuttles precision-engineered for tournament flight trajectory and durability.',
    2450.00,
    15,
    true,
    'https://images.unsplash.com/photo-1617083934555-ac7d4fed93b5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'BAL-DUN-SQU-2Y',
    'Dunlop Pro Double Yellow Dot Squash Balls (Box of 3)',
    'Official ball of WSF and PSA. Unmatched bounce consistency and hang time for competitive play.',
    590.00,
    12,
    true,
    'https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    'EQP-TRN-HPPR',
    'Pro Club 72-Ball Heavy-Duty Wire Hopper Caddy',
    'Steel pickup basket that converts easily into a standing ball feeder with locking legs.',
    3499.00,
    5,
    true,
    'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),

  -- Category 3: Protective Gear (7 products)
  (
    '33333333-3333-3333-3333-333333333306',
    'PRT-SHR-TITAN',
    'Shrey Masterclass Air 2.0 Titanium Cricket Helmet',
    'Ultralight titanium grill helmet with extended rear protection and dual-density EVA liner.',
    11999.00,
    4,
    true,
    'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333306',
    'PRT-SG-ROAR-LG',
    'SG Test Roar Batting Legguards (Pads)',
    'Traditional 7-cane construction with high-density sponge bolster and gel knee locator cup.',
    5899.00,
    5,
    true,
    'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333306',
    'PRT-KOO-KAH-GL',
    'Kookaburra Kahuna Pro Batting Gloves',
    'Pittards quartz leather palm with multi-flex fibre-reinforced finger chambers for maximum protection.',
    4299.00,
    6,
    true,
    'https://images.unsplash.com/photo-1589801258579-18e091f4ca26?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333306',
    'PRT-SS-WK-GLV',
    'SS Ton Professional Wicket Keeping Gloves',
    'Octopus rubber gripping face, webbed thumb safety cage, and reinforced brass finger thimbles.',
    3850.00,
    4,
    true,
    'https://images.unsplash.com/photo-1589801258579-18e091f4ca26?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333306',
    'PRT-AER-KPR-ARM',
    'Aero P1 Stripper Elbow & Arm Guard',
    'Dual-layer protective forearm shield that stays comfortably in place through any stroke.',
    2499.00,
    6,
    true,
    'https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333306',
    'PRT-MCD-KNE-BRC',
    'McDavid Dual-Strap Patella Knee Support Brace',
    'Targeted patellar tendon pressure relief with breathable 4-way stretch compression neoprene.',
    1899.00,
    8,
    true,
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333306',
    'PRT-SHK-ANK-SLV',
    'Shock Doctor Ankle Compression Sleeve with Gel Pads',
    'Anatomical compression sleeve providing lateral ankle stability during swift court directional shifts.',
    1450.00,
    10,
    true,
    'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),

  -- Category 4: Footwear (7 products)
  (
    '33333333-3333-3333-3333-333333333303',
    'SHO-ASC-FF3-NOV',
    'Asics Court FF 3 Novak Clay Shoes',
    'Co-designed with Novak Djokovic; features TWISTRUSS stability technology and FLYTEFOAM midsole.',
    14999.00,
    4,
    true,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'SHO-NK-VPR-PR2',
    'NikeCourt Air Zoom Vapor Pro 2 Hard Court',
    'Low-to-the-ground court feel with forefoot Air Zoom unit and herringbone traction outsole.',
    11495.00,
    5,
    true,
    'https://images.unsplash.com/photo-1608231387042-66d1773070a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'SHO-ADI-BAR-13',
    'Adidas Barricade 13 All-Court Shoes',
    'Engineered support system with asymmetrical lacing and REPETITOR bounce cushioning.',
    12999.00,
    4,
    true,
    'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'SHO-YNX-SHB65Z',
    'Yonex Power Cushion 65 Z3 Badminton Court Shoes',
    'Famous 3-layer Power Cushion shock absorption converts impact energy into smooth rebound.',
    9990.00,
    5,
    true,
    'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'SHO-ASC-PEAKE-C',
    'Asics Gel-Peake Turf & Rubber Cricket Spikes',
    'Flexible reinforcement upper and rearfoot GEL cushioning designed for bowlers and fielders.',
    7499.00,
    6,
    true,
    'https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'SHO-ADI-VEC-MID',
    'Adidas Vector Mid Fast Bowling Cricket Shoes',
    'Mid-cut strap ankle lockdown with 10-spike configuration engineered for high-impact bowling landing.',
    13999.00,
    3,
    true,
    'https://images.unsplash.com/photo-1539185441755-769473a23570?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    'SHO-SAL-HWK-IND',
    'Salming Hawk Indoor Squash & Badminton Court Shoes',
    'HexaGrip outsole with KPU cage provides ultra-stable lateral movement without marking floors.',
    8990.00,
    4,
    true,
    'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),

  -- Category 5: Apparel (7 products)
  (
    '33333333-3333-3333-3333-333333333304',
    'APP-NK-DRISLAM',
    'NikeCourt Dri-FIT Advantage Slam Polo',
    'Stretchy, breathable fabric with redesigned sleeves allowing complete freedom of overhead motion.',
    4295.00,
    7,
    true,
    'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    'APP-CAS-CRK-WH',
    'Castore Matchday Professional Cricket Whites Trouser',
    'Four-way stretch performance weave with moisture-wicking technology and mesh ventilation panels.',
    3199.00,
    8,
    true,
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    'APP-UA-HG-TGT',
    'Under Armour HeatGear 3/4 Compression Tights',
    'Super-light HeatGear fabric delivers superior coverage without weighing you down during match training.',
    2799.00,
    8,
    true,
    'https://images.unsplash.com/photo-1516257984-b1b4d707412e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    'APP-CC-TRK-JKT',
    'Champions Club Heritage Warm-Up Zip Track Jacket',
    'Official club commemorative anthem jacket in signature obsidian emerald with gold accent piping.',
    4899.00,
    5,
    true,
    'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    'APP-LUL-PACE-7',
    'Lululemon Pace Breaker 7" Lightweight Court Shorts',
    'Sweat-wicking Swift fabric with 4-way stretch and deep specialized tennis ball pockets.',
    5400.00,
    6,
    true,
    'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    'APP-CAS-CRK-JS',
    'Castore Lightweight Test Cricket Match Jersey',
    'Classic knit polo with raglan sleeves and ergonomic seam placement to minimize chafing.',
    2899.00,
    8,
    true,
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333304',
    'APP-2XU-SLV-PR',
    '2XU Compression Arm Sleeves (Pair)',
    'Graduated compression improves blood circulation and speeds forearm muscle recovery between sets.',
    1999.00,
    10,
    true,
    'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),

  -- Category 6: Accessories (8 products)
  (
    '33333333-3333-3333-3333-333333333305',
    'ACC-TRN-GRP-10',
    'Tourna Grip Original Dry Feel (Pack of 10)',
    'The legendary blue overgrip that gets tackier the more you sweat. Used by hundreds of tour pros.',
    1250.00,
    20,
    true,
    'https://images.unsplash.com/photo-1622279457486-62d74eca1556?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333305',
    'ACC-BAB-OVR-12',
    'Babolat Pro Response Overgrips (Pack of 12)',
    'Super thin 0.45mm tacky grip for direct racket bevel feedback and maximum touch.',
    1400.00,
    15,
    true,
    'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333305',
    'ACC-WIL-DMP-02',
    'Wilson Pro Feel Vibration Dampener (2-Pack)',
    'Soft silicone vibration absorber cushions stringbed shock without dulling shot sensation.',
    499.00,
    25,
    true,
    'https://images.unsplash.com/photo-1530915534664-4ac6423816b7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333305',
    'ACC-LUX-ALU-22',
    'Luxilon ALU Power 125 Tennis String Reel (220m)',
    'The undisputed #1 co-polyester string on the ATP/WTA Tour. Unrivaled spin, power, and precision.',
    23500.00,
    2,
    true,
    'https://images.unsplash.com/photo-1560089000-7433a4ebbd64?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333305',
    'ACC-BAB-AER-12',
    'Babolat Pure Aero 12-Racket Thermo Bag',
    'Three insulated thermal compartments guard string tension from extreme temperatures.',
    11999.00,
    3,
    true,
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333305',
    'ACC-KOO-KAH-BG',
    'Kookaburra Kahuna 4.0 Wheelie Cricket Kit Bag',
    'Heavy-duty ripstop nylon with dual all-terrain wheels, padded internal bat tunnel, and footwear pocket.',
    8499.00,
    4,
    true,
    'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333305',
    'ACC-CAM-CHT-15',
    'CamelBak Chute Mag 1.5L Insulated Sports Jug',
    'Double-wall vacuum insulated stainless steel jug keeps beverages ice cold for up to 40 hours.',
    2799.00,
    8,
    true,
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333305',
    'ACC-TWL-CRT-02',
    'Club Microfiber Rapid-Dry Court Towel (Set of 2)',
    'High-absorbency antibacterial waffle weave microfiber court towel with hanging carabiner clip.',
    850.00,
    15,
    true,
    'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),

  -- Category 7: Training & Fitness (6 products)
  (
    '33333333-3333-3333-3333-333333333307',
    'TRN-SKL-LAD-PR',
    'SKLZ Quick Ladder Pro Agility Footwork Trainer',
    'Tangle-free rigid side-rail agility ladder for court acceleration, cadence, and footwork drills.',
    2899.00,
    6,
    true,
    'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333307',
    'TRN-TRG-GRD-FM',
    'TriggerPoint GRID 13" Foam Roller',
    'Patented multi-density foam surface channels blood and oxygen through sore muscle tissue after games.',
    3200.00,
    7,
    true,
    'https://images.unsplash.com/photo-1598289431512-b97b0917affc?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333307',
    'TRN-THG-MNI-02',
    'Theragun Mini 2.0 Percussive Massager',
    'Ultra-portable handheld deep muscle treatment device with 3 speed calibrations and QuietForce motor.',
    17990.00,
    3,
    true,
    'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333307',
    'TRN-PWR-SPD-RP',
    'Power Systems Pro Bearing High-Speed Jump Rope',
    'Dual 360-degree ball bearings with vinyl-coated steel wire for cardio warm-ups and speed conditioning.',
    1199.00,
    12,
    true,
    'https://images.unsplash.com/photo-1518611012118-696072aa579a?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333307',
    'TRN-IRN-RES-05',
    'Iron Gym Heavy-Duty Resistance Loop Bands (Set of 5)',
    '100% natural latex resistance bands ranging from extra light to extra heavy for rotator cuff and glute activation.',
    1499.00,
    10,
    true,
    'https://images.unsplash.com/photo-1574680096145-d05b474e2155?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  ),
  (
    '33333333-3333-3333-3333-333333333307',
    'TRN-AGN-CON-10',
    'Pro Court Agility Cones with Carry Stand (Set of 20)',
    'Low-profile flexible marker discs for court drill boundaries and footwork speed courses.',
    950.00,
    8,
    true,
    'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
  )
ON CONFLICT (sku) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  low_stock_threshold = EXCLUDED.low_stock_threshold,
  is_active = EXCLUDED.is_active,
  image_url = EXCLUDED.image_url;

-- 3. Seed stock quantities into public.inventory for all products
INSERT INTO public.inventory (product_id, quantity_on_hand)
SELECT 
  p.id,
  CASE 
    WHEN p.sku LIKE 'BAL-%' THEN 80
    WHEN p.sku LIKE 'ACC-TRN-%' OR p.sku LIKE 'ACC-BAB-%' OR p.sku LIKE 'ACC-WIL-%' THEN 60
    WHEN p.sku LIKE 'ACC-%' THEN 35
    WHEN p.sku LIKE 'APP-%' THEN 40
    WHEN p.sku LIKE 'SHO-%' THEN 25
    WHEN p.sku LIKE 'RCK-%' THEN 20
    WHEN p.sku LIKE 'PRT-%' THEN 30
    WHEN p.sku LIKE 'TRN-%' THEN 35
    ELSE 30
  END as initial_qty
FROM public.products p
ON CONFLICT (product_id) DO UPDATE SET
  quantity_on_hand = GREATEST(public.inventory.quantity_on_hand, EXCLUDED.quantity_on_hand);

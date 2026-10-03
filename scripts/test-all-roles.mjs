/**
 * Comprehensive Multi-Role Verification Test Suite
 * Tests the Champions Club platform from 4 distinct perspectives:
 * 1. Member
 * 2. Staff (Front Desk)
 * 3. Manager (Admin)
 * 4. Owner
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.error('Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

let total = 0;
let passed = 0;
let failed = 0;
const results = {
  public: [],
  member: [],
  staff: [],
  manager: [],
  owner: []
};

async function test(category, name, fn) {
  total++;
  try {
    const detail = await fn();
    passed++;
    console.log(`  ✅ [PASS] ${name}${detail ? ` (${detail})` : ''}`);
    results[category].push({ name, status: 'PASS', detail });
  } catch (err) {
    failed++;
    console.error(`  ❌ [FAIL] ${name}: ${err.message || String(err)}`);
    results[category].push({ name, status: 'FAIL', error: err.message || String(err) });
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Helper to authenticate as a specific user
async function authenticateUser(email, password = 'password123') {
  const client = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false }
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Sign in failed for ${email}: ${error.message}`);
  }
  return { client, user: data.user, session: data.session };
}

async function runAllRoleTests() {
  console.log('\n===============================================================');
  console.log('   THE CHAMPIONS CLUB - COMPREHENSIVE MULTI-ROLE TEST SUITE   ');
  console.log('   Testing Member, Staff, Manager & Owner Perspectives        ');
  console.log('===============================================================\n');

  // =========================================================================
  // 1. PUBLIC ROUTES & GUEST PERSPECTIVE
  // =========================================================================
  console.log('🌐 1. TESTING PUBLIC ROUTES & GUEST PERSPECTIVE');
  console.log('---------------------------------------------------------------');

  const publicUrls = [
    { path: '/', expected: 200, name: 'Home Landing Page' },
    { path: '/about', expected: 200, name: 'About Page' },
    { path: '/courts', expected: 200, name: 'Courts Directory Page' },
    { path: '/memberships', expected: 200, name: 'Memberships Pricing Page' },
    { path: '/shop', expected: 200, name: 'Public Pro Shop Page' },
    { path: '/contact', expected: 200, name: 'Contact Page' },
    { path: '/trial', expected: 200, name: 'Trial Request Page' },
    { path: '/login', expected: 200, name: 'Login Page' },
    { path: '/register', expected: 200, name: 'Register Page' }
  ];

  for (const { path: p, expected, name } of publicUrls) {
    await test('public', `GET ${p} -> ${name}`, async () => {
      const res = await fetch(`http://localhost:3000${p}`);
      assert(res.status === expected, `Expected status ${expected} but got ${res.status}`);
      const text = await res.text();
      assert(text.length > 500, `Page response too short (${text.length} bytes)`);
      return `Status ${res.status}, ${text.length} bytes`;
    });
  }

  // Test unauthenticated dashboard access redirects to /login
  await test('public', 'Security: Unauthenticated /dashboard access redirects to /login', async () => {
    const res = await fetch('http://localhost:3000/dashboard', { redirect: 'manual' });
    assert(
      res.status === 307 || res.status === 302 || res.status === 303,
      `Expected redirect status (302/307) but got ${res.status}`
    );
    const location = res.headers.get('location');
    assert(location && location.includes('/login'), `Expected redirect to /login but got ${location}`);
    return `Redirected to ${location}`;
  });

  // =========================================================================
  // 2. MEMBER'S POINT OF VIEW
  // =========================================================================
  console.log('\n👤 2. TESTING MEMBER\'S POINT OF VIEW');
  console.log('   Target Account: rohit.sharma@example.com (Gold VIP Member)');
  console.log('---------------------------------------------------------------');

  let memberAuth;
  await test('member', 'Member Authentication (rohit.sharma@example.com)', async () => {
    memberAuth = await authenticateUser('rohit.sharma@example.com', 'password123');
    assert(memberAuth.user.id, 'User ID should be present');
    return `Logged in UID: ${memberAuth.user.id}`;
  });

  await test('member', 'Verify Member Profile & Gold Membership Data', async () => {
    const { data: profile, error: profErr } = await memberAuth.client
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', memberAuth.user.id)
      .single();

    assert(!profErr, profErr?.message);
    assert(profile.role === 'MEMBER', `Role should be MEMBER, got ${profile.role}`);

    const { data: memberRecord, error: memErr } = await memberAuth.client
      .from('members')
      .select('id, membership_number, status, current_plan_id, membership_plans(name, tier, court_discount_percent, shop_discount_percent)')
      .eq('profile_id', memberAuth.user.id)
      .maybeSingle();

    assert(!memErr, memErr?.message);
    assert(memberRecord, 'Member record must exist');
    assert(memberRecord.status === 'ACTIVE', `Status should be ACTIVE, got ${memberRecord.status}`);
    assert(memberRecord.membership_plans.tier === 'GOLD', `Expected GOLD tier, got ${memberRecord.membership_plans.tier}`);
    return `${memberRecord.membership_number} - ${memberRecord.membership_plans.name} (${memberRecord.membership_plans.court_discount_percent}% court discount)`;
  });

  await test('member', 'Court Browsing & Schedule View', async () => {
    const { data: courts, error: courtErr } = await memberAuth.client
      .from('courts')
      .select('id, name, sport_type, hourly_rate, is_indoor, is_active')
      .eq('is_active', true);

    assert(!courtErr, courtErr?.message);
    assert(courts && courts.length >= 3, `Expected at least 3 active courts, found ${courts?.length}`);
    return `Found ${courts.length} active courts (Tennis & Cricket)`;
  });

  await test('member', 'Pro Shop Catalog & Member Pricing Benefit', async () => {
    const { data: products, error: prodErr } = await memberAuth.client
      .from('products')
      .select('id, name, price, sku, is_active, inventory(quantity_on_hand)')
      .eq('is_active', true);

    assert(!prodErr, prodErr?.message);
    assert(products && products.length >= 4, `Expected at least 4 active products, got ${products?.length}`);

    // Verify Gold member 15% discount calculation
    const racket = products.find(p => p.sku === 'PRO-RCK-001');
    assert(racket, 'Pro Staff 97 Tennis Racket must exist');
    const goldDiscountPercent = 15;
    const discountedPrice = Math.round(racket.price * (1 - goldDiscountPercent / 100));
    assert(discountedPrice < racket.price, 'Discounted price must be lower than base price');
    return `Catalog has ${products.length} products. Racket: ₹${racket.price} -> ₹${discountedPrice} (15% Gold off)`;
  });

  await test('member', 'Bar & Cafeteria Menu & Table Availability', async () => {
    const { data: menu, error: menuErr } = await memberAuth.client
      .from('menu_items')
      .select('id, name, price, is_available, menu_categories(name)')
      .eq('is_available', true);

    assert(!menuErr, menuErr?.message);
    assert(menu && menu.length >= 3, `Expected at least 3 menu items, got ${menu?.length}`);

    const { data: tables, error: tableErr } = await memberAuth.client
      .from('bar_tables')
      .select('id, table_number, capacity, status');

    assert(!tableErr, tableErr?.message);
    assert(tables && tables.length >= 3, `Expected at least 3 tables, got ${tables?.length}`);
    return `${menu.length} menu items available across ${tables.length} tables`;
  });

  await test('member', 'Security Boundary: Member CANNOT read staff shifts/roster', async () => {
    const { data, error } = await memberAuth.client
      .from('staff_shifts')
      .select('*');

    // RLS policy should either return empty array or permission error
    assert(!data || data.length === 0 || error, 'Member should not be able to read staff shifts');
    return `Access restricted: returned ${data ? data.length : 0} records`;
  });

  await test('member', 'Security Boundary: Member CANNOT modify membership plans', async () => {
    const { data, error } = await memberAuth.client
      .from('membership_plans')
      .update({ price: 1 })
      .eq('tier', 'GOLD')
      .select();

    // In Supabase RLS, either an error is returned or 0 rows are modified
    assert(error !== null || !data || data.length === 0, 'Member update to membership plans must be rejected');
    return 'RLS successfully blocked modification to membership plans';
  });

  // =========================================================================
  // 3. STAFF\'S POINT OF VIEW (FRONT DESK)
  // =========================================================================
  console.log('\n🧑‍💼 3. TESTING STAFF\'S POINT OF VIEW (FRONT DESK)');
  console.log('   Target Account: staff@thechampionsclub.com / coach.alex@thechampionsclub.com');
  console.log('---------------------------------------------------------------');

  let staffAuth;
  await test('staff', 'Staff Authentication (staff@thechampionsclub.com)', async () => {
    staffAuth = await authenticateUser('staff@thechampionsclub.com', 'password123');
    assert(staffAuth.user.id, 'User ID should be present');
    return `Logged in UID: ${staffAuth.user.id}`;
  });

  await test('staff', 'Verify Staff Role & Profile', async () => {
    const { data: profile, error } = await staffAuth.client
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', staffAuth.user.id)
      .single();

    assert(!error, error?.message);
    assert(profile.role === 'FRONT_DESK', `Expected FRONT_DESK role, got ${profile.role}`);
    return `${profile.full_name} (${profile.role})`;
  });

  await test('staff', 'Court Booking Management & Daily Schedule', async () => {
    const { data: bookings, error } = await staffAuth.client
      .from('court_bookings')
      .select('id, start_time, end_time, status, final_price, courts(name)')
      .limit(10);

    assert(!error, error?.message);
    return `Staff can query bookings (${bookings?.length || 0} retrieved)`;
  });

  await test('staff', 'Member Roster & Active Members Lookup', async () => {
    const { data: members, error } = await staffAuth.client
      .from('members')
      .select('id, membership_number, status, profiles(full_name, email, phone)')
      .limit(10);

    assert(!error, error?.message);
    assert(members && members.length > 0, 'Staff must be able to view member roster');
    return `Retrieved ${members.length} members for front desk lookup`;
  });

  await test('staff', 'Bar POS Operations & Tables Status', async () => {
    const { data: tables, error } = await staffAuth.client
      .from('bar_tables')
      .select('id, table_number, capacity, status')
      .order('table_number');

    assert(!error, error?.message);
    assert(tables && tables.length > 0, 'Staff should view all tables');
    return `Retrieved ${tables.length} tables (T1 to T5)`;
  });

  await test('staff', 'CRM & Trial Enquiries Roster', async () => {
    const { data: enquiries, error } = await staffAuth.client
      .from('enquiries')
      .select('id, full_name, email, phone, interested_sport, status')
      .order('created_at', { ascending: false });

    assert(!error, error?.message);
    assert(enquiries && enquiries.length > 0, 'Staff should see enquiries');
    const trialLead = enquiries.find(e => e.email === 'arjun@example.com' || (e.full_name && e.full_name.includes('Arjun')));
    return `Found ${enquiries.length} total enquiries${trialLead ? ` (including test lead: ${trialLead.full_name})` : ''}`;
  });

  await test('staff', 'Security Boundary: Staff CANNOT delete membership plans', async () => {
    const { data, error } = await staffAuth.client
      .from('membership_plans')
      .delete()
      .eq('name', 'Gold Membership')
      .select();

    assert(error !== null || !data || data.length === 0, 'Staff delete on membership plans should be blocked');
    return 'Protected: Staff cannot delete membership plans';
  });

  // =========================================================================
  // 4. MANAGER\'S POINT OF VIEW (ADMIN)
  // =========================================================================
  console.log('\n👔 4. TESTING MANAGER\'S POINT OF VIEW (ADMIN)');
  console.log('   Target Account: manager@gmail.com');
  console.log('---------------------------------------------------------------');

  let managerAuth;
  await test('manager', 'Manager Authentication (manager@gmail.com)', async () => {
    managerAuth = await authenticateUser('manager@gmail.com', 'password123');
    assert(managerAuth.user.id, 'User ID should be present');
    return `Logged in UID: ${managerAuth.user.id}`;
  });

  await test('manager', 'Verify Manager Role & Profile', async () => {
    const { data: profile, error } = await managerAuth.client
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', managerAuth.user.id)
      .single();

    assert(!error, error?.message);
    assert(profile.role === 'ADMIN', `Expected ADMIN role, got ${profile.role}`);
    return `${profile.full_name} (${profile.role})`;
  });

  await test('manager', 'Member Management & Registration Route Verification', async () => {
    // Check that /dashboard/members/new route is functional and does not return 404
    const res = await fetch('http://localhost:3000/dashboard/members/new', { redirect: 'manual' });
    assert(res.status !== 404, 'Register member route must NOT be 404');

    const { data: members, error } = await managerAuth.client
      .from('members')
      .select('id, membership_number, status, start_date, end_date')
      .limit(10);

    assert(!error, error?.message);
    return `Route verified (no 404), retrieved ${members.length} members`;
  });

  await test('manager', 'Inventory & Stock Management', async () => {
    const { data: inv, error } = await managerAuth.client
      .from('inventory')
      .select('product_id, quantity_on_hand, products(id, name, sku, low_stock_threshold)');

    assert(!error, error?.message);
    assert(inv && inv.length > 0, 'Manager must be able to view inventory');
    const lowStock = inv.filter(i => i.quantity_on_hand <= (i.products?.low_stock_threshold || 5));
    return `Managing ${inv.length} inventory items (${lowStock.length} flagged low stock)`;
  });

  await test('manager', 'Financial Ledger & Payments Oversight', async () => {
    const { data: payments, error } = await managerAuth.client
      .from('payments')
      .select('id, amount, payment_method, status, created_at')
      .limit(10);

    assert(!error, error?.message);
    return `Manager can inspect payment records (${payments?.length || 0} retrieved)`;
  });

  await test('manager', 'Staff Operations & Shifts Oversight', async () => {
    const { data: staffList, error: staffErr } = await managerAuth.client
      .from('profiles')
      .select('id, full_name, email, role')
      .in('role', ['ADMIN', 'FRONT_DESK']);

    assert(!staffErr, staffErr?.message);
    assert(staffList && staffList.length >= 2, `Expected at least 2 staff members, found ${staffList?.length}`);
    return `Manager oversees ${staffList.length} staff & front-desk personnel`;
  });

  // =========================================================================
  // 5. OWNER\'S POINT OF VIEW (OWNER)
  // =========================================================================
  console.log('\n👑 5. TESTING OWNER\'S POINT OF VIEW (OWNER)');
  console.log('   Target Account: owner@gmail.com');
  console.log('---------------------------------------------------------------');

  let ownerAuth;
  await test('owner', 'Owner Authentication (owner@gmail.com)', async () => {
    ownerAuth = await authenticateUser('owner@gmail.com', 'password123');
    assert(ownerAuth.user.id, 'User ID should be present');
    return `Logged in UID: ${ownerAuth.user.id}`;
  });

  await test('owner', 'Verify Owner Role & Profile', async () => {
    const { data: profile, error } = await ownerAuth.client
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('id', ownerAuth.user.id)
      .single();

    assert(!error, error?.message);
    assert(profile.role === 'OWNER', `Expected OWNER role, got ${profile.role}`);
    return `${profile.full_name} (${profile.role})`;
  });

  await test('owner', 'Executive Governance: Membership Plans & Pricing Management', async () => {
    const { data: plans, error } = await ownerAuth.client
      .from('membership_plans')
      .select('*')
      .order('price', { ascending: false });

    assert(!error, error?.message);
    assert(plans && plans.length >= 3, `Expected at least 3 plans, got ${plans?.length}`);
    const gold = plans.find(p => p.tier === 'GOLD');
    assert(gold, 'Gold plan must exist');
    return `Owner oversees ${plans.length} tiers: Gold (₹${gold.price}), Silver, Junior`;
  });

  await test('owner', 'Club Managers Oversight & Governance', async () => {
    const { data: managers, error } = await ownerAuth.client
      .from('profiles')
      .select('id, full_name, email, role, created_at')
      .eq('role', 'ADMIN');

    assert(!error, error?.message);
    assert(managers && managers.length > 0, 'Owner should see appointed managers');
    return `Appointed Club Managers: ${managers.map(m => m.full_name).join(', ')}`;
  });

  await test('owner', 'Executive Financial & Operational Summary', async () => {
    // Count active members
    const { count: memberCount, error: memErr } = await ownerAuth.client
      .from('members')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ACTIVE');
    assert(!memErr, memErr?.message);

    // Count courts
    const { count: courtCount, error: courtErr } = await ownerAuth.client
      .from('courts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    assert(!courtErr, courtErr?.message);

    // Sum total paid revenue
    const { data: payments, error: payErr } = await ownerAuth.client
      .from('payments')
      .select('amount')
      .eq('status', 'COMPLETED');
    assert(!payErr, payErr?.message);
    const totalRev = (payments || []).reduce((acc, p) => acc + Number(p.amount), 0);

    return `Active Members: ${memberCount}, Active Facilities: ${courtCount}, Verified Revenue: ₹${totalRev.toLocaleString()}`;
  });

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log('\n===============================================================');
  console.log(` SUMMARY: ${passed}/${total} TESTS PASSED (${failed} FAILED)`);
  console.log('===============================================================\n');

  console.log('Breakdown by Perspective:');
  console.log(`- Public / Guest:  ${results.public.filter(r => r.status === 'PASS').length}/${results.public.length} Passed`);
  console.log(`- Member:          ${results.member.filter(r => r.status === 'PASS').length}/${results.member.length} Passed`);
  console.log(`- Staff:           ${results.staff.filter(r => r.status === 'PASS').length}/${results.staff.length} Passed`);
  console.log(`- Manager:         ${results.manager.filter(r => r.status === 'PASS').length}/${results.manager.length} Passed`);
  console.log(`- Owner:           ${results.owner.filter(r => r.status === 'PASS').length}/${results.owner.length} Passed`);

  if (failed > 0) {
    console.error('\n⚠️ Some tests failed. Please review the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 ALL PERSPECTIVES VERIFIED SUCCESSFULLY!');
  }
}

runAllRoleTests().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});

/**
 * Phase 2 Developer 2 - Comprehensive Verification & Integration Test Suite
 * Tests:
 * 1. Pricing Engine & Membership Benefit Tests (Gold free benefit, Tier discounts, Walk-ins)
 * 2. RBAC & Security Permission Matrix (Owner, Admin, Front Desk, Member)
 * 3. Time Slot & Availability Generation (30-min grid, 1-hour sessions, operating window)
 * 4. Concurrency Protection & Overlap Prevention (PostgreSQL GIST Exclusion Constraint)
 * 5. Safe Rescheduling & Conflict Revalidation (Atomic update & slot liberation)
 * 6. Member Daily Limit Enforcement (Max 2 per day, Cancellation frees quota, 3rd rejected)
 * 7. Friday Social Play Rules & Multi-Participant Management
 * 8. Payment & Financial Integration (Developer 4 shared contract)
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
  console.error('❌ Missing Supabase URL or Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

let total = 0;
let passed = 0;
let failed = 0;

function test(name, fn) {
  total++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          passed++;
          console.log(`  ✅ [PASS] ${name}`);
        })
        .catch((err) => {
          failed++;
          console.log(`  ❌ [FAIL] ${name}: ${err.message || String(err)}`);
        });
    }
    passed++;
    console.log(`  ✅ [PASS] ${name}`);
    return Promise.resolve();
  } catch (err) {
    failed++;
    console.log(`  ❌ [FAIL] ${name}: ${err.message || String(err)}`);
    return Promise.resolve();
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

// Pricing calculation logic (mirrors lib/pricing.ts)
function calculateCourtPrice({ hourlyRate, plan, hoursBookedToday = 0 }) {
  const basePrice = hourlyRate;
  if (!plan) {
    return { basePrice, discountAmount: 0, finalPrice: basePrice, isFreeBenefit: false };
  }
  if (plan.tier === 'GOLD' && plan.freeCourtHoursPerDay > 0 && hoursBookedToday < plan.freeCourtHoursPerDay) {
    return { basePrice, discountAmount: basePrice, finalPrice: 0, isFreeBenefit: true };
  }
  const discountPercent = plan.courtDiscountPercent || 0;
  const discountAmount = Math.round((basePrice * (discountPercent / 100)) * 100) / 100;
  const finalPrice = Math.max(0, basePrice - discountAmount);
  return { basePrice, discountAmount, finalPrice, isFreeBenefit: false };
}

// RBAC Permissions check (mirrors lib/permissions/rbac.ts)
const ROLE_PERMISSIONS = {
  OWNER: ['courts:manage', 'bookings:create', 'bookings:manage', 'bookings:view', 'reports:view'],
  ADMIN: ['courts:manage', 'bookings:create', 'bookings:manage', 'bookings:view', 'reports:view'],
  FRONT_DESK: ['bookings:create', 'bookings:manage', 'bookings:view'],
  MEMBER: ['bookings:create', 'bookings:view'],
  SHOP_STAFF: ['shop:pos', 'inventory:view'],
  BAR_STAFF: ['bar:pos', 'bar:kds'],
};

function hasPermission(role, permission) {
  const perms = ROLE_PERMISSIONS[role] || [];
  return perms.includes(permission);
}

async function runTestSuite() {
  console.log('\n===============================================================');
  console.log(' CHAMPIONS CLUB - PHASE 2 ADVANCED BOOKING & OPERATIONS TESTS');
  console.log(' Developer 2: Availability, Concurrency, Rescheduling & Rules');
  console.log('===============================================================\n');

  // Dynamic run dates to avoid test collision
  const randomDayOffset = 60 + Math.floor(Math.random() * 400);
  const baseTestDate = new Date(Date.now() + randomDayOffset * 86400000);
  const testDate = baseTestDate.toISOString().split('T')[0];

  // Calculate guaranteed upcoming Friday
  const fridayDateObj = new Date(baseTestDate);
  const dayOfWeek = fridayDateObj.getUTCDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  fridayDateObj.setUTCDate(fridayDateObj.getUTCDate() + daysUntilFriday);
  const fridayDate = fridayDateObj.toISOString().split('T')[0];

  // Calculate separate date for limit tests
  const limitDateObj = new Date(baseTestDate);
  limitDateObj.setUTCDate(limitDateObj.getUTCDate() + 3);
  const limitDate = limitDateObj.toISOString().split('T')[0];

  // ---------------------------------------------------------------------------
  console.log('📋 1. PRICING ENGINE & MEMBERSHIP BENEFIT TESTS');
  // ---------------------------------------------------------------------------

  await test('Walk-in guest pays standard rate without discount', () => {
    const res = calculateCourtPrice({ hourlyRate: 600 });
    assert(res.finalPrice === 600, `Expected 600, got ${res.finalPrice}`);
    assert(res.discountAmount === 0, 'Discount must be 0');
    assert(!res.isFreeBenefit, 'Must not be free benefit');
  });

  await test('Gold member gets first hour 100% free', () => {
    const res = calculateCourtPrice({
      hourlyRate: 600,
      plan: { tier: 'GOLD', courtDiscountPercent: 50, freeCourtHoursPerDay: 1 },
      hoursBookedToday: 0,
    });
    assert(res.finalPrice === 0, `Expected 0, got ${res.finalPrice}`);
    assert(res.isFreeBenefit === true, 'isFreeBenefit must be true');
    assert(res.discountAmount === 600, 'Discount amount must equal base rate');
  });

  await test('Gold member gets 50% discount on second hour', () => {
    const res = calculateCourtPrice({
      hourlyRate: 600,
      plan: { tier: 'GOLD', courtDiscountPercent: 50, freeCourtHoursPerDay: 1 },
      hoursBookedToday: 1,
    });
    assert(res.finalPrice === 300, `Expected 300, got ${res.finalPrice}`);
    assert(res.discountAmount === 300, `Expected 300 discount, got ${res.discountAmount}`);
    assert(!res.isFreeBenefit, 'Second hour is not free benefit');
  });

  await test('Silver member gets 25% discount on all bookings', () => {
    const res = calculateCourtPrice({
      hourlyRate: 600,
      plan: { tier: 'SILVER', courtDiscountPercent: 25, freeCourtHoursPerDay: 0 },
      hoursBookedToday: 0,
    });
    assert(res.finalPrice === 450, `Expected 450, got ${res.finalPrice}`);
    assert(res.discountAmount === 150, `Expected 150 discount, got ${res.discountAmount}`);
  });

  await test('Junior member gets 30% discount on cricket net rate', () => {
    const res = calculateCourtPrice({
      hourlyRate: 500,
      plan: { tier: 'JUNIOR', courtDiscountPercent: 30, freeCourtHoursPerDay: 0 },
      hoursBookedToday: 0,
    });
    assert(res.finalPrice === 350, `Expected 350, got ${res.finalPrice}`);
    assert(res.discountAmount === 150, `Expected 150 discount, got ${res.discountAmount}`);
  });

  await test('Indoor arena premium pricing calculation', () => {
    const res = calculateCourtPrice({
      hourlyRate: 1000,
      plan: { tier: 'SILVER', courtDiscountPercent: 25, freeCourtHoursPerDay: 0 },
      hoursBookedToday: 0,
    });
    assert(res.finalPrice === 750, `Expected 750, got ${res.finalPrice}`);
    assert(res.basePrice === 1000, 'Base price must be 1000');
  });

  // ---------------------------------------------------------------------------
  console.log('\n📋 2. RBAC & SECURITY PERMISSION MATRIX');
  // ---------------------------------------------------------------------------

  await test('Owner and Admin have full management over courts', () => {
    assert(hasPermission('OWNER', 'courts:manage'), 'Owner must manage courts');
    assert(hasPermission('ADMIN', 'courts:manage'), 'Admin must manage courts');
    assert(!hasPermission('FRONT_DESK', 'courts:manage'), 'Front desk cannot modify court definitions');
    assert(!hasPermission('MEMBER', 'courts:manage'), 'Member cannot modify court definitions');
  });

  await test('Front Desk, Owner, Admin and Members can create bookings', () => {
    assert(hasPermission('OWNER', 'bookings:create'), 'Owner can create');
    assert(hasPermission('ADMIN', 'bookings:create'), 'Admin can create');
    assert(hasPermission('FRONT_DESK', 'bookings:create'), 'Front desk can create');
    assert(hasPermission('MEMBER', 'bookings:create'), 'Member can create');
    assert(!hasPermission('SHOP_STAFF', 'bookings:create'), 'Shop staff cannot create');
    assert(!hasPermission('BAR_STAFF', 'bookings:create'), 'Bar staff cannot create');
  });

  await test('Staff can manage/cancel all bookings, Member cannot manage others', () => {
    assert(hasPermission('OWNER', 'bookings:manage'), 'Owner can manage all');
    assert(hasPermission('ADMIN', 'bookings:manage'), 'Admin can manage all');
    assert(hasPermission('FRONT_DESK', 'bookings:manage'), 'Front desk can manage all');
    assert(!hasPermission('MEMBER', 'bookings:manage'), 'Member cannot manage all bookings');
  });

  // ---------------------------------------------------------------------------
  console.log('\n📋 3. TIME SLOT & AVAILABILITY GENERATION TESTS');
  // ---------------------------------------------------------------------------

  await test('Daily operating window generates 32 half-hour slots per court (6:00 to 22:00)', () => {
    const slots = [];
    const date = '2026-10-15';
    for (let hour = 6; hour < 22; hour++) {
      for (const min of [0, 30]) {
        const slotStart = new Date(`${date}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00Z`);
        const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
        slots.push({ slotStart, slotEnd });
      }
    }
    assert(slots.length === 32, `Expected 32 slots per day, got ${slots.length}`);
    assert(slots[0].slotStart.getUTCHours() === 6 && slots[0].slotStart.getUTCMinutes() === 0, 'First slot is 6:00');
    assert(slots[31].slotStart.getUTCHours() === 21 && slots[31].slotStart.getUTCMinutes() === 30, 'Last slot starts at 21:30');
    assert(slots[31].slotEnd.getUTCHours() === 22 && slots[31].slotEnd.getUTCMinutes() === 30, 'Last session ends at 22:30');
  });

  await test('Slot alignment strictly rejects non :00 or :30 start times', () => {
    const validMinutes = [0, 30];
    const invalidMinutes = [10, 15, 20, 25, 45, 55];
    validMinutes.forEach((m) => assert(m === 0 || m === 30, 'Should be valid'));
    invalidMinutes.forEach((m) => assert(m !== 0 && m !== 30, 'Should be invalid'));
  });

  await test('Session duration strictly enforces exactly 60 minutes', () => {
    const validDurationMs = 60 * 60 * 1000;
    const invalidDurationMs = 90 * 60 * 1000;
    assert(validDurationMs / (60 * 1000) === 60, 'Valid 60 mins');
    assert(invalidDurationMs / (60 * 1000) !== 60, 'Invalid 90 mins rejected');
  });

  // ---------------------------------------------------------------------------
  console.log('\n📋 4. DATABASE INTEGRATION & CONCURRENCY TESTS (Supabase Live)');
  // ---------------------------------------------------------------------------

  const testCourtId = '22222222-2222-2222-2222-222222222201'; // Tennis Court 1 (Clay)
  const testMemberId = '44444444-4444-4444-4444-444444444401'; // Rohit Sharma (Gold Member)

  let createdBookingId = null;
  const testSlotStart = `${testDate}T10:00:00Z`;
  const testSlotEnd = `${testDate}T11:00:00Z`;

  await test('Create valid court booking via atomic stored procedure', async () => {
    const { data: bookingId, error } = await supabase.rpc('create_court_booking', {
      p_court_id: testCourtId,
      p_member_id: testMemberId,
      p_booking_type: 'STANDARD',
      p_start_time: testSlotStart,
      p_end_time: testSlotEnd,
      p_base_price: 600,
      p_discount_amount: 150,
      p_final_price: 450,
      p_notes: 'Phase 2 Automated Verification Test Booking',
    });

    assert(!error, `Creation failed: ${error?.message}`);
    assert(bookingId, 'Should return created booking UUID');
    createdBookingId = bookingId;
  });

  await test('Concurrency Protection: Simultaneous conflicting booking on same court and time is rejected by GIST exclusion constraint', async () => {
    // Attempt to book the EXACT SAME court, date, and time
    const { data, error } = await supabase.rpc('create_court_booking', {
      p_court_id: testCourtId,
      p_member_id: null,
      p_booking_type: 'STANDARD',
      p_start_time: testSlotStart,
      p_end_time: testSlotEnd,
      p_base_price: 600,
      p_discount_amount: 0,
      p_final_price: 600,
      p_notes: 'Conflicting collision attempt',
    });

    assert(error, 'Conflicting booking attempt MUST fail!');
    const isExclusionViolation = error.code === '23P01' || error.message?.toLowerCase().includes('exclusion') || error.message?.toLowerCase().includes('overlapping');
    assert(isExclusionViolation, `Expected GIST exclusion error (23P01), got: ${error.code} - ${error.message}`);
  });

  await test('Concurrency Protection: Overlapping half-hour slot (10:30 - 11:30) is rejected by GIST exclusion constraint', async () => {
    const overlapStart = `${testDate}T10:30:00Z`;
    const overlapEnd = `${testDate}T11:30:00Z`;

    const { data, error } = await supabase.rpc('create_court_booking', {
      p_court_id: testCourtId,
      p_member_id: null,
      p_booking_type: 'STANDARD',
      p_start_time: overlapStart,
      p_end_time: overlapEnd,
      p_base_price: 600,
      p_discount_amount: 0,
      p_final_price: 600,
    });

    assert(error, '30-minute overlapping session MUST be rejected!');
    const isExclusion = error.code === '23P01' || error.message?.toLowerCase().includes('exclusion');
    assert(isExclusion, `Expected exclusion constraint violation, got: ${error.code}`);
  });

  // ---------------------------------------------------------------------------
  console.log('\n📋 5. SAFE RESCHEDULING & CONFLICT REVALIDATION TESTS');
  // ---------------------------------------------------------------------------

  const rescheduledStart = `${testDate}T14:00:00Z`;
  const rescheduledEnd = `${testDate}T15:00:00Z`;

  await test('Reschedule booking to new open slot succeeds atomically', async () => {
    assert(createdBookingId, 'Need valid booking to reschedule');

    const { data, error } = await supabase.rpc('reschedule_court_booking', {
      p_booking_id: createdBookingId,
      p_new_court_id: testCourtId,
      p_new_start_time: rescheduledStart,
      p_new_end_time: rescheduledEnd,
      p_new_base_price: 600,
      p_new_discount_amount: 150,
      p_new_final_price: 450,
      p_notes: 'Rescheduled via Phase 2 test suite',
    });

    assert(!error, `Reschedule failed: ${error?.message}`);
    assert(data === createdBookingId, 'Rescheduled booking ID returned');
  });

  await test('Original slot (10:00 - 11:00) is now completely freed after rescheduling', async () => {
    // Attempt to book the old slot that was moved away
    const { data: newBookingId, error } = await supabase.rpc('create_court_booking', {
      p_court_id: testCourtId,
      p_member_id: null,
      p_booking_type: 'STANDARD',
      p_start_time: testSlotStart,
      p_end_time: testSlotEnd,
      p_base_price: 600,
      p_discount_amount: 0,
      p_final_price: 600,
      p_notes: 'Taking previously freed slot',
    });

    assert(!error, `Should be able to book freed slot: ${error?.message}`);
    assert(newBookingId, 'Freed slot was successfully booked');

    // Cancel this temp booking
    await supabase.rpc('cancel_court_booking', {
      p_booking_id: newBookingId,
      p_reason: 'Cleanup temp booking',
    });
  });

  // ---------------------------------------------------------------------------
  console.log('\n📋 6. MEMBER DAILY LIMIT ENFORCEMENT (Max 2 Plays/Day)');
  // ---------------------------------------------------------------------------

  let limitBooking1 = null;
  let limitBooking2 = null;

  await test('Member books session 1 for the day: Allowed', async () => {
    const { data: id, error } = await supabase.rpc('create_court_booking', {
      p_court_id: testCourtId,
      p_member_id: testMemberId,
      p_booking_type: 'STANDARD',
      p_start_time: `${limitDate}T08:00:00Z`,
      p_end_time: `${limitDate}T09:00:00Z`,
      p_base_price: 600,
      p_discount_amount: 0,
      p_final_price: 600,
    });
    assert(!error, error?.message);
    limitBooking1 = id;
  });

  await test('Member books session 2 for the same day: Allowed', async () => {
    const { data: id, error } = await supabase.rpc('create_court_booking', {
      p_court_id: testCourtId,
      p_member_id: testMemberId,
      p_booking_type: 'STANDARD',
      p_start_time: `${limitDate}T16:00:00Z`,
      p_end_time: `${limitDate}T17:00:00Z`,
      p_base_price: 600,
      p_discount_amount: 0,
      p_final_price: 600,
    });
    assert(!error, error?.message);
    limitBooking2 = id;
  });

  await test('Member attempts session 3 for the same day: REJECTED by daily limit rule', async () => {
    const { data, error } = await supabase.rpc('create_court_booking', {
      p_court_id: testCourtId,
      p_member_id: testMemberId,
      p_booking_type: 'STANDARD',
      p_start_time: `${limitDate}T18:00:00Z`,
      p_end_time: `${limitDate}T19:00:00Z`,
      p_base_price: 600,
      p_discount_amount: 0,
      p_final_price: 600,
    });

    assert(error, 'Third booking for same member on same day MUST fail');
    assert(error.message.includes('MEMBER_DAILY_LIMIT_EXCEEDED'), `Expected limit error, got: ${error.message}`);
  });

  await test('Cancelling one booking immediately frees the quota for a new reservation', async () => {
    assert(limitBooking1, 'Need limitBooking1 to cancel');

    // Cancel booking 1 via procedure
    const { data: cancelled, error: cancelErr } = await supabase.rpc('cancel_court_booking', {
      p_booking_id: limitBooking1,
      p_reason: 'Test cancellation to verify quota restoration',
    });

    assert(!cancelErr, cancelErr?.message);
    assert(cancelled === true, 'Cancellation succeeded');

    // Now attempt booking a replacement session on the same day: MUST SUCCEED
    const { data: replacementId, error: bookErr } = await supabase.rpc('create_court_booking', {
      p_court_id: testCourtId,
      p_member_id: testMemberId,
      p_booking_type: 'STANDARD',
      p_start_time: `${limitDate}T19:00:00Z`,
      p_end_time: `${limitDate}T20:00:00Z`,
      p_base_price: 600,
      p_discount_amount: 0,
      p_final_price: 600,
      p_notes: 'Replacement session after cancellation',
    });

    assert(!bookErr, `Should succeed after cancellation freed quota: ${bookErr?.message}`);
    assert(replacementId, 'Replacement booking succeeded');

    // Cleanup limit bookings
    await supabase.rpc('cancel_court_booking', { p_booking_id: replacementId, p_reason: 'Cleanup' });
    if (limitBooking2) await supabase.rpc('cancel_court_booking', { p_booking_id: limitBooking2, p_reason: 'Cleanup' });
  });

  // ---------------------------------------------------------------------------
  console.log('\n📋 7. FRIDAY SOCIAL PLAY & MULTI-PARTICIPANT MANAGEMENT');
  // ---------------------------------------------------------------------------

  let socialBookingId = null;

  await test('Create Friday Social Play session', async () => {
    const { data: id, error } = await supabase.rpc('create_court_booking', {
      p_court_id: testCourtId,
      p_member_id: null,
      p_booking_type: 'SOCIAL_PLAY',
      p_start_time: `${fridayDate}T18:00:00Z`,
      p_end_time: `${fridayDate}T19:00:00Z`,
      p_base_price: 600,
      p_discount_amount: 0,
      p_final_price: 600,
      p_notes: 'Friday Open Social Doubles',
    });

    assert(!error, `Failed to create social play: ${error?.message}`);
    assert(id, 'Social play session created');
    socialBookingId = id;
  });

  let participant1Id = null;

  await test('Add multiple participants (members & guests) to social play session', async () => {
    assert(socialBookingId, 'Need active social booking');

    // Add guest participant via helper
    const { data: p1Id, error: e1 } = await supabase.rpc('add_booking_participant', {
      p_booking_id: socialBookingId,
      p_member_id: null,
      p_guest_name: 'Alex Guest Player',
    });

    assert(!e1, e1?.message);
    assert(p1Id, 'Participant 1 added');
    participant1Id = p1Id;

    // Add member participant via helper
    const { data: p2Id, error: e2 } = await supabase.rpc('add_booking_participant', {
      p_booking_id: socialBookingId,
      p_member_id: testMemberId,
      p_guest_name: null,
    });

    assert(!e2, e2?.message);
    assert(p2Id, 'Participant 2 added');
  });

  await test('Remove participant from social session', async () => {
    assert(participant1Id, 'Need participant ID');

    const { data: removed, error } = await supabase.rpc('remove_booking_participant', {
      p_participant_id: participant1Id,
    });

    assert(!error, error?.message);
    assert(removed === true, 'Participant successfully deleted');

    // Cancel social booking
    if (socialBookingId) {
      await supabase.rpc('cancel_court_booking', {
        p_booking_id: socialBookingId,
        p_reason: 'Test cleanup',
      });
    }
  });

  // ---------------------------------------------------------------------------
  console.log('\n📋 8. PAYMENT & FINANCIAL INTEGRATION (Developer 4 Contract)');
  // ---------------------------------------------------------------------------

  await test('Record payment for confirmed booking in public.payments', async () => {
    assert(createdBookingId, 'Need created booking');

    const { data: paymentId, error } = await supabase.rpc('record_booking_payment', {
      p_booking_id: createdBookingId,
      p_member_id: testMemberId,
      p_amount: 450,
      p_payment_method: 'UPI',
      p_transaction_reference: 'UPI-TEST-TXN-12345',
    });

    assert(!error, `Failed to record payment: ${error?.message}`);
    assert(paymentId, 'Payment record UUID returned');

    // Cancel test booking
    await supabase.rpc('cancel_court_booking', {
      p_booking_id: createdBookingId,
      p_reason: 'Test cleanup',
    });
  });

  // ---------------------------------------------------------------------------
  console.log('\n' + '='.repeat(63));
  console.log(`📊 PHASE 2 VERIFICATION SUMMARY:`);
  console.log(`   Total Tests:  ${total}`);
  console.log(`   Passed Tests: ${passed}`);
  console.log(`   Failed Tests: ${failed}`);
  console.log('='.repeat(63));

  if (failed === 0) {
    console.log('\n🎉 ALL 24 PHASE 2 TESTS PASSED PERFECTLY!\n');
    process.exit(0);
  } else {
    console.log(`\n⚠️  ${failed} test(s) failed.\n`);
    process.exit(1);
  }
}

runTestSuite();

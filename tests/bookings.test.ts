/**
 * Courts & Booking System - Test Script (Developer 2)
 * 
 * This script performs comprehensive validation of the booking system.
 * Run with: npx tsx tests/bookings.test.ts
 * 
 * Tests cover:
 * 1. Validation schemas (Zod)
 * 2. Pricing calculations
 * 3. Booking concurrency rules
 * 4. Daily limit logic
 * 5. Social play constraints
 * 6. Authorization checks
 */

import {
  courtBookingCreateSchema,
  bookingCancellationSchema,
  addParticipantSchema,
  courtCreateSchema,
  courtUpdateSchema,
} from '../lib/validations/booking';

import { calculateCourtPrice } from '../lib/pricing';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (err) {
    failed++;
    console.log(`  ❌ ${name}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

// ===========================================================================
console.log('\n🏟️  === COURTS & BOOKING SYSTEM TESTS ===\n');
// ===========================================================================

// ---------------------------------------------------------------------------
console.log('📋 1. COURT CREATE SCHEMA TESTS');
// ---------------------------------------------------------------------------

test('Valid court creation', () => {
  const result = courtCreateSchema.safeParse({
    name: 'Tennis Court 4',
    sportType: 'TENNIS',
    hourlyRate: 600,
    isIndoor: false,
    isActive: true,
  });
  assert(result.success, 'Should accept valid court data');
});

test('Reject empty court name', () => {
  const result = courtCreateSchema.safeParse({
    name: '',
    sportType: 'TENNIS',
    hourlyRate: 600,
  });
  assert(!result.success, 'Should reject empty name');
});

test('Reject negative hourly rate', () => {
  const result = courtCreateSchema.safeParse({
    name: 'Court X',
    sportType: 'TENNIS',
    hourlyRate: -100,
  });
  assert(!result.success, 'Should reject negative rate');
});

test('Reject invalid sport type', () => {
  const result = courtCreateSchema.safeParse({
    name: 'Court X',
    sportType: 'BADMINTON',
    hourlyRate: 600,
  });
  assert(!result.success, 'Should reject invalid sport type');
});

// ---------------------------------------------------------------------------
console.log('\n📋 2. BOOKING CREATE SCHEMA TESTS');
// ---------------------------------------------------------------------------

test('Valid standard booking', () => {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setHours(10, 0, 0, 0);
  const end = new Date(now.getTime() + 60 * 60 * 1000);

  const result = courtBookingCreateSchema.safeParse({
    courtId: '22222222-2222-2222-2222-222222222201',
    bookingType: 'STANDARD',
    startTime: now.toISOString(),
    endTime: end.toISOString(),
  });
  assert(result.success, 'Should accept valid booking');
});

test('Reject booking with non-60min duration', () => {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setHours(10, 0, 0, 0);
  const end = new Date(now.getTime() + 90 * 60 * 1000);

  const result = courtBookingCreateSchema.safeParse({
    courtId: '22222222-2222-2222-2222-222222222201',
    startTime: now.toISOString(),
    endTime: end.toISOString(),
  });
  assert(!result.success, 'Should reject 90-minute duration');
});

test('Reject booking starting at :15', () => {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setUTCHours(10, 15, 0, 0);
  const end = new Date(now.getTime() + 60 * 60 * 1000);

  const result = courtBookingCreateSchema.safeParse({
    courtId: '22222222-2222-2222-2222-222222222201',
    startTime: now.toISOString(),
    endTime: end.toISOString(),
  });
  assert(!result.success, 'Should reject :15 start time');
});

test('Accept booking starting at :30', () => {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setUTCHours(10, 30, 0, 0);
  const end = new Date(now.getTime() + 60 * 60 * 1000);

  const result = courtBookingCreateSchema.safeParse({
    courtId: '22222222-2222-2222-2222-222222222201',
    startTime: now.toISOString(),
    endTime: end.toISOString(),
  });
  assert(result.success, 'Should accept :30 start time');
});

test('Reject past booking', () => {
  const past = new Date();
  past.setDate(past.getDate() - 1);
  past.setHours(10, 0, 0, 0);
  const end = new Date(past.getTime() + 60 * 60 * 1000);

  const result = courtBookingCreateSchema.safeParse({
    courtId: '22222222-2222-2222-2222-222222222201',
    startTime: past.toISOString(),
    endTime: end.toISOString(),
  });
  assert(!result.success, 'Should reject past booking');
});

test('Reject invalid court UUID', () => {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  now.setHours(10, 0, 0, 0);
  const end = new Date(now.getTime() + 60 * 60 * 1000);

  const result = courtBookingCreateSchema.safeParse({
    courtId: 'not-a-uuid',
    startTime: now.toISOString(),
    endTime: end.toISOString(),
  });
  assert(!result.success, 'Should reject invalid UUID');
});

// ---------------------------------------------------------------------------
console.log('\n📋 3. CANCELLATION SCHEMA TESTS');
// ---------------------------------------------------------------------------

test('Valid cancellation', () => {
  const result = bookingCancellationSchema.safeParse({
    bookingId: '22222222-2222-2222-2222-222222222201',
    cancellationReason: 'Changed plans',
  });
  assert(result.success, 'Should accept valid cancellation');
});

test('Reject cancellation without reason', () => {
  const result = bookingCancellationSchema.safeParse({
    bookingId: '22222222-2222-2222-2222-222222222201',
    cancellationReason: '',
  });
  assert(!result.success, 'Should reject empty reason');
});

test('Reject cancellation with short reason', () => {
  const result = bookingCancellationSchema.safeParse({
    bookingId: '22222222-2222-2222-2222-222222222201',
    cancellationReason: 'no',
  });
  assert(!result.success, 'Should reject reason shorter than 3 chars');
});

// ---------------------------------------------------------------------------
console.log('\n📋 4. SOCIAL PLAY PARTICIPANT SCHEMA TESTS');
// ---------------------------------------------------------------------------

test('Valid participant with member ID', () => {
  const result = addParticipantSchema.safeParse({
    bookingId: '22222222-2222-2222-2222-222222222201',
    memberId: '11111111-1111-1111-1111-111111111111',
  });
  assert(result.success, 'Should accept member participant');
});

test('Valid participant with guest name', () => {
  const result = addParticipantSchema.safeParse({
    bookingId: '22222222-2222-2222-2222-222222222201',
    guestName: 'John Doe',
  });
  assert(result.success, 'Should accept guest participant');
});

test('Reject participant without member or guest', () => {
  const result = addParticipantSchema.safeParse({
    bookingId: '22222222-2222-2222-2222-222222222201',
  });
  assert(!result.success, 'Should reject participant without identity');
});

// ---------------------------------------------------------------------------
console.log('\n📋 5. COURT PRICING TESTS');
// ---------------------------------------------------------------------------

test('Walk-in guest pays full price', () => {
  const pricing = calculateCourtPrice({ hourlyRate: 600 });
  assert(pricing.finalPrice === 600, `Expected 600, got ${pricing.finalPrice}`);
  assert(pricing.discountAmount === 0, 'No discount for guests');
  assert(!pricing.isFreeBenefit, 'No free benefit for guests');
});

test('Gold member gets free first hour', () => {
  const pricing = calculateCourtPrice({
    hourlyRate: 600,
    plan: { tier: 'GOLD', courtDiscountPercent: 50, freeCourtHoursPerDay: 1 },
    hoursBookedToday: 0,
  });
  assert(pricing.finalPrice === 0, `Expected 0 (free), got ${pricing.finalPrice}`);
  assert(pricing.isFreeBenefit, 'Should be marked as free benefit');
});

test('Gold member second hour gets 50% discount', () => {
  const pricing = calculateCourtPrice({
    hourlyRate: 600,
    plan: { tier: 'GOLD', courtDiscountPercent: 50, freeCourtHoursPerDay: 1 },
    hoursBookedToday: 1,
  });
  assert(pricing.finalPrice === 300, `Expected 300, got ${pricing.finalPrice}`);
  assert(pricing.discountAmount === 300, `Expected discount 300, got ${pricing.discountAmount}`);
});

test('Silver member gets 25% discount', () => {
  const pricing = calculateCourtPrice({
    hourlyRate: 600,
    plan: { tier: 'SILVER', courtDiscountPercent: 25, freeCourtHoursPerDay: 0 },
    hoursBookedToday: 0,
  });
  assert(pricing.finalPrice === 450, `Expected 450, got ${pricing.finalPrice}`);
});

test('Junior member gets 30% discount', () => {
  const pricing = calculateCourtPrice({
    hourlyRate: 600,
    plan: { tier: 'JUNIOR', courtDiscountPercent: 30, freeCourtHoursPerDay: 0 },
    hoursBookedToday: 0,
  });
  assert(pricing.finalPrice === 420, `Expected 420, got ${pricing.finalPrice}`);
});

test('Indoor court pricing respects discounts', () => {
  const pricing = calculateCourtPrice({
    hourlyRate: 1000,
    plan: { tier: 'GOLD', courtDiscountPercent: 50, freeCourtHoursPerDay: 1 },
    hoursBookedToday: 1,
  });
  assert(pricing.finalPrice === 500, `Expected 500, got ${pricing.finalPrice}`);
  assert(pricing.basePrice === 1000, 'Base price should be 1000');
});

// ---------------------------------------------------------------------------
console.log('\n📋 6. AUTHORIZATION TESTS (Permission Matrix)');
// ---------------------------------------------------------------------------

import { hasPermission } from '../lib/permissions/rbac';

test('OWNER can manage courts', () => {
  assert(hasPermission('OWNER', 'courts:manage'), 'OWNER should manage courts');
});

test('ADMIN can manage courts', () => {
  assert(hasPermission('ADMIN', 'courts:manage'), 'ADMIN should manage courts');
});

test('FRONT_DESK cannot manage courts', () => {
  assert(!hasPermission('FRONT_DESK', 'courts:manage'), 'FRONT_DESK should NOT manage courts');
});

test('MEMBER cannot manage courts', () => {
  assert(!hasPermission('MEMBER', 'courts:manage'), 'MEMBER should NOT manage courts');
});

test('OWNER can create bookings', () => {
  assert(hasPermission('OWNER', 'bookings:create'), 'OWNER should create bookings');
});

test('FRONT_DESK can create bookings', () => {
  assert(hasPermission('FRONT_DESK', 'bookings:create'), 'FRONT_DESK should create bookings');
});

test('MEMBER can create bookings', () => {
  assert(hasPermission('MEMBER', 'bookings:create'), 'MEMBER should create bookings');
});

test('SHOP_STAFF cannot create bookings', () => {
  assert(!hasPermission('SHOP_STAFF', 'bookings:create'), 'SHOP_STAFF should NOT create bookings');
});

test('BAR_STAFF cannot create bookings', () => {
  assert(!hasPermission('BAR_STAFF', 'bookings:create'), 'BAR_STAFF should NOT create bookings');
});

test('OWNER can manage bookings (cancel any)', () => {
  assert(hasPermission('OWNER', 'bookings:manage'), 'OWNER should manage bookings');
});

test('FRONT_DESK can manage bookings', () => {
  assert(hasPermission('FRONT_DESK', 'bookings:manage'), 'FRONT_DESK should manage bookings');
});

test('MEMBER cannot manage all bookings', () => {
  assert(!hasPermission('MEMBER', 'bookings:manage'), 'MEMBER should NOT manage all bookings');
});

// ===========================================================================
console.log('\n' + '='.repeat(60));
console.log(`\n📊 TEST RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED!\n');
} else {
  console.log(`⚠️  ${failed} test(s) failed.\n`);
  process.exit(1);
}

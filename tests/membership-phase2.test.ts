/**
 * PHASE 2 Automated Tests — Membership Intelligence, Lifecycle, Renewals & Calculations
 * Developer 1: The Champions Club
 */

import { calculateMembershipExpiryStatus } from '../types/shared';
import { memberRegisterSchema, memberRenewalSchema } from '../lib/validations/member';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('--- RUNNING PHASE 2 MEMBERSHIP TESTS ---');
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void) {
    total++;
    try {
      fn();
      console.log(`✓ PASS: ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`✗ FAIL: ${name}`, err);
    }
  }

  // 1. Expiry status derivation logic tests
  test('Active Membership: Expiry date > 30 days ahead returns ACTIVE', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const { derivedStatus, daysRemaining } = calculateMembershipExpiryStatus(
      'ACTIVE',
      futureDate.toISOString().split('T')[0]
    );
    assert(derivedStatus === 'ACTIVE', `Expected ACTIVE, got ${derivedStatus}`);
    assert(daysRemaining >= 89, `Expected >= 89 days, got ${daysRemaining}`);
  });

  test('Expiring Soon: Expiry date between 1 and 30 days returns EXPIRING_SOON', () => {
    const soonDate = new Date();
    soonDate.setDate(soonDate.getDate() + 15);
    const { derivedStatus, daysRemaining } = calculateMembershipExpiryStatus(
      'ACTIVE',
      soonDate.toISOString().split('T')[0]
    );
    assert(derivedStatus === 'EXPIRING_SOON', `Expected EXPIRING_SOON, got ${derivedStatus}`);
    assert(daysRemaining >= 14 && daysRemaining <= 16, `Days remaining in range 14-16: ${daysRemaining}`);
  });

  test('Expired: Expiry date in the past returns EXPIRED', () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 5);
    const { derivedStatus, daysRemaining } = calculateMembershipExpiryStatus(
      'ACTIVE',
      pastDate.toISOString().split('T')[0]
    );
    assert(derivedStatus === 'EXPIRED', `Expected EXPIRED, got ${derivedStatus}`);
    assert(daysRemaining < 0, `Days remaining should be negative: ${daysRemaining}`);
  });

  test('Explicit Status Override: Suspended or Cancelled takes precedence over dates', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 120);
    const suspended = calculateMembershipExpiryStatus('SUSPENDED', futureDate.toISOString().split('T')[0]);
    assert(suspended.derivedStatus === 'SUSPENDED', `Expected SUSPENDED, got ${suspended.derivedStatus}`);

    const cancelled = calculateMembershipExpiryStatus('CANCELLED', futureDate.toISOString().split('T')[0]);
    assert(cancelled.derivedStatus === 'CANCELLED', `Expected CANCELLED, got ${cancelled.derivedStatus}`);
  });

  // 2. Member Registration Schema Validation
  test('Registration Validation: Valid payload with CASH payment passes schema', () => {
    const result = memberRegisterSchema.safeParse({
      fullName: 'Rahul Sharma',
      email: 'rahul.sharma@example.com',
      phone: '+91 98765 43210',
      membershipNumber: 'CC-2026-9011',
      planId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      startDate: '2026-10-01',
      endDate: '2027-10-01',
      paymentMethod: 'CASH',
      paymentReference: 'DESK-RECEIPT-401',
      emergencyContact: 'Priya Sharma - +91 98765 00000',
      notes: 'Initial annual enrollment',
    });
    assert(result.success, `Expected success, got: ${JSON.stringify(result)}`);
  });

  test('Registration Validation: Rejects invalid date range (endDate <= startDate)', () => {
    const result = memberRegisterSchema.safeParse({
      fullName: 'Vikram Patel',
      email: 'vikram@example.com',
      membershipNumber: 'CC-2026-9012',
      planId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      startDate: '2026-10-10',
      endDate: '2026-10-05',
    });
    assert(!result.success, 'Schema should reject when endDate is before startDate');
  });

  test('Registration Validation: Rejects malformed email', () => {
    const result = memberRegisterSchema.safeParse({
      fullName: 'Test User',
      email: 'not-an-email',
      membershipNumber: 'CC-2026-9013',
      planId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      startDate: '2026-10-01',
      endDate: '2027-10-01',
    });
    assert(!result.success, 'Schema should reject invalid email syntax');
  });

  // 3. Member Renewal Schema Validation
  test('Renewal Validation: Valid renewal with UPI payment passes schema', () => {
    const result = memberRenewalSchema.safeParse({
      memberId: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
      planId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      startDate: '2026-10-01',
      endDate: '2027-10-01',
      paymentMethod: 'UPI',
      paymentReference: 'UPI-REF-998811',
      notes: 'Annual renewal processed',
    });
    assert(result.success, `Expected success, got: ${JSON.stringify(result)}`);
  });

  test('Renewal Validation: Rejects renewal with missing memberId or planId', () => {
    const result = memberRenewalSchema.safeParse({
      memberId: '',
      planId: '',
      startDate: '2026-10-01',
      endDate: '2027-10-01',
    });
    assert(!result.success, 'Schema should reject empty memberId or planId');
  });

  console.log(`\nPHASE 2 TEST SUMMARY: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();

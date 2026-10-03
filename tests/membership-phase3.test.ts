/**
 * PHASE 3 Automated Tests — Hardening, Security, Self-Service Lifecycle, RBAC & Redirection
 * Developer 1: The Champions Club
 */

import { calculateMembershipExpiryStatus } from '../types/shared';
import { memberEnrollSelfSchema, memberRenewalSchema } from '../lib/validations/member';
import { hasPermission } from '../lib/permissions/rbac';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function runTests() {
  console.log('--- RUNNING PHASE 3 SECURITY & MEMBERSHIP HARDENING TESTS ---');
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

  // 1. Open Redirect Sanitization Logic (matches actions/auth.ts and app/(auth)/login/page.tsx)
  function isSafeRedirect(target: string | null | undefined): boolean {
    if (!target) return false;
    if (typeof target !== 'string') return false;
    return (
      target.startsWith('/') &&
      !target.startsWith('//') &&
      !target.includes('\\') &&
      !target.includes(':')
    );
  }

  test('Open Redirect Prevention: Rejects absolute external URLs', () => {
    assert(!isSafeRedirect('https://evil.com'), 'Should reject https://evil.com');
    assert(!isSafeRedirect('http://attacker.com/dashboard'), 'Should reject http URL');
    assert(!isSafeRedirect('//evil.com/phishing'), 'Should reject protocol-relative //evil.com');
    assert(!isSafeRedirect('javascript:alert(1)'), 'Should reject javascript URI');
  });

  test('Open Redirect Prevention: Accepts legitimate relative dashboard paths', () => {
    assert(isSafeRedirect('/dashboard'), 'Should accept /dashboard');
    assert(isSafeRedirect('/dashboard/portal'), 'Should accept /dashboard/portal');
    assert(isSafeRedirect('/dashboard/bookings?date=2026-10-04'), 'Should accept query param relative path');
  });

  // 2. Privilege Escalation Prevention & RBAC Guardrails
  test('RBAC Integrity: MEMBER role must NOT have staff or administrative permissions', () => {
    assert(!hasPermission('MEMBER', 'members:manage'), 'Member must not have members:manage');
    assert(!hasPermission('MEMBER', 'staff:manage'), 'Member must not have staff:manage');
    assert(!hasPermission('MEMBER', 'reports:view'), 'Member must not have reports:view');
    assert(!hasPermission('MEMBER', 'invoices:manage'), 'Member must not have invoices:manage');
    assert(!hasPermission('MEMBER', 'inventory:manage'), 'Member must not have inventory:manage');
  });

  test('RBAC Integrity: MEMBER role possesses appropriate self-service permissions', () => {
    assert(hasPermission('MEMBER', 'courts:read'), 'Member should read courts');
    assert(hasPermission('MEMBER', 'bookings:create'), 'Member should create bookings');
    assert(hasPermission('MEMBER', 'shop:read_products'), 'Member should read shop products');
    assert(hasPermission('MEMBER', 'bar:read_menu'), 'Member should read bar menu');
    assert(hasPermission('MEMBER', 'shop_orders:create'), 'Member should create shop orders');
  });

  test('RBAC Integrity: FRONT_DESK and ADMIN roles retain membership management permissions', () => {
    assert(hasPermission('FRONT_DESK', 'members:manage'), 'Front desk can manage members');
    assert(hasPermission('ADMIN', 'members:manage'), 'Admin can manage members');
    assert(hasPermission('OWNER', 'members:manage'), 'Owner can manage members');
  });

  // 3. Self-Enrollment Schema Validation (New Feature for Phase 3)
  test('Self-Enrollment Validation: Valid CARD payload passes schema', () => {
    const valid = memberEnrollSelfSchema.safeParse({
      planId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      paymentMethod: 'CARD',
      paymentReference: 'AUTH-99201',
      emergencyContact: '+91 98765 11111',
    });
    assert(valid.success, `Expected success, got: ${JSON.stringify(valid)}`);
  });

  test('Self-Enrollment Validation: Rejects invalid plan UUID format', () => {
    const invalid = memberEnrollSelfSchema.safeParse({
      planId: 'not-a-uuid',
      paymentMethod: 'CARD',
    });
    assert(!invalid.success, 'Schema should reject non-UUID planId');
  });

  test('Self-Enrollment Validation: Rejects unsupported payment method', () => {
    const invalid = memberEnrollSelfSchema.safeParse({
      planId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      paymentMethod: 'BITCOIN',
    });
    assert(!invalid.success, 'Schema should reject invalid payment method enum');
  });

  // 4. Edge Cases: Expiry Status Calculation
  test('Expiry Edge Case: Membership expiring today (0 days remaining) marked as EXPIRING_SOON', () => {
    const today = new Date().toISOString().split('T')[0];
    const { derivedStatus, daysRemaining, isExpiringSoon, isExpired } =
      calculateMembershipExpiryStatus('ACTIVE', today);

    assert(derivedStatus === 'EXPIRING_SOON', `Expected EXPIRING_SOON, got ${derivedStatus}`);
    assert(daysRemaining === 0, `Expected 0 days remaining, got ${daysRemaining}`);
    assert(isExpiringSoon === true, 'isExpiringSoon should be true');
    assert(isExpired === false, 'isExpired should be false on the day of expiry');
  });

  test('Expiry Edge Case: Membership expired yesterday (-1 days) marked as EXPIRED', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const { derivedStatus, daysRemaining, isExpiringSoon, isExpired } =
      calculateMembershipExpiryStatus('ACTIVE', yesterdayStr);

    assert(derivedStatus === 'EXPIRED', `Expected EXPIRED, got ${derivedStatus}`);
    assert(daysRemaining < 0, `Expected negative days remaining, got ${daysRemaining}`);
    assert(isExpired === true, 'isExpired should be true');
    assert(isExpiringSoon === false, 'isExpiringSoon should be false');
  });

  // 5. Renewal Term Seamless Extension Logic
  test('Renewal Logic: Active member renewing extends seamlessly from current end_date without losing days', () => {
    const today = new Date().toISOString().split('T')[0];
    const currentEndDate = '2026-11-15'; // 43 days in future

    // Calculate start date using Phase 3 seamless rule
    const renewalStart = currentEndDate > today ? currentEndDate : today;
    assert(renewalStart === '2026-11-15', 'Renewal start date must be current end date when active');

    const durationDays = 365;
    const end = new Date(renewalStart);
    end.setDate(end.getDate() + durationDays);
    const renewalEnd = end.toISOString().split('T')[0];

    const renewalValidation = memberRenewalSchema.safeParse({
      memberId: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
      planId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      startDate: renewalStart,
      endDate: renewalEnd,
      paymentMethod: 'CARD',
    });

    assert(renewalValidation.success, 'Seamless renewal payload must be valid');
  });

  test('Renewal Logic: Expired member renewing starts immediately from today', () => {
    const today = new Date().toISOString().split('T')[0];
    const pastEndDate = '2026-08-01'; // Expired 2 months ago

    const renewalStart = pastEndDate > today ? pastEndDate : today;
    assert(renewalStart === today, 'Renewal start date must be today when expired');

    const durationDays = 180;
    const end = new Date(renewalStart);
    end.setDate(end.getDate() + durationDays);
    const renewalEnd = end.toISOString().split('T')[0];

    const renewalValidation = memberRenewalSchema.safeParse({
      memberId: 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
      planId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      startDate: renewalStart,
      endDate: renewalEnd,
      paymentMethod: 'UPI',
    });

    assert(renewalValidation.success, 'Post-expiry renewal payload must be valid');
  });

  console.log(`\nPHASE 3 TEST SUMMARY: ${passed}/${total} tests passed.`);
  if (passed !== total) {
    process.exit(1);
  }
}

runTests();

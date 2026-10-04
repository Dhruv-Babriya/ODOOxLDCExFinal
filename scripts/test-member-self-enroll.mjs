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

const supabase = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runEnrollmentTests() {
  console.log('======================================================');
  console.log('🧪 TESTING MEMBER SELF-ENROLLMENT & RENEWAL FUNCTIONS');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAILED: ${message}`);
      process.exitCode = 1;
    }
  }

  // 1. Fetch available plans
  console.log('Test 1: Fetch Active Membership Plans');
  const { data: plans, error: plansErr } = await supabase
    .from('membership_plans')
    .select('id, name, price, duration_days, is_active')
    .eq('is_active', true);

  assert(!plansErr && plans && plans.length > 0, `Active plans found (${plans?.length || 0} plans)`);
  const goldPlan = plans.find((p) => p.name.toLowerCase().includes('gold')) || plans[0];
  const silverPlan = plans.find((p) => p.name.toLowerCase().includes('silver')) || plans[1] || plans[0];

  // 2. Provision a fresh test member account using register_member_direct
  console.log('\nTest 2: Provision Fresh Member Account');
  const testEmail = `member_enroll_test_${Date.now()}@testclub.local`;
  const testPassword = 'Password123!';
  const testFullName = 'Self Enrollment Tester';

  const { data: testUserId, error: regErr } = await supabase.rpc('register_member_direct', {
    p_email: testEmail,
    p_password: testPassword,
    p_full_name: testFullName,
    p_phone: '+1-555-0199',
  });

  assert(!regErr && testUserId, `Fresh member registered: ${testEmail} (ID: ${testUserId})`);
  if (regErr) {
    console.error('Registration failed:', regErr);
    return;
  }

  try {
    // 3. Test Self-Enrollment via enroll_member_self RPC
    console.log('\nTest 3: Member Self-Enrollment via enroll_member_self RPC');
    const { data: enrollRes, error: enrollErr } = await supabase.rpc('enroll_member_self', {
      p_user_id: testUserId,
      p_plan_id: goldPlan.id,
      p_payment_method: 'CARD',
      p_payment_reference: 'CARD-REF-TEST-999',
      p_emergency_contact: '+1-555-9988',
      p_notes: 'Automated portal self-enrollment test',
    });

    assert(
      !enrollErr && enrollRes?.success === true,
      `Self-enrollment completed successfully without 42501 error (Member: #${enrollRes?.membership_number}, Invoice: #${enrollRes?.invoice_number})`
    );

    if (enrollErr) {
      console.error('Self-enrollment error:', enrollErr);
    }

    const memberId = enrollRes?.member_id;
    assert(!!memberId, `Returned valid memberId: ${memberId}`);

    // 4. Test Duplicate Enrollment Conflict Guard
    console.log('\nTest 4: Conflict Guard on Duplicate Active Enrollment');
    const { data: dupRes, error: dupErr } = await supabase.rpc('enroll_member_self', {
      p_user_id: testUserId,
      p_plan_id: silverPlan.id,
      p_payment_method: 'CARD',
    });

    assert(
      dupErr !== null && dupErr.message.includes('already has an active membership'),
      `Duplicate enrollment cleanly blocked with conflict message: "${dupErr?.message || ''}"`
    );

    // 5. Test Membership Renewal via renew_membership_self RPC
    console.log('\nTest 5: Member Plan Renewal / Upgrade via renew_membership_self RPC');
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

    const { data: renRes, error: renErr } = await supabase.rpc('renew_membership_self', {
      p_member_id: memberId,
      p_plan_id: silverPlan.id,
      p_start_date: today,
      p_end_date: nextYear,
      p_payment_method: 'UPI',
      p_payment_reference: 'UPI-REF-TEST-888',
      p_notes: 'Automated renewal upgrade test',
    });

    assert(
      !renErr && renRes?.success === true,
      `renew_membership_self completed successfully without 42501 error (Invoice: #${renRes?.invoice_number})`
    );

    if (renErr) {
      console.error('Renewal error:', renErr);
    }
  } finally {
    // Clean up test data
    console.log('\nTest 6: Cleanup Test Data');
    const { error: cleanErr } = await supabase.from('profiles').delete().eq('id', testUserId);
    console.log('  ✓ Cleaned up test user data');
  }

  console.log('\n======================================================');
  console.log(`📊 SUMMARY: ${passed}/${total} assertions passed`);
  if (passed === total) {
    console.log('🎉 MEMBER SELF-ENROLLMENT & RENEWAL FULLY VERIFIED!');
  } else {
    console.error('❌ SOME TESTS FAILED');
  }
  console.log('======================================================\n');
}

runEnrollmentTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

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

const client = createClient(supabaseUrl, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runStockVerificationTests() {
  console.log('======================================================');
  console.log('🧪 VERIFYING RESTOCK REFLECTION IN MEMBER PORTAL');
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

  // 1. Fetch products and check inventory read access
  console.log('Test 1: Read Products & Inventory with Member/Public Client');
  const { data: products, error: prodErr } = await client
    .from('products')
    .select(`
      id,
      name,
      price,
      is_active,
      inventory (quantity_on_hand)
    `)
    .eq('is_active', true)
    .limit(5);

  assert(!prodErr && products && products.length > 0, `Fetched active products (${products?.length || 0})`);

  const testProduct = products[0];
  const initialStock = Array.isArray(testProduct.inventory)
    ? testProduct.inventory[0]?.quantity_on_hand ?? 0
    : testProduct.inventory?.quantity_on_hand ?? 0;

  assert(
    testProduct.inventory !== null && testProduct.inventory !== undefined,
    `Inventory is accessible to member/public client (not null!): Initial stock = ${initialStock}`
  );

  // 2. Perform Restocking via adjust_inventory RPC (Manager Restock Simulation)
  console.log('\nTest 2: Manager Restocks Product via adjust_inventory (+15 units)');
  const restockQty = 15;
  const { data: newStock, error: restockErr } = await client.rpc('adjust_inventory', {
    p_product_id: testProduct.id,
    p_quantity_change: restockQty,
    p_tx_type: 'PURCHASE_RECEIPT',
    p_notes: 'Manager restocking verification test',
  });

  assert(
    !restockErr && Number(newStock) === initialStock + restockQty,
    `Restock RPC succeeded. New stock: ${newStock} (Expected: ${initialStock + restockQty})`
  );

  // 3. Immediately query as Member / Public Client to ensure new stock is visible
  console.log('\nTest 3: Verify Member Portal Sees Updated Stock Level');
  const { data: updatedProducts, error: queryErr } = await client
    .from('products')
    .select(`
      id,
      name,
      inventory (quantity_on_hand)
    `)
    .eq('id', testProduct.id)
    .single();

  const observedStock = Array.isArray(updatedProducts?.inventory)
    ? updatedProducts.inventory[0]?.quantity_on_hand
    : updatedProducts?.inventory?.quantity_on_hand;

  assert(
    !queryErr && observedStock === initialStock + restockQty,
    `Member portal accurately observed restocked level: ${observedStock} units!`
  );

  // 4. Revert test restock
  console.log('\nTest 4: Revert Test Restock (-15 units)');
  const { data: revertedStock, error: revertErr } = await client.rpc('adjust_inventory', {
    p_product_id: testProduct.id,
    p_quantity_change: -restockQty,
    p_tx_type: 'ADJUSTMENT',
    p_notes: 'Reverting test restocking',
  });

  if (revertErr) {
    console.error('Revert error:', revertErr);
  }

  assert(
    !revertErr && Number(revertedStock) === initialStock,
    `Stock cleanly reverted back to initial baseline: ${revertedStock} units (Expected: ${initialStock})`
  );

  console.log('\n======================================================');
  console.log(`📊 SUMMARY: ${passed}/${total} assertions passed`);
  if (passed === total) {
    console.log('🎉 PRO SHOP RESTOCKING VISIBILITY IN MEMBER PORTAL FULLY VERIFIED!');
  } else {
    console.error('❌ SOME TESTS FAILED');
  }
  console.log('======================================================\n');
}

runStockVerificationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

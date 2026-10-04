import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const client = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  console.log('=== CHECKING PRO SHOP PRODUCTS ===');
  const { data: prods, error: pErr } = await client.from('products').select('id, name, image_url');
  if (pErr) console.error('Error fetching products:', pErr);
  let brokenProducts = 0;
  for (const p of prods || []) {
    if (!p.image_url) {
      console.log(`[Shop] NULL URL: ${p.name}`);
      brokenProducts++;
      continue;
    }
    try {
      const res = await fetch(p.image_url, { method: 'HEAD' });
      if (res.status >= 400) {
        console.log(`[Shop] Broken HTTP ${res.status}: ${p.name} -> ${p.image_url}`);
        brokenProducts++;
      }
    } catch (e) {
      console.log(`[Shop] Network Error: ${p.name} -> ${e.message}`);
      brokenProducts++;
    }
  }
  console.log(`Total Shop Products: ${prods?.length}, Broken/Missing: ${brokenProducts}`);

  console.log('\n=== CHECKING BAR & CAFETERIA MENU ITEMS ===');
  const { data: menuItems, error: mErr } = await client.from('menu_items').select('id, name, image_url');
  if (mErr) console.error('Error fetching menu items:', mErr);
  let brokenMenu = 0;
  for (const m of menuItems || []) {
    if (!m.image_url) {
      console.log(`[Bar] NULL URL: ${m.name}`);
      brokenMenu++;
      continue;
    }
    try {
      const res = await fetch(m.image_url, { method: 'HEAD' });
      if (res.status >= 400) {
        console.log(`[Bar] Broken HTTP ${res.status}: ${m.name} -> ${m.image_url}`);
        brokenMenu++;
      }
    } catch (e) {
      console.log(`[Bar] Network Error: ${m.name} -> ${e.message}`);
      brokenMenu++;
    }
  }
  console.log(`Total Bar Menu Items: ${menuItems?.length}, Missing/Broken Image URLs: ${brokenMenu}`);
}

check();

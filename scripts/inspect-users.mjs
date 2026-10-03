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

const adminSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function inspectUsers() {
  const { data: users, error } = await adminSupabase.auth.admin.listUsers();
  if (error) {
    console.error('List users error:', error);
    return;
  }
  console.log('Total auth users:', users.users.length);
  for (const u of users.users) {
    console.log(`- ID: ${u.id}, Email: ${u.email}`);
  }

  const { data: profiles, error: pErr } = await adminSupabase
    .from('profiles')
    .select('id, email, full_name, role');
  console.log('\nProfiles:');
  for (const p of profiles || []) {
    console.log(`- ID: ${p.id}, Email: ${p.email}, Role: ${p.role}, Name: ${p.full_name}`);
  }
}

inspectUsers();

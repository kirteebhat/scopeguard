import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local manually
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx !== -1) {
    const key = trimmed.slice(0, idx).trim();
    const val = trimmed.slice(idx + 1).trim();
    env[key] = val;
  }
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to Supabase at:', supabaseUrl);
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const start = Date.now();
  try {
    const { data, error } = await admin.auth.admin.listUsers();
    const duration = Date.now() - start;
    if (error) {
      console.error('Supabase Auth error (' + duration + 'ms):', error);
      return;
    }
    console.log(`Successfully connected in ${duration}ms! Total users: ${data.users.length}`);
    for (const u of data.users) {
      console.log({
        id: u.id,
        email: u.email,
        confirmed_at: u.email_confirmed_at,
        last_sign_in: u.last_sign_in_at,
        created_at: u.created_at,
      });
    }
  } catch (err) {
    console.error('Network / fetch exception:', err);
  }
}

run();

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Parse .env.local
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

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureUser(email, password, fullName, workspaceName) {
  console.log(`Ensuring account for ${email}...`);
  const { data: userList, error: listError } = await admin.auth.admin.listUsers();
  if (listError) throw listError;

  let user = userList.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (user) {
    console.log(`User ${email} already exists (id: ${user.id}). Updating password and confirming email...`);
    const { data: updated, error: updateError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, default_workspace_name: workspaceName },
    });
    if (updateError) throw updateError;
    user = updated.user;
  } else {
    console.log(`Creating user ${email}...`);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, default_workspace_name: workspaceName },
    });
    if (createError) throw createError;
    user = created.user;
  }

  // Ensure workspace and membership
  const { data: existingMember } = await admin
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!existingMember) {
    console.log(`Creating default workspace for ${email}...`);
    const slug = `acme-agency-${Date.now()}`;
    const { data: ws, error: wsError } = await admin
      .from('workspaces')
      .insert({
        name: workspaceName,
        slug,
        plan: 'free',
      })
      .select()
      .single();

    if (wsError) throw wsError;

    const { error: memError } = await admin.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: user.id,
      role: 'owner',
    });
    if (memError) throw memError;
    console.log(`Created workspace ${ws.id} with owner ${user.id}`);
  } else {
    console.log(`User already has workspace membership: ${existingMember.workspace_id}`);
  }

  console.log(`✓ Account ready!`);
  console.log(`  Email:    ${email}`);
  console.log(`  Password: ${password}`);
}

async function run() {
  try {
    await ensureUser('demo@scopeguard.com', 'Password123!', 'Demo Founder', 'Acme Agency');
    await ensureUser('founder@acme.agency', 'Password123!', 'Acme Founder', 'Acme Agency');
    console.log('\nAll demo accounts are confirmed and ready for login.');
  } catch (err) {
    console.error('Failed to ensure user accounts:', err);
  }
}

run();

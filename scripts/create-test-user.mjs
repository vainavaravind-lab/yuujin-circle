// Dev-only helper: create a test user + one-tap login link WITHOUT sending any email
// (bypasses Supabase's free-tier email rate limit for local testing).
//
// Usage (from the project root):
//   SERVICE_KEY=<your sb_secret key> node scripts/create-test-user.mjs someone@snuchennai.edu.in
//
// Get the sb_secret key from Supabase → Project Settings → API Keys → "Secret keys".
// ⚠️ Never commit this key or ship it in frontend code. Dev-testing use only.

import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
if (!email || !email.endsWith('@snuchennai.edu.in')) {
  console.error('Usage: SERVICE_KEY=<sb_secret key> node scripts/create-test-user.mjs <email ending in @snuchennai.edu.in>');
  process.exit(1);
}

const SERVICE_KEY = process.env.SERVICE_KEY;
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
if (!SERVICE_KEY || !SUPABASE_URL) {
  console.error('Missing SERVICE_KEY and/or VITE_SUPABASE_URL env vars.');
  console.error('Try: SERVICE_KEY=<key> VITE_SUPABASE_URL=$(grep VITE_SUPABASE_URL .env.local | cut -d= -f2) node scripts/create-test-user.mjs ...');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

// 1. Create (or fetch) the user — no confirmation email involved.
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  email_confirm: true,
});

let userId;
if (createErr) {
  if (createErr.message.includes('already been registered')) {
    const { data: list } = await admin.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === email);
    if (!existing) throw createErr;
    userId = existing.id;
    console.log(`User already exists: ${userId}`);
  } else {
    throw createErr;
  }
} else {
  userId = created.user.id;
  console.log(`Created user: ${userId}`);
}

// 2. Generate a one-tap login link (no email sent).
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email,
  options: { redirectTo: 'http://localhost:5173/auth/callback' },
});
if (linkErr) throw linkErr;

// 3. Build one-tap URLs the app consumes (no email involved).
const props = linkData.properties;
const tokenHash = props?.token_hash ?? props?.hashed_token;
if (!tokenHash && !props?.action_link) throw new Error('generateLink returned no usable token');

console.log('\n✅ Login links (paste in the browser you want logged in as this user):\n');
if (tokenHash) {
  console.log('[app link]  http://localhost:5173/auth/callback?token_hash=' + tokenHash + '&type=magiclink');
}
if (props?.action_link) {
  console.log('[direct]    ' + props.action_link);
}
console.log('\nTip: to be logged in as TWO users at once, use a normal window for user A and');
console.log('an incognito/private window (or a different browser) for user B.');

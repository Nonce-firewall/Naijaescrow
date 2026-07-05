// Netlify Function: delete-account
//
// Permanently deletes the calling user's Supabase Auth account while
// retaining their KYC records (kyc_status, kyc_data) for fraud/legal
// purposes. Everything else on their profile is scrubbed.
//
// This MUST run server-side because deleting an auth user requires the
// Supabase service-role key, which must never be shipped to the browser.
//
// Runs as a Netlify Function so it deploys automatically with the site
// build — no separate CLI deploy step required (unlike a Supabase Edge
// Function, which needs a manual `supabase functions deploy`).
//
// Requires these Netlify environment variables to be set:
// - SUPABASE_URL (or reuse the existing VITE_SUPABASE_URL value)
// - SUPABASE_SERVICE_ROLE_KEY (from Supabase project settings > API)
import { createClient } from '@supabase/supabase-js';
import type { Config } from '@netlify/functions';

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return Response.json({ error: 'Missing Authorization header.' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 },
    );
  }

  try {
    // Client scoped to the caller's own JWT — used only to verify identity.
    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return Response.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const uid = userData.user.id;

    // Admin client for privileged operations (bypasses RLS).
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Scrub the profile row but retain KYC data for fraud/legal records.
    const { error: scrubError } = await adminClient
      .from('users')
      .update({
        email: `deleted-${uid}@removed.local`,
        account_status: 'deleted',
        notification_preferences: null,
        deleted_at: Date.now(),
      })
      .eq('id', uid);

    if (scrubError) {
      return Response.json({ error: `Failed to scrub profile: ${scrubError.message}` }, { status: 500 });
    }

    // 2. Permanently delete the Supabase Auth account.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(uid);
    if (deleteError) {
      return Response.json({ error: `Failed to delete auth account: ${deleteError.message}` }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Unknown error.' }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/delete-account',
};

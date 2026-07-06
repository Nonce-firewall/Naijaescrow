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
// Requires these Netlify environment variables:
//   SUPABASE_URL            — your project URL (or reuse VITE_SUPABASE_URL)
//   SUPABASE_SERVICE_ROLE_KEY — from Supabase project settings › API
import { createClient } from '@supabase/supabase-js';
import type { Config } from '@netlify/functions';

export default async (req: Request) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  // Extract the raw JWT from the Bearer token
  const userJwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!userJwt) {
    return Response.json({ error: 'Missing or malformed Authorization header.' }, { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: 'Server misconfiguration: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 },
    );
  }

  // Single admin client — service-role key bypasses RLS for all operations.
  // auth.getUser(jwt) with an explicit JWT validates the caller's token
  // without needing a separate anon-scoped client.
  // persistSession: false — prevents any attempt to read/write session storage
  // in a serverless environment where the file system is ephemeral.
  // realtime: disabled — this function never subscribes to channels; avoiding
  // the realtime init also sidesteps Node.js WebSocket availability checks.
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { eventsPerSecond: 0 },
    },
  });

  try {
    // 1. Verify the caller is a real, non-expired authenticated user.
    //    auth.getUser(jwt) validates the JWT signature against the project
    //    secret — it does NOT rely on a live session in the client.
    const { data: { user }, error: authError } = await admin.auth.getUser(userJwt);
    if (authError || !user) {
      return Response.json({ error: 'Invalid or expired session.' }, { status: 401 });
    }

    const uid = user.id;

    // 2. Scrub the profile row but retain KYC data for fraud/legal records.
    //    Use new Date().toISOString() rather than Date.now() — Postgres
    //    timestamptz columns reject raw millisecond integers.
    const { error: scrubError } = await admin
      .from('users')
      .update({
        email: `deleted-${uid}@removed.local`,
        account_status: 'deleted',
        notification_preferences: null,
        deleted_at: Date.now(),   // bigint milliseconds — matches schema convention
      })
      .eq('id', uid);

    if (scrubError) {
      return Response.json(
        { error: `Failed to scrub profile: ${scrubError.message}` },
        { status: 500 },
      );
    }

    // 3. Permanently delete the Supabase Auth account.
    const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
    if (deleteError) {
      return Response.json(
        { error: `Failed to delete auth account: ${deleteError.message}` },
        { status: 500 },
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error.';
    return Response.json({ error: message }, { status: 500 });
  }
};

export const config: Config = {
  path: '/api/delete-account',
};

// Supabase Edge Function: delete-account
//
// Permanently deletes the calling user's Supabase Auth account while
// retaining their KYC records (kyc_status, kyc_data) for fraud/legal
// purposes. Everything else on their profile is scrubbed.
//
// This MUST run server-side because deleting an auth user requires the
// service-role key, which must never be shipped to the browser.
//
// ── Deployment ──────────────────────────────────────────────────────
// 1. Install the Supabase CLI and log in: `supabase login`
// 2. Link this project:                  `supabase link --project-ref <your-project-ref>`
// 3. Deploy:                             `supabase functions deploy delete-account`
// 4. The function automatically has access to SUPABASE_URL and
//    SUPABASE_SERVICE_ROLE_KEY — Supabase injects these for every Edge
//    Function, you do not need to set them manually.
// ────────────────────────────────────────────────────────────────────

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client scoped to the caller's own JWT — used only to verify identity.
    const callerClient = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await callerClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired session.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      return new Response(JSON.stringify({ error: `Failed to scrub profile: ${scrubError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Permanently delete the Supabase Auth account.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(uid);
    if (deleteError) {
      return new Response(JSON.stringify({ error: `Failed to delete auth account: ${deleteError.message}` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

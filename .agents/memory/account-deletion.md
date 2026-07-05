---
name: Account deletion architecture
description: Why account deletion requires a server-side function, and what data must be retained vs scrubbed.
---

Deleting a user's Supabase Auth account (`auth.users`) requires the service-role key, which must never be shipped to the browser. The anon/authenticated client key cannot call `auth.admin.deleteUser()`.

**Why:** Any "delete my account" feature needs a server-side execution point. This project is hosted on Netlify, so a Netlify Function (`netlify/functions/delete-account.mts`) is the natural place — it deploys automatically with the site build and holds the service-role key as a server-only env var, bypassing RLS.

**How to apply:** For this project (9ija Escrow), on account deletion: scrub PII (email, notification prefs) from the `users` row and mark `account_status = 'deleted'`, but retain `kyc_status`/`kyc_data` indefinitely for fraud/legal compliance (explicit product decision — do not delete KYC records even on full account deletion). The auth account itself is permanently deleted via `auth.admin.deleteUser()`. Requires `SUPABASE_URL` (or falls back to `VITE_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` to be set as Netlify environment variables — unlike a Supabase Edge Function, no separate `supabase functions deploy` step is needed. This project previously used a Supabase Edge Function for this, which was never deployed (Edge Functions require a manual CLI deploy that isn't part of the Netlify build), causing every deletion attempt to fail.

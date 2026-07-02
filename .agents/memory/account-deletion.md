---
name: Account deletion architecture
description: Why account deletion requires a Supabase Edge Function, and what data must be retained vs scrubbed.
---

Deleting a user's Supabase Auth account (`auth.users`) requires the service-role key, which must never be shipped to the browser. The anon/authenticated client key cannot call `auth.admin.deleteUser()`.

**Why:** Any "delete my account" feature needs a server-side execution point. On a pure Vite/client-only Supabase app (no existing backend server), a Supabase Edge Function is the natural place — it auto-receives `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` and bypasses RLS.

**How to apply:** For this project (9ija Escrow), on account deletion: scrub PII (email, notification prefs) from the `users` row and mark `account_status = 'deleted'`, but retain `kyc_status`/`kyc_data` indefinitely for fraud/legal compliance (explicit product decision — do not delete KYC records even on full account deletion). The auth account itself is permanently deleted via `auth.admin.deleteUser()`. Edge Functions deployed under Supabase are NOT deployable from within Replit — they require the user to run `supabase functions deploy` themselves via the Supabase CLI.

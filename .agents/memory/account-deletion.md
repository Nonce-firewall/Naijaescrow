---
name: Account deletion architecture
description: Why account deletion requires a server-side function, and what data must be retained vs scrubbed.
---

Deleting a user's Supabase Auth account (`auth.users`) requires the service-role key, which must never be shipped to the browser. The anon/authenticated client key cannot call `auth.admin.deleteUser()`.

**Why:** Any "delete my account" feature needs a server-side execution point. This project is hosted on Netlify, so a Netlify Function (`netlify/functions/delete-account.mts`) is the natural place — it deploys automatically with the site build and holds the service-role key as a server-only env var, bypassing RLS.

**How to apply:** For this project (9ija Escrow), on account deletion: scrub PII (email, notification prefs) from the `users` row and mark `account_status = 'deleted'`, but retain `kyc_status`/`kyc_data` indefinitely for fraud/legal compliance (explicit product decision — do not delete KYC records even on full account deletion). The auth account itself is permanently deleted via `auth.admin.deleteUser()`. Requires `SUPABASE_URL` (or falls back to `VITE_SUPABASE_URL`) and `SUPABASE_SERVICE_ROLE_KEY` to be set as Netlify environment variables — unlike a Supabase Edge Function, no separate `supabase functions deploy` step is needed. This project previously used a Supabase Edge Function for this, which was never deployed (Edge Functions require a manual CLI deploy that isn't part of the Netlify build), causing every deletion attempt to fail.

## Re-registration / reactivation (added 2026-07-08)

When a deleted user signs up again with the same email (email/password or Google SSO), Supabase Auth creates a NEW `auth.users` row with a NEW UID. The old `users` profile row (with retained KYC + order history) is still in the DB under the OLD UID. Without reactivation logic, `getOrCreateUserProfile` would insert a DUPLICATE `users` row for the new UID — same email, role='user', kyc_status='none' — orphaning all retained history and treating the person as a fresh unverified trader.

**Solution (3 pieces, all required):**
1. **`users.deleted_email` column** — the delete-account Netlify Function saves the original email here BEFORE scrubbing the `email` column. This is the durable lookup key for re-registration matching. Cleared on reactivation.
2. **`orders.user_id` FK with `ON UPDATE CASCADE`** — so when we repoint `users.id` from old UID → new UID, every historical `orders` row follows automatically (no orphaned orders). Migration `20260708_reactivation_for_deleted_users.sql` recreated the FK with this rule.
3. **`restore_deleted_user(p_new_uid, p_email)` RPC** — SECURITY DEFINER PL/pgSQL function called by `getOrCreateUserProfile` (in `dbHelpers.ts`) right before the normal INSERT path. It finds the most-recently-deleted row matching `deleted_email` (case-insensitive), repoints `id` to the new auth UID, restores `email`, resets `account_status='active'`, clears `deleted_at`/`deleted_email`/suspend/terminate reasons, and returns the restored row. Excludes `role='admin'` rows so an admin account can't be silently re-claimed. Verifies `p_new_uid = auth.uid()` so one user can't claim another's deleted row.

**Flow on re-registration:** `getOrCreateUserProfile` → SELECT by new UID (no match) → `restore_deleted_user` RPC → if a deleted row matches, it's repointed & returned (KYC status + order history preserved); if no match, falls through to normal INSERT. The RPC is the only point that can update a row owned by a different (deleted) UID — it bypasses RLS via SECURITY DEFINER and is scoped to `account_status='deleted'` rows only.

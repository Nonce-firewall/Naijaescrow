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

**Flow on re-registration:** `getOrCreateUserProfile` → SELECT by new UID (no match) → `restore_deleted_user` RPC → if a deleted row matches, it's repointed & returned with `account_status='pending_reactivation'` (NOT active); if no match, falls through to normal INSERT. The RPC is the only point that can update a row owned by a different (deleted) UID — it bypasses RLS via SECURITY DEFINER and is scoped to `account_status='deleted'` rows only.

## Admin approval gate (added 2026-07-08)

Re-registered deleted users are NOT auto-reactivated to `active`. They land in `account_status='pending_reactivation'` and are blocked from the platform until an admin approves them — mirroring how `terminated` users are handled:

- **App.tsx gate:** on sign-in, if `profile.accountStatus === 'pending_reactivation'`, the user is signed out and shown: "Our records show you previously deleted this account. Please contact admin to reactivate it before you can access the platform." Same pattern as the terminated check (signOut + toast + return before dashboard).
- **UserDashboard.tsx:** trading is blocked for `pending_reactivation` (same guard as suspended/terminated), and a blue info banner ("Account Reactivation Required — contact admin") is shown if they somehow reach the dashboard.
- **Admin dashboard (AdminCMS.tsx, Compliance tab):** a "Pending Reactivation Requests" panel lists all `pending_reactivation` users with an email search box. Admin enters the user's email, finds the matching row, and clicks "Reactivate" — calls `reactivate_pending_user(p_uid)` RPC (SECURITY DEFINER, admin-only via `is_admin()` check) which flips the row to `account_status='active'` and clears stale suspend/terminate reasons. The user can then sign in normally with their KYC status and order history intact.
- **`reactivate_pending_user` RPC:** in migration `20260708_reactivation_admin_approval_gate.sql`. Only acts on rows where `account_status='pending_reactivation'`; leaves active/suspended/terminated/deleted rows untouched. Guarded by `is_admin()`.
- **`account_status` CHECK constraint** now allows: `active | suspended | terminated | deleted | pending_reactivation`.

**Defense in depth:** `is_account_active()` returns false for `pending_reactivation` (it checks `= 'active'`), so even if a pending user reached the order form, the `orders: own insert active only` RLS policy would reject the insert.

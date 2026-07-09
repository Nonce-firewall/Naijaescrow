/*
# Fix: allow service-role key to write deleted_at (and other admin-only columns)

## Problem
The `guard_user_column_privileges` trigger blocks changes to `deleted_at`,
`account_status`, `email`, `role`, `suspend_reason`, and `terminate_reason`
unless `is_admin()` returns true.

`is_admin()` resolves to:
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')

When the Netlify `delete-account` function (or any server-side Edge Function)
runs with the **service-role key**, Supabase bypasses RLS policies — but NOT
database triggers. Inside the trigger, `auth.uid()` returns NULL because the
service-role JWT carries no `sub` claim. So `is_admin()` is false, and the
trigger raises a permission exception that rolls back the entire UPDATE,
leaving `deleted_at` as NULL even though the account_status row-scrub appeared
to succeed (it did not — the whole transaction was silently rolled back by the
Supabase JS client swallowing the error response body).

## Fix
Add an explicit service-role bypass as the very first check in the trigger so
that Netlify/Edge Functions using the service-role key can write all columns
that are otherwise admin-only.

`auth.jwt() ->> 'role'` reads from the request JWT claims that PostgREST injects
into the session. For service-role requests this is always 'service_role'.
This is the standard Supabase-recommended way to detect service-role inside a
trigger or RLS function.

## Security
- This does NOT weaken user-facing RLS. RLS policies already block anon/
  authenticated from writing these columns; the trigger is a secondary guard
  for defence in depth.
- The service-role key is secret and never shipped to the browser. Only
  trusted server-side code (Netlify functions, Supabase Edge Functions, the
  Replit server-side endpoint) can present it.
- No change to any RLS policy or the trigger attachment — only the function
  body is updated.
*/

CREATE OR REPLACE FUNCTION guard_user_column_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Service-role bypass ───────────────────────────────────────────────────
  -- The service-role key is used exclusively by trusted server-side code
  -- (Netlify delete-account function, Edge Functions). It bypasses RLS but
  -- NOT triggers. Allow it through here so scrub + deleted_at writes succeed.
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- ── Admin bypass ─────────────────────────────────────────────────────────
  -- Admins (by role lookup or hardcoded email) bypass all column restrictions.
  IF is_admin() OR is_admin_email() THEN
    RETURN NEW;
  END IF;

  -- ── Blocked columns (regular users) ──────────────────────────────────────
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Permission denied: role may only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'Permission denied: account_status may only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.suspend_reason IS DISTINCT FROM OLD.suspend_reason THEN
    RAISE EXCEPTION 'Permission denied: suspend_reason may only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.terminate_reason IS DISTINCT FROM OLD.terminate_reason THEN
    RAISE EXCEPTION 'Permission denied: terminate_reason may only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Permission denied: deleted_at may only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Permission denied: email may only be changed by an admin process'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     AND NEW.kyc_status NOT IN ('pending', 'none') THEN
    RAISE EXCEPTION 'Permission denied: kyc_status can only be set to pending or none by a user'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger attachment is unchanged (BEFORE UPDATE, FOR EACH ROW) — just
-- re-drop and recreate for idempotency.
DROP TRIGGER IF EXISTS enforce_user_column_privileges ON users;

CREATE TRIGGER enforce_user_column_privileges
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION guard_user_column_privileges();

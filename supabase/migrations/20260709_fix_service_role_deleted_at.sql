/*
# Fix: allow service-role key to write deleted_at (and other admin-only columns)

## Problem
The `guard_user_column_privileges` trigger blocks changes to `deleted_at`,
`account_status`, `email`, `role`, `suspend_reason`, and `terminate_reason`
unless `is_admin()` returns true.

When the Netlify `delete-account` function (or any server-side Edge Function)
runs with the service-role key, Supabase bypasses RLS policies — but NOT
database triggers. Inside the trigger, `auth.uid()` returns NULL because the
service-role JWT carries no `sub` claim. So `is_admin()` is false, the trigger
raises a permission exception, and the entire UPDATE rolls back, leaving
`deleted_at` as NULL.

## Additional root cause discovered
`is_admin_email()` was never successfully created in the database because the
original migration (20260706_rls_indexes.sql) used a single `$` dollar-quote
delimiter instead of the required `$$`, causing a silent parse failure.
The guard trigger therefore also failed to compile correctly on any execution
path that reached `is_admin_email()`.

## Fix
1. Re-create `is_admin()` and `is_admin_email()` with correct `$$` delimiters.
2. Add a service-role bypass as the first check in `guard_user_column_privileges`
   so Netlify/Edge Functions using the service-role key can write `deleted_at`.

## Security note
The service-role key is secret and never shipped to the browser. Only trusted
server-side code can present it. No RLS policy is weakened by this change.
*/

-- ---------------------------------------------------------------------------
-- 1. Helper — check admin by role (SECURITY DEFINER avoids recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. Helper — check admin by email
--    (was broken in 20260706_rls_indexes.sql due to single-$ dollar-quote)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin_email()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (auth.jwt() ->> 'email') = 'cryptogangstar247@gmail.com';
$$;

-- ---------------------------------------------------------------------------
-- 3. Trigger function — updated with service-role bypass
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_user_column_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Service-role bypass ────────────────────────────────────────────────
  -- Service-role key (Netlify delete-account, Edge Functions) bypasses RLS
  -- but NOT triggers. Allow it through so scrub + deleted_at writes succeed.
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- ── Admin bypass ──────────────────────────────────────────────────────
  IF is_admin() OR is_admin_email() THEN
    RETURN NEW;
  END IF;

  -- ── Blocked columns (regular users) ───────────────────────────────────
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

-- ---------------------------------------------------------------------------
-- 4. Re-attach trigger (idempotent)
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS enforce_user_column_privileges ON users;

CREATE TRIGGER enforce_user_column_privileges
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION guard_user_column_privileges();

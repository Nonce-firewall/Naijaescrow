/*
# Fix: allow service-role key to write deleted_at (and other admin-only columns)

## Problems fixed
1. `is_admin_email()` was never successfully created — the original migration used
   a single `$` dollar-quote delimiter instead of `$$`, causing a silent parse failure.
2. `is_admin()` referenced `auth.uid()` without `::text` cast, causing a
   "operator does not exist: text = uuid" error because users.id is TEXT.
3. The guard trigger blocked service-role key (Netlify delete-account, Edge Functions)
   from writing `deleted_at` because service-role has no `sub` in its JWT so
   `auth.uid()` returns NULL and `is_admin()` returns false — rolling back the
   entire scrub UPDATE silently.

## Security note
Service-role key is secret and never shipped to the browser. No RLS policy
is weakened by this change.
*/

-- ---------------------------------------------------------------------------
-- 1. is_admin() — correct cast auth.uid()::text to match users.id TEXT type
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. is_admin_email() — recreate with correct $$ delimiter
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
-- 3. guard_user_column_privileges() — add service-role bypass at top
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_user_column_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Service-role key (Netlify delete-account, Edge Functions) bypasses RLS
  -- but NOT triggers. Allow it through so scrub + deleted_at writes succeed.
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Admins bypass all column restrictions.
  IF is_admin() OR is_admin_email() THEN
    RETURN NEW;
  END IF;

  -- Blocked columns for regular users:
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

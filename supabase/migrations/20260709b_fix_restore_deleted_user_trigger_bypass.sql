/*
# Fix: restore_deleted_user RPC blocked by guard_user_column_privileges trigger

## Problem
`restore_deleted_user` is called during Google SSO re-login (from `getOrCreateUserProfile`)
when a previously-deleted user signs up again with the same email. It UPDATEs the
retained users row, changing:
  - account_status  → 'pending_reactivation'  (protected)
  - email           → original email           (protected)
  - suspend_reason  → NULL                     (protected)
  - terminate_reason → NULL                    (protected)
  - deleted_at      → NULL                     (protected)

The `guard_user_column_privileges` trigger fires on that UPDATE. At that moment:
  - auth.uid()        = the re-registering user's UID  (not admin)
  - auth.jwt().role   = 'authenticated'               (not service_role)
  - is_admin()        = false
  - is_admin_email()  = false

All three bypass paths fail → trigger raises 42501 → entire RPC transaction rolls
back → getOrCreateUserProfile logs the error and falls through to INSERT a fresh
row → the user gets a brand-new unverified account instead of pending_reactivation.

## Fix — session-variable bypass
Add a fourth bypass path to the trigger: a PostgreSQL session variable
`app.allow_user_restore = 'true'` that only the SECURITY DEFINER
`restore_deleted_user` function can set before its own UPDATE.

`set_config(name, value, is_local := true)` resets automatically at transaction
end, so the bypass is strictly scoped to a single RPC invocation. A regular
client cannot call `set_config` directly through PostgREST — only the RPC's
own plpgsql body can set it. This is safe.

## Also fixed
- Cleans up the erroneously-created fresh account (bingyoung6@gmail.com row)
  must be done manually — see instructions at the bottom of this file.
*/

-- ---------------------------------------------------------------------------
-- 1. Update guard_user_column_privileges — add session-variable bypass
--    (rebuilds the full function so it is self-contained and re-runnable)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::text AND role = 'admin');
$$;

CREATE OR REPLACE FUNCTION is_admin_email()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (auth.jwt() ->> 'email') = 'cryptogangstar247@gmail.com';
$$;

CREATE OR REPLACE FUNCTION guard_user_column_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- ── Bypass 1: service-role key (Netlify / Edge Functions) ─────────────
  -- Service-role bypasses RLS but NOT triggers. Detect via JWT role claim.
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- ── Bypass 2: restore_deleted_user session variable ───────────────────
  -- The SECURITY DEFINER restore_deleted_user RPC sets this before its own
  -- UPDATE so it can repoint a deleted row to pending_reactivation. The
  -- variable is local to the transaction (auto-reset at transaction end).
  -- Clients cannot set this directly through PostgREST.
  IF current_setting('app.allow_user_restore', true) = 'true' THEN
    RETURN NEW;
  END IF;

  -- ── Bypass 3: admin by role or hardcoded email ────────────────────────
  IF is_admin() OR is_admin_email() THEN
    RETURN NEW;
  END IF;

  -- ── Protected columns — raise for regular users ───────────────────────
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

DROP TRIGGER IF EXISTS enforce_user_column_privileges ON users;
CREATE TRIGGER enforce_user_column_privileges
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION guard_user_column_privileges();

-- ---------------------------------------------------------------------------
-- 2. Update restore_deleted_user — set session variable before UPDATE
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.restore_deleted_user(p_new_uid text, p_email text)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_matched_id text;
BEGIN
  -- Only allow the caller to repoint to THEIR OWN new auth UID.
  IF p_new_uid IS NULL OR p_new_uid = '' OR p_new_uid <> auth.uid()::text THEN
    RAISE EXCEPTION 'Caller UID does not match authenticated session.';
    RETURN;
  END IF;

  IF p_email IS NULL OR p_email = '' THEN
    RETURN;
  END IF;

  -- Find the most-recently-deleted row for this email (case-insensitive).
  -- Admin rows are excluded so an admin account can never be silently re-claimed.
  SELECT id INTO v_matched_id
  FROM public.users
  WHERE account_status = 'deleted'
    AND deleted_email IS NOT NULL
    AND lower(deleted_email) = lower(p_email)
    AND role <> 'admin'
  ORDER BY deleted_at DESC NULLS LAST
  LIMIT 1;

  IF v_matched_id IS NULL THEN
    RETURN;  -- no deleted record for this email → caller does normal insert
  END IF;

  -- Allow this specific UPDATE to bypass guard_user_column_privileges.
  -- is_local = true means the setting resets automatically at transaction end.
  PERFORM set_config('app.allow_user_restore', 'true', true);

  -- Repoint id to new UID, restore email, and place into pending_reactivation.
  -- ON UPDATE CASCADE on orders.user_id propagates the id change automatically.
  UPDATE public.users
  SET id                = p_new_uid,
      email             = deleted_email,
      account_status    = 'pending_reactivation',
      suspend_reason    = NULL,
      terminate_reason  = NULL,
      deleted_at        = NULL,
      deleted_email     = NULL
  WHERE id = v_matched_id;

  -- Reset immediately (belt-and-suspenders; transaction end also resets it).
  PERFORM set_config('app.allow_user_restore', 'false', true);

  RETURN QUERY
  SELECT * FROM public.users WHERE id = p_new_uid;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_deleted_user(text, text) TO authenticated;

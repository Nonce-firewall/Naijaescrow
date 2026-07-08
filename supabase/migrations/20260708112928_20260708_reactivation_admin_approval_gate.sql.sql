/*
# Pending reactivation gate for re-registered deleted users

## Problem
The previous migration (`20260708_reactivation_for_deleted_users.sql`) auto-reactivated
a deleted user's retained row to `account_status='active'` the moment they signed up
again. The product now requires an **admin approval step** before a re-registered
deleted user can reclaim their account: on re-registration, the user must be placed
in a pending state (denied dashboard access, told to contact admin), and the admin
must manually approve reactivation from the admin dashboard.

## Changes

### 1. Add `pending_reactivation` to the `users.account_status` CHECK constraint
The existing constraint allows `active | suspended | terminated | deleted`. We add
`pending_reactivation` so the new status is a valid, first-class account state.

### 2. Modify `restore_deleted_user(p_new_uid, p_email)` RPC
Previously: set `account_status='active'` on match (immediate reclaim).
Now: set `account_status='pending_reactivation'` on match. The row is still
repointed to the new auth UID (so `orders` cascade follows), the original email is
restored, and `deleted_email` is cleared — but the account is NOT active. The user
will be blocked at the app gate (App.tsx signs them out with a "contact admin"
message, mirroring the terminated flow). Admin later flips the status to `active`
via the admin dashboard "Reactivate" action.

### 3. Add `reactivate_pending_user(p_uid text)` SECURITY DEFINER RPC
Admin-only function that flips a `pending_reactivation` row to `active` and clears
any stale suspend/terminate reasons. SECURITY DEFINER so it bypasses the
`users: update own` RLS policy (which only lets a user update their OWN row);
admin actions run through the `users: admin update` policy, but the RPC makes the
intent explicit and auditable, and works even if admin policies are tightened later.
Guarded by an `is_admin()` check so only admin callers can execute it.

## Idempotency
- CHECK constraint drop uses `IF EXISTS`; re-add is safe.
- `restore_deleted_user` is `CREATE OR REPLACE`.
- `reactivate_pending_user` is `CREATE OR REPLACE`.
- `GRANT EXECUTE` is safe to repeat.

## Security
- `pending_reactivation` users are NOT active — the `is_account_active()` helper
  returns false for them, so they cannot place orders even if they reached the
  dashboard (defense in depth; the app gate blocks them first).
- `reactivate_pending_user` verifies `is_admin()` before updating, so a
  non-admin authenticated user cannot reactivate themselves.
*/

-- 1. Extend account_status CHECK to include pending_reactivation
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_account_status_check;
ALTER TABLE public.users ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active', 'suspended', 'terminated', 'deleted', 'pending_reactivation'));

-- 2. Replace restore_deleted_user: set pending_reactivation instead of active
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

  -- Repoint id to new UID, restore email, and place into pending_reactivation
  -- (NOT active). Admin must approve before the user can access the dashboard.
  -- ON UPDATE CASCADE on orders.user_id propagates the id change to all
  -- historical orders automatically.
  UPDATE public.users
  SET id                = p_new_uid,
      email             = deleted_email,
      account_status    = 'pending_reactivation',
      suspend_reason    = NULL,
      terminate_reason  = NULL,
      deleted_at        = NULL,
      deleted_email     = NULL
  WHERE id = v_matched_id;

  RETURN QUERY
  SELECT * FROM public.users WHERE id = p_new_uid;

  RETURN;
END;
$$;

-- 3. Admin-only reactivation RPC
CREATE OR REPLACE FUNCTION public.reactivate_pending_user(p_uid text)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can reactivate a pending account.
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reactivate pending accounts.';
    RETURN;
  END IF;

  IF p_uid IS NULL OR p_uid = '' THEN
    RETURN;
  END IF;

  -- Only reactivate rows that are actually pending; leave active/suspended/
  -- terminated/deleted rows untouched.
  UPDATE public.users
  SET account_status    = 'active',
      suspend_reason    = NULL,
      terminate_reason  = NULL
  WHERE id = p_uid
    AND account_status = 'pending_reactivation';

  RETURN QUERY
  SELECT * FROM public.users WHERE id = p_uid;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_deleted_user(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_pending_user(text) TO authenticated;

/*
# Fix: preserve deleted_at through pending_reactivation state

## Problem
`restore_deleted_user` clears `deleted_at = NULL` when it moves an account from
`deleted` → `pending_reactivation`. The admin compliance panel reads `deleted_at`
to show the DELETED AT column for both deleted and pending_reactivation rows.
Because it is cleared, DELETED AT shows "—" for every pending_reactivation account,
making it impossible for the admin to know when the user originally deleted their account.

## Fix
- `restore_deleted_user`: remove `deleted_at = NULL` from the UPDATE so the
  original deletion timestamp is preserved on the row even while pending.
- `reactivate_pending_user`: add `deleted_at = NULL` to its UPDATE so the
  timestamp is only cleared when the admin fully restores the account to active.

This is the correct lifecycle:
  deleted (deleted_at set) → re-registers → pending_reactivation (deleted_at kept)
  → admin approves → active (deleted_at cleared)
*/

-- ---------------------------------------------------------------------------
-- 1. restore_deleted_user — keep deleted_at, only clear deleted_email
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

  -- Allow this UPDATE to bypass guard_user_column_privileges (session-local).
  PERFORM set_config('app.allow_user_restore', 'true', true);

  -- Repoint id to new UID, restore email, set pending_reactivation.
  -- deleted_at is intentionally kept so the admin can see when the account
  -- was originally deleted. It is only cleared when the admin fully reactivates.
  -- ON UPDATE CASCADE on orders.user_id propagates the id change automatically.
  UPDATE public.users
  SET id                = p_new_uid,
      email             = deleted_email,
      account_status    = 'pending_reactivation',
      suspend_reason    = NULL,
      terminate_reason  = NULL,
      deleted_email     = NULL
      -- deleted_at intentionally NOT cleared here — preserved for admin display
  WHERE id = v_matched_id;

  PERFORM set_config('app.allow_user_restore', 'false', true);

  RETURN QUERY
  SELECT * FROM public.users WHERE id = p_new_uid;

  RETURN;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. reactivate_pending_user — clear deleted_at here when going fully active
-- ---------------------------------------------------------------------------
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

  -- Flip to active and clear the deletion timestamp now that the account is
  -- fully restored. Only touches rows that are actually pending.
  UPDATE public.users
  SET account_status    = 'active',
      deleted_at        = NULL,
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

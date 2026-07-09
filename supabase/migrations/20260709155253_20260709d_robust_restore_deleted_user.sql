/*
# Fix: make restore_deleted_user robust for partially-scrubbed accounts

## Problem
When a user deletes their account, the delete-account Netlify Function does a
single UPDATE setting email, deleted_email, account_status='deleted', deleted_at.
If the guard_user_column_privileges trigger fires before the service-role bypass
was added (migration 20260709b), the UPDATE transaction rolls back entirely —
BUT because the trigger was evaluated after other column changes were staged,
in some PostgreSQL versions or connection modes the partial write can persist
for some columns while the status change is blocked.

Result: rows where email is scrubbed (deleted-<uid>@removed.local) and
deleted_email is set and deleted_at is set, but account_status is still 'active'
instead of 'deleted'. The restore_deleted_user RPC only looks for
account_status='deleted', so it misses these rows and falls through to INSERT,
creating a duplicate fresh account.

## Fix
Extend the matching logic in restore_deleted_user to also find rows that show
all signs of deletion (email scrubbed to pattern, deleted_at set, deleted_email
matches) even if account_status was not properly set to 'deleted'.

Also: before the UPDATE, explicitly correct account_status to 'deleted' on any
such partially-scrubbed matching row, then proceed with the normal restoration
to pending_reactivation.

This is safe because the function is SECURITY DEFINER and runs inside the same
session-variable bypass window (app.allow_user_restore = 'true').
*/

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
  -- Matches:
  --   a) Normal case: account_status='deleted' AND deleted_email matches.
  --   b) Partial-scrub edge case: email is scrubbed (deleted-<uid>@removed.local)
  --      AND deleted_email matches AND deleted_at is set, even if account_status
  --      was not properly changed to 'deleted' (trigger timing issue at deletion).
  -- Admin rows are excluded so an admin account can never be silently re-claimed.
  SELECT id INTO v_matched_id
  FROM public.users
  WHERE role <> 'admin'
    AND deleted_email IS NOT NULL
    AND lower(deleted_email) = lower(p_email)
    AND (
      account_status = 'deleted'
      OR (
        account_status NOT IN ('pending_reactivation')
        AND email LIKE 'deleted-%@removed.local'
        AND deleted_at IS NOT NULL
      )
    )
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

GRANT EXECUTE ON FUNCTION public.restore_deleted_user(text, text) TO authenticated;

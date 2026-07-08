/*
# Reactivation for deleted users — prevent duplicate rows & preserve retained data

## Problem
When a user deletes their account, the delete-account Netlify Function:
  1. Scrubs the `email` column on their `users` row to `deleted-<uid>@removed.local`.
  2. Marks `account_status = 'deleted'` and sets `deleted_at`.
  3. Permanently deletes their Supabase Auth account (`auth.admin.deleteUser`).

The `users` row is deliberately retained (KYC data kept for fraud/legal compliance).
BUT if the same person later signs up again with the same email (email/password
or Google SSO), Supabase Auth creates a brand-new `auth.users` row with a NEW UID.
The frontend's `getOrCreateUserProfile()` then cannot find a `users` row matching
the new UID, so it INSERTs a second `users` row with role='user' and kyc_status='none'
— a duplicate. All retained history (KYC status, orders, disputes) is orphaned under
the OLD UID and never shown to the re-registered user. They are treated as a brand-new
unverified trader, defeating the retention policy.

## Solution
1. Add a `deleted_email` column to `users` that stores the original email at the
   moment of deletion (before the email column is scrubbed). This is the durable
   key we can match against on re-registration.
2. Recreate the `orders.user_id → users.id` foreign key with `ON UPDATE CASCADE`
   so that when we "re-point" a retained row to a new auth UID, every historical
   order row follows it automatically (no orphaned orders).
3. Add a SECURITY DEFINER RPC `restore_deleted_user(p_new_uid text, p_email text)`
   that:
     a. Finds the most-recently-deleted `users` row whose `deleted_email` matches
        the re-registering user's email (ignoring case).
     b. If found: updates that row's `id` to the new auth UID, resets
        `account_status='active'`, clears `deleted_at`, restores the original
        `email`, and clears `deleted_email` — in one atomic UPDATE that cascades
        to `orders.user_id`. Returns the fully-restored row.
     c. If NOT found: returns no row (NULL) — caller proceeds to normal insert.
   The function bypasses RLS via SECURITY DEFINER because the caller is the
   anon-key frontend; without it, the `USING`/`WITH CHECK` policies on `users`
   would block both the lookup (SELECT) and the repoint (UPDATE) of a row owned
   by a *different* (deleted) UID.
4. Grant EXECUTE on the RPC to `authenticated` so the signed-in frontend can call it.

## Tables / columns affected
- `users` — adds `deleted_email text` (nullable). No existing column types changed.
- `orders` — FK `orders_user_id_fkey` dropped & recreated with `ON UPDATE CASCADE`
  (delete rule unchanged: still CASCADE). No data loss; the constraint is rebuilt
  on the same column pair.
- New function `public.restore_deleted_user(text, text)`.

## Security
- `restore_deleted_user` is `SECURITY DEFINER` with `search_path = public`.
  It only ever updates a row where `account_status = 'deleted'` AND
  `deleted_email` ILIKE the supplied email — it can never touch an active user's
  row. The new UID is taken from `auth.uid()` of the caller, guaranteeing the
  re-pointed row is owned by the genuinely authenticated new session.
- No RLS policies are changed. The existing `users` policies continue to govern
  direct client SELECT/UPDATE; the RPC is an explicit, audited escape hatch.
- `deleted_email` is cleared immediately upon successful reactivation, so it does
  not persist as a long-lived PII field — it only exists during the
  deleted-but-not-yet-reactivated window.

## Idempotency
- `ADD COLUMN IF NOT EXISTS` for `deleted_email`.
- FK drop uses `IF EXISTS`.
- Function is `CREATE OR REPLACE`.
- `GRANT EXECUTE` is safe to repeat.
- Re-running after reactivation is a no-op: once `deleted_email` is cleared, the
  function's WHERE clause no longer matches and it returns NULL.
*/

-- 1. deleted_email column — stores original email at deletion time
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_email text;

-- 2. Recreate orders → users FK with ON UPDATE CASCADE so repointing the
--    users.id to a new auth UID automatically updates every historical order.
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_user_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- 3. restore_deleted_user RPC
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
  -- This prevents one authenticated user from "claiming" another's deleted row.
  IF p_new_uid IS NULL OR p_new_uid = '' OR p_new_uid <> auth.uid()::text THEN
    RAISE EXCEPTION 'Caller UID does not match authenticated session.';
    RETURN;
  END IF;

  IF p_email IS NULL OR p_email = '' THEN
    RETURN;
  END IF;

  -- Find the most-recently-deleted row for this email. Order by deleted_at DESC
  -- so that if (somehow) multiple deleted rows exist for the same email, we
  -- restore the latest one. is_admin rows are excluded so an admin account can
  -- never be silently re-claimed by a re-registration.
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

  -- Atomic reactivation: repoint id to new UID, restore email, reactivate.
  -- ON UPDATE CASCADE on orders.user_id propagates the id change to all
  -- historical orders automatically.
  UPDATE public.users
  SET id                = p_new_uid,
      email             = deleted_email,
      account_status    = 'active',
      suspend_reason    = NULL,
      terminate_reason  = NULL,
      deleted_at        = NULL,
      deleted_email     = NULL
  WHERE id = v_matched_id;

  -- Return the restored row (single row). Using SETOF + RETURN NEXT so the
  -- caller can treat it uniformly as a query result.
  RETURN QUERY
  SELECT * FROM public.users WHERE id = p_new_uid;

  RETURN;
END;
$$;

-- 4. Grant execute to authenticated (frontend calls this right after sign-up)
GRANT EXECUTE ON FUNCTION public.restore_deleted_user(text, text) TO authenticated;

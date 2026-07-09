/*
# Harden the disputes backfill against ambiguous email matches

## Why
Code review of `20260709_disputes_fk_cascade_fix.sql` flagged that its backfill
joins orphaned disputes/messages to `public.users` by `lower(email)` alone.
`users.email` has no UNIQUE constraint, so if two `users` rows ever share an
email (e.g. multiple past soft-deletes of the same address, or a future bug),
the UPDATE...FROM join could non-deterministically pick either match and
reassign a dispute to the wrong account — a real cross-account visibility risk
under RLS.

This migration doesn't need to redo the backfill (it already ran and is a
no-op now that disputes.user_id has a valid FK), but it removes the ambiguity
risk for any future orphan repair, and prevents the underlying cause going
forward.

## Fix
1. Enforce uniqueness on `users.email` (case-insensitive) so an email can only
   ever map to a single account, matching how Supabase Auth already treats
   email as unique. If duplicates exist today, this step is skipped with a
   NOTICE instead of failing the migration — surface it for manual cleanup.
2. Any future re-run of similar backfill logic against this table can now
   rely on the email match being unique instead of merging on an
   unconstrained column.
*/

DO $$
DECLARE
  dup_count INT;
BEGIN
  SELECT COUNT(*) INTO dup_count FROM (
    SELECT lower(email) FROM public.users GROUP BY lower(email) HAVING COUNT(*) > 1
  ) d;

  IF dup_count > 0 THEN
    RAISE NOTICE 'Skipping unique email index: % email(s) are shared by multiple users rows — review and merge/clean up manually before re-running this migration.', dup_count;
  ELSE
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON public.users (lower(email))';
  END IF;
END $$;

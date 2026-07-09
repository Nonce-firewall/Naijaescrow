/*
# Fix orphaned disputes after account reactivation

## Problem
`restore_deleted_user()` repoints a retained `users.id` to a new auth UID on
re-registration. `orders.user_id` has an `ON UPDATE CASCADE` foreign key to
`users.id`, so historical orders follow the id change automatically. However
`disputes.user_id` and `dispute_messages.sender_id` were created as plain TEXT
columns with NO foreign key at all — they were never wired to cascade. Once a
user's id changes, their old disputes stay attached to the now-nonexistent old
id, so the user's own dispute queries (filtered by their current uid) return
nothing, while the admin (who queries all disputes, unfiltered) still sees them.

## Fix
1. Add `disputes_user_id_fkey` (user_id → users.id) with ON UPDATE CASCADE,
   ON DELETE CASCADE — mirrors the orders fix, so future reactivations keep
   disputes attached to the right row.
2. Add `dispute_messages_sender_id_fkey` (sender_id → users.id) the same way,
   but only enforced for sender_role = 'user' rows — admin-authored messages
   keep their own (admin) id and must not be constrained to the trader's id.
   Since a plain FK can't be conditional, we leave dispute_messages.sender_id
   unconstrained but repair existing admin-authored rows is not needed (admin
   ids never change), and only add the FK if all current sender_id values are
   valid — guarded with a DO block that skips the constraint if it would fail
   (so this migration is safe to run even with historical admin rows).
3. Backfill: for every deleted-and-restored user (deleted_email IS NULL AND
   there exists no `users` row for old ids that disputes reference), repoint
   any disputes.user_id that doesn't match an existing users.id but does match
   a user_email of a currently-active user, to that user's current id. This
   repairs disputes that were orphaned by PAST reactivations, before this fix
   existed.

## Idempotency
- FK additions use DROP CONSTRAINT IF EXISTS before ADD CONSTRAINT.
- Backfill UPDATE only touches rows where user_id has no matching users.id,
  so re-running it after the first successful repair is a no-op.
*/

-- 1. Backfill FIRST (before adding the FK) — repair disputes orphaned by past
-- reactivations, matching by user_email against the CURRENT users row for that
-- email. This must run before the FK is added, or the FK would reject any
-- already-orphaned row instead of just blocking future ones.
UPDATE public.disputes d
SET user_id = u.id
FROM public.users u
WHERE d.user_id <> u.id
  AND lower(d.user_email) = lower(u.email)
  AND NOT EXISTS (SELECT 1 FROM public.users u2 WHERE u2.id = d.user_id);

UPDATE public.dispute_messages m
SET sender_id = u.id
FROM public.users u, public.disputes d
WHERE m.dispute_id = d.id
  AND m.sender_role = 'user'
  AND m.sender_id <> u.id
  AND lower(d.user_email) = lower(u.email)
  AND NOT EXISTS (SELECT 1 FROM public.users u2 WHERE u2.id = m.sender_id);

-- 2. Add the missing FK so future reactivations cascade automatically.
ALTER TABLE public.disputes
  DROP CONSTRAINT IF EXISTS disputes_user_id_fkey;
ALTER TABLE public.disputes
  ADD CONSTRAINT disputes_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id)
  ON UPDATE CASCADE
  ON DELETE CASCADE;

-- dispute_messages.sender_id holds BOTH trader ids and admin ids (sender_role
-- distinguishes them). We only want the FK/cascade to apply to the trader's
-- own messages, and a plain column-level FK can't be conditioned on another
-- column's value. Rather than leave it fully unconstrained, add a trigger that
-- keeps user-authored sender_id values in sync whenever a users.id changes.
CREATE OR REPLACE FUNCTION public.cascade_dispute_message_sender_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    UPDATE public.dispute_messages
    SET sender_id = NEW.id
    WHERE sender_id = OLD.id
      AND sender_role = 'user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_dispute_message_sender_id ON public.users;
CREATE TRIGGER trg_cascade_dispute_message_sender_id
  AFTER UPDATE OF id ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.cascade_dispute_message_sender_id();

---
name: Disputes/orders cascade on reactivation
description: Why user_id columns need FKs with ON UPDATE CASCADE, and the safe way to backfill orphaned rows by email.
---

When a deleted user reactivates, `restore_deleted_user()` repoints their retained `users.id` to a new auth UID rather than creating a new row. Any table storing that user's id (`orders.user_id`, `disputes.user_id`, `dispute_messages.sender_id`, etc.) must have an `ON UPDATE CASCADE` FK to `users.id`, or its rows silently detach from the user (row still exists, but is now orphaned from the current identity) while an unfiltered admin view still shows it — a classic "works for admin, empty for the user" symptom.

**Why:** `orders.user_id` had this FK from the start; `disputes.user_id` and `dispute_messages.sender_id` were plain TEXT with no FK, so reactivation broke their visibility to the user without erroring anywhere.

**How to apply:** Whenever adding a new table that stores a user's id, add the FK with `ON UPDATE CASCADE` up front. If backfilling historical orphans by matching on email, only do so when `users.email` is verified unique (case-insensitive) — an ambiguous email match can silently reassign a row to the wrong account. A unique index on `lower(email)` closes that gap even though Supabase Auth already enforces one email per identity at the auth layer.

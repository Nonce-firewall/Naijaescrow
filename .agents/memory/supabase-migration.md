---
name: Supabase migration notes
description: Firebase fully replaced with Supabase; schema quirks and pitfalls for this project.
---

## Schema: users.id is TEXT, not UUID
`users.id` is `TEXT PRIMARY KEY` mirroring `auth.uid()` stored as text.
Any comparison must cast: `auth.uid()::text`.
Wrong: `WHERE id = auth.uid()` → "operator does not exist: text = uuid"
Right: `WHERE id = auth.uid()::text`

## Trigger bypass: service-role key does NOT bypass triggers
Supabase service-role key bypasses RLS policies but NOT database triggers.
Inside a trigger, `auth.uid()` returns NULL for service-role requests (no `sub` in JWT).
To detect service-role inside a trigger: `(auth.jwt() ->> 'role') = 'service_role'`
Add this as the first bypass check so Netlify/Edge Functions can write admin-only columns.

## Trigger bypass: SQL Editor runs as postgres, not service-role
Direct SQL in Supabase SQL Editor also has NULL `auth.jwt()`, so service-role
and is_admin() checks both fail. For one-time backfill UPDATEs blocked by triggers:
```sql
ALTER TABLE users DISABLE TRIGGER <trigger_name>;
-- run backfill UPDATE --
ALTER TABLE users ENABLE TRIGGER <trigger_name>;
```

## is_admin_email() broken dollar-quote
Original migration 20260706_rls_indexes.sql used single `$` instead of `$$` as
dollar-quote delimiter for is_admin_email() body — silently failed to create the function.
Fixed in 20260709_fix_service_role_deleted_at.sql which recreates both helpers correctly.

## Running full schema
The full schema SQL must be run in Supabase SQL Editor before first use.
Migrations are in supabase/migrations/ — run in filename order.

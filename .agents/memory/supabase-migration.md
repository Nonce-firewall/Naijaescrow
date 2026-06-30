---
name: Supabase migration — 9ija Escrow
description: Firebase was fully replaced with Supabase. Key decisions, schema, and setup steps.
---

## What changed
- `src/lib/supabase.ts` — Supabase client using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `src/lib/dbHelpers.ts` — all Firestore calls replaced with Supabase queries; mapper helpers: `rowToSettings`, `rowToUserProfile`, `rowToOrder`, `rowToAnnouncement`, `rowToCoin`
- `src/App.tsx` — uses `supabase.auth.onAuthStateChange` + Supabase Realtime channels per table
- `src/components/AuthPage.tsx` — `supabase.auth.signInWithPassword` / `signUp` / `signInWithOAuth`
- `src/components/Navbar.tsx` — `supabase.auth.signOut()`

## Schema
Tables: `users`, `settings`, `orders`, `announcements`, `coins`
- All use RLS with open `allow all` policies (app handles auth logic)
- All enabled on `supabase_realtime` publication
- `settings` has a single row with id `admin_settings`
- `users.id` = Supabase Auth UID (text, not UUID)

**Why:** Supabase Auth UIDs come back as text from `session.user.id`; the column must be `text`, not `uuid`.

## Setup requirement
User must run `supabase-schema.sql` in Supabase SQL Editor before the app works.

## Admin email
`cryptogangstar247@gmail.com` is auto-promoted to admin role on first login.

## Column naming
DB uses snake_case (`kyc_status`, `ngn_bank_name`, `wallet_bsc`, `is_active`, `logo_url`, etc.)
TypeScript types use camelCase — mapper helpers handle the conversion.

## Sandbox test accounts
- Admin: `cryptogangstar247@gmail.com` / `admin123`
- User: `local_trader@9ija.com` / `trader123`
(AuthPage sandbox buttons auto-create these if they don't exist yet)

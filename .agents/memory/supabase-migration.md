---
name: Supabase migration — 9ija Escrow
description: Firebase fully replaced with Supabase. Key schema, setup steps, and rate/dispute architecture.
---

## What changed
- `src/lib/supabase.ts` — Supabase client using `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- `src/lib/dbHelpers.ts` — all Firestore calls replaced with Supabase queries; mapper helpers: `rowToSettings`, `rowToUserProfile`, `rowToOrder`, `rowToAnnouncement`, `rowToCoin`
- `src/App.tsx` — uses `supabase.auth.onAuthStateChange` + Supabase Realtime channels per table
- `src/components/AuthPage.tsx` — `supabase.auth.signInWithPassword` / `signUp` / `signInWithOAuth`
- `src/components/Navbar.tsx` — `supabase.auth.signOut()`

## Schema
Tables: `users`, `settings`, `orders`, `announcements`, `coins`, `dispute_messages`
- All use RLS with open `allow all` policies (app handles auth logic), except `dispute_messages` which has strict per-role policies
- All enabled on `supabase_realtime` publication
- `settings` has a single row with id `admin_settings`
- `users.id` = Supabase Auth UID (text, not UUID)

**Why:** Supabase Auth UIDs come back as text from `session.user.id`; the column must be `text`, not `uuid`.

## Setup requirement
User must run these SQL files in Supabase SQL Editor in order:
1. `supabase-schema.sql` — initial schema
2. `supabase/migrations/20260706_rls_indexes.sql` — RLS + indexes
3. `supabase/migrations/20260706_rate_split_dispute_chat.sql` — rate split + dispute_messages table

## Rate architecture (post-migration)
- Old single `usdt_rate` column replaced with `usdt_sell_markup` + `usdt_buy_markup` (NGN added on top of live CoinGecko market rate).
- `rowToSettings` has backward-compat fallback: `usdt_sell_markup ?? usdt_rate ?? DEFAULT`.
- The settings SELECT query in App.tsx reads BOTH old and new columns so it works pre- and post-migration.
- `liveNgnRate` is fetched once in App.tsx (every 5 min), passed as prop to all child components.
- `effectiveSellRate = liveNgnRate + usdtSellMarkup` — used for hero display, dashboard banner, sell orders.
- `effectiveBuyRate = liveNgnRate + usdtBuyMarkup` — used only at buy-order creation time.

## Dispute chat
- `dispute_messages` table with RLS: users can only read their own disputes; admins can read all; INSERT enforced via trigger that overwrites sender_id/sender_email/sender_role from auth identity (prevents spoofing).
- `DisputeChat.tsx` shared component: Supabase realtime subscription, insert-then-append (no optimistic temp ID to avoid duplicates), auto-scroll.
- Used in both AdminCMS (with resolve action) and UserDashboard (inside expanded dispute card).

## Admin email
`cryptogangstar247@gmail.com` is auto-promoted to admin role on first login.

## Column naming
DB uses snake_case (`kyc_status`, `ngn_bank_name`, `wallet_bsc`, `is_active`, `logo_url`, etc.)
TypeScript types use camelCase — mapper helpers handle the conversion.

## Sandbox test accounts
- Admin: `cryptogangstar247@gmail.com` / `admin123`
- User: `local_trader@9ija.com` / `trader123`
(AuthPage sandbox buttons auto-create these if they don't exist yet)

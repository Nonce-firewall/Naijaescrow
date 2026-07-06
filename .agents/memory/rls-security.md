---
name: RLS and security hardening
description: Row Level Security policies, column-escalation trigger, indexes, and input validation patterns for 9ija Escrow.
---

## Key decisions

**auth helper for email check in SQL:**
`auth.email()` is NOT a Supabase built-in. Use `(auth.jwt() ->> 'email')` instead.

**Admin email hardcoded in DB:**
`cryptogangstar247@gmail.com` is hardcoded in two SECURITY DEFINER SQL functions (`is_admin_email()`) and in `src/lib/dbHelpers.ts` (`getOrCreateUserProfile`). If the admin email ever changes, update both the SQL function and the TS constant.

**RLS column escalation fix pattern:**
RLS policies control rows, not columns. To block privilege escalation (e.g. `role='admin'` self-write), use a `BEFORE UPDATE` trigger (`guard_user_column_privileges`) that compares OLD vs NEW values and raises a 42501 EXCEPTION for non-admin callers. The trigger uses `is_admin() OR is_admin_email()` to allow legitimate admin writes including first-login self-promotion.

**service-role key bypasses RLS automatically:**
The `delete-account` Netlify function uses service-role key → it bypasses RLS with no extra policy needed. Don't add policies for service-role operations.

**Columns users CAN update themselves:**
- `notification_preferences` — user settings
- `kyc_status` → only to 'pending' or 'none' (submit / reset)
- `kyc_data` — KYC submission payload

**Columns blocked for non-admin updates:**
- `role`, `account_status`, `suspend_reason`, `terminate_reason`, `deleted_at`, `email`

## SQL migration location
`supabase/migrations/20260706_rls_indexes.sql` — run in Supabase SQL Editor (idempotent).

## Input validation added (UserDashboard.tsx)
- Bank account: `/^\d{10}$/` (NUBAN)
- BSC/Polygon TX hash: `/^0x[0-9a-fA-F]{64}$/`
- Tron TX hash: `/^[0-9a-fA-F]{64}$/` (no 0x prefix); detected via `.includes('tron')` on network name
- KYC ID number: `/^[A-Z0-9]{6,20}$/i`
- KYC full name: must contain ≥2 space-separated words
- Dispute message: maxLength 1000 chars, validated before submit

## DB query optimizations (App.tsx + dbHelpers.ts)
- All `select('*')` replaced with explicit column strings matching the rowTo* mapper functions
- Admin orders: `.limit(2000)` cap
- Admin users: `.limit(5000)` cap
- `submitKYC` and `handleKYCReview` now throw on Supabase errors (were silently failing)

## Security headers
- `netlify.toml` — global headers block with CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy
- `delete-account.mts` — security headers on success response

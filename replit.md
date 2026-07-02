# 9ija Escrow

Nigeria's Premier P2P Escrow Ledger — a React/Vite web app for trading NGN ↔ USDT with KYC verification, real-time order tracking, and an admin CMS.

## Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4
- **Backend/DB**: Supabase (auth, Postgres, realtime)
- **AI**: Google Gemini (`@google/genai`)
- **Animations**: Motion (Framer Motion)

## Running locally

```bash
npm install && npm run dev
```

App runs on port 5000.

## Required secrets
Set these in Replit Secrets (or `.env.local` locally):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key

## Database setup
Run `supabase-schema.sql` in your Supabase project's **SQL Editor** before first use. It is safe to re-run (uses `IF NOT EXISTS` guards). This creates all tables, RLS policies, realtime subscriptions, and seeds default settings.

The schema includes a `disputes` table referenced in the app — if that table is missing, apply `migration.sql` as well.

### RLS security fix (existing databases)
If you already have a live database running the old open `USING(true)` policies, apply **`rls-fix.sql`** in the SQL Editor. It is safe to re-run and:
- Creates the `is_admin()` helper function (used by all policies)
- Locks users/orders/disputes so each user can only see and edit their own rows
- Restricts admin-only mutations (KYC review, order approval, settings, coins, announcements) to the admin account
- Keeps settings, announcements, and coins publicly readable (needed for the landing page)

Fresh installs using `supabase-schema.sql` already include these correct policies.

## Account deletion (Supabase Edge Function)
The "Delete Account" option (Navbar → Account menu) permanently deletes the user's Supabase Auth login while retaining their `kyc_status`/`kyc_data` for fraud/legal purposes. This requires the service-role key, so the actual deletion runs server-side in a Supabase Edge Function — **it will not work until deployed**:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy delete-account
```

Function source: `supabase/functions/delete-account/index.ts`. Supabase auto-injects `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` into edge functions — no manual secret setup needed.

## Project structure
- `src/App.tsx` — root component; auth state, realtime subscriptions, page routing
- `src/components/` — all UI components (Navbar, LandingPage, AuthPage, UserDashboard, AdminCMS, etc.)
- `src/lib/supabase.ts` — Supabase client
- `src/lib/dbHelpers.ts` — DB query helpers and row mappers
- `src/types.ts` — shared TypeScript types

## User preferences

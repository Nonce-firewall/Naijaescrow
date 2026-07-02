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

## Project structure
- `src/App.tsx` — root component; auth state, realtime subscriptions, page routing
- `src/components/` — all UI components (Navbar, LandingPage, AuthPage, UserDashboard, AdminCMS, etc.)
- `src/lib/supabase.ts` — Supabase client
- `src/lib/dbHelpers.ts` — DB query helpers and row mappers
- `src/types.ts` — shared TypeScript types

## User preferences

-- ============================================================
-- 9ija Escrow — Supabase Schema (PostgREST / Data API ready)
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 0. SCHEMA USAGE GRANTS
--    PostgREST needs USE on the public schema for both roles.
-- ──────────────────────────────────────────────────────────
grant usage on schema public to anon, authenticated;

-- ──────────────────────────────────────────────────────────
-- 1. TABLES
-- ──────────────────────────────────────────────────────────

-- Users (mirrors Supabase auth.users — id is the auth UID)
create table if not exists public.users (
  id            text        primary key,
  email         text        not null,
  role          text        not null default 'user'
                              check (role in ('user', 'admin')),
  kyc_status    text        not null default 'none'
                              check (kyc_status in ('none', 'pending', 'approved', 'rejected')),
  kyc_data      jsonb,
  notification_preferences jsonb,
  deleted_at    bigint,
  created_at    bigint      not null default (extract(epoch from now()) * 1000)::bigint
);

-- Notification preferences column for existing installs (safe idempotent)
alter table public.users add column if not exists notification_preferences jsonb;

-- Account deletion audit trail (when account was scrubbed via delete-account Edge Function)
alter table public.users add column if not exists deleted_at bigint;

-- Settings (single-row admin config, id = 'admin_settings')
create table if not exists public.settings (
  id                  text     primary key,
  ngn_bank_name       text     not null default 'Zenith Bank',
  ngn_account_number  text     not null default '1012345678',
  ngn_account_name    text     not null default '9ija Escrow Ltd.',
  usdt_rate           numeric  not null default 1540,
  wallet_bsc          text     not null default '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
  wallet_tron         text     not null default 'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
  wallet_polygon      text     not null default '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
);

-- Orders
create table if not exists public.orders (
  id                  uuid     primary key default gen_random_uuid(),
  user_id             text     not null references public.users(id) on delete cascade,
  user_email          text     not null,
  type                text     not null check (type in ('buy', 'sell')),
  crypto_amount       numeric  not null,
  ngn_amount          numeric  not null,
  rate                numeric  not null,
  status              text     not null default 'pending'
                                 check (status in ('pending', 'completed', 'rejected')),
  network             text     not null,
  token               text     not null default 'USDT',
  payment_screenshot  text     not null,
  user_bank_details   jsonb,
  admin_bank_details  jsonb,
  admin_wallet_address text,
  blockchain_tx_id    text,
  rejection_reason    text,
  created_at          bigint   not null default (extract(epoch from now()) * 1000)::bigint,
  processed_at        bigint
);

-- Announcements
create table if not exists public.announcements (
  id          uuid     primary key default gen_random_uuid(),
  title       text     not null,
  content     text     not null,
  scope       text     not null default 'all'
                         check (scope in ('public', 'private', 'all')),
  is_active   boolean  not null default true,
  created_at  bigint   not null default (extract(epoch from now()) * 1000)::bigint
);

-- Coins
create table if not exists public.coins (
  id              uuid     primary key default gen_random_uuid(),
  name            text     not null,
  symbol          text     not null,
  network         text     not null,
  wallet_address  text     not null,
  rate            numeric  not null,
  logo_url        text,
  published       boolean  not null default true,
  created_at      bigint   not null default (extract(epoch from now()) * 1000)::bigint
);

-- ──────────────────────────────────────────────────────────
-- 2. EXPLICIT TABLE-LEVEL GRANTS (required by PostgREST)
--    Without these the Data API returns 403 even with
--    permissive RLS policies.
-- ──────────────────────────────────────────────────────────

-- anon role  → read-only on public/config tables; full on users+orders for unauthenticated SDK calls
grant select, insert, update, delete on public.users         to anon, authenticated;
grant select                          on public.settings      to anon, authenticated;
grant select, insert, update, delete  on public.orders        to anon, authenticated;
grant select                          on public.announcements to anon, authenticated;
grant select                          on public.coins         to anon, authenticated;

-- Allow admins (via authenticated role) to mutate settings, announcements, coins
grant insert, update, delete on public.settings      to authenticated;
grant insert, update, delete on public.announcements to authenticated;
grant insert, update, delete on public.coins         to authenticated;

-- ──────────────────────────────────────────────────────────
-- 3. ROW-LEVEL SECURITY
-- ──────────────────────────────────────────────────────────
alter table public.users         enable row level security;
alter table public.settings      enable row level security;
alter table public.orders        enable row level security;
alter table public.announcements enable row level security;
alter table public.coins         enable row level security;

-- Drop old catch-all policies if they exist (safe re-run)
drop policy if exists "Allow all on users"         on public.users;
drop policy if exists "Allow all on settings"      on public.settings;
drop policy if exists "Allow all on orders"        on public.orders;
drop policy if exists "Allow all on announcements" on public.announcements;
drop policy if exists "Allow all on coins"         on public.coins;

-- ── users ──────────────────────────────────────────────────
-- Anyone can insert their own row (sign-up flow uses anon key)
create policy "users: anon insert"
  on public.users for insert
  to anon, authenticated
  with check (true);

-- Anyone can read any user row (admin KYC listing needs this)
create policy "users: read all"
  on public.users for select
  to anon, authenticated
  using (true);

-- Users can update only their own row; admin app uses anon key so allow all updates
create policy "users: update all"
  on public.users for update
  to anon, authenticated
  using (true)
  with check (true);

-- ── settings ───────────────────────────────────────────────
-- Public read so landing page rate card works without auth
create policy "settings: public read"
  on public.settings for select
  to anon, authenticated
  using (true);

-- Only authenticated (admin) can upsert
create policy "settings: authenticated upsert"
  on public.settings for insert
  to authenticated
  with check (true);

create policy "settings: authenticated update"
  on public.settings for update
  to authenticated
  using (true)
  with check (true);

-- ── orders ─────────────────────────────────────────────────
create policy "orders: read all"
  on public.orders for select
  to anon, authenticated
  using (true);

create policy "orders: insert"
  on public.orders for insert
  to anon, authenticated
  with check (true);

create policy "orders: update"
  on public.orders for update
  to anon, authenticated
  using (true)
  with check (true);

-- ── announcements ──────────────────────────────────────────
create policy "announcements: public read"
  on public.announcements for select
  to anon, authenticated
  using (true);

create policy "announcements: authenticated write"
  on public.announcements for insert
  to authenticated
  with check (true);

create policy "announcements: authenticated update"
  on public.announcements for update
  to authenticated
  using (true)
  with check (true);

create policy "announcements: authenticated delete"
  on public.announcements for delete
  to authenticated
  using (true);

-- ── coins ──────────────────────────────────────────────────
create policy "coins: public read"
  on public.coins for select
  to anon, authenticated
  using (true);

create policy "coins: authenticated write"
  on public.coins for insert
  to authenticated
  with check (true);

create policy "coins: authenticated update"
  on public.coins for update
  to authenticated
  using (true)
  with check (true);

create policy "coins: authenticated delete"
  on public.coins for delete
  to authenticated
  using (true);

-- ──────────────────────────────────────────────────────────
-- 4. REALTIME PUBLICATION
--    Add tables to the realtime publication so Supabase
--    Realtime channels can broadcast row changes.
-- ──────────────────────────────────────────────────────────
do $$
begin
  -- Each alter is wrapped so a duplicate-table error doesn't abort the whole block
  begin
    alter publication supabase_realtime add table public.users;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.settings;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.orders;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.announcements;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.coins;
  exception when duplicate_object then null;
  end;
end $$;

-- ──────────────────────────────────────────────────────────
-- 5. SEED DEFAULT SETTINGS ROW
--    Inserts once; ignored on re-run (ON CONFLICT DO NOTHING)
-- ──────────────────────────────────────────────────────────
insert into public.settings (
  id, ngn_bank_name, ngn_account_number, ngn_account_name,
  usdt_rate, wallet_bsc, wallet_tron, wallet_polygon
) values (
  'admin_settings',
  'Zenith Bank',
  '1012345678',
  '9ija Escrow Ltd.',
  1540,
  '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
  'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
) on conflict (id) do nothing;

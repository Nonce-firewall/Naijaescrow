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
  id                       text    primary key,
  email                    text    not null,
  role                     text    not null default 'user'
                                     check (role in ('user', 'admin')),
  kyc_status               text    not null default 'none'
                                     check (kyc_status in ('none', 'pending', 'approved', 'rejected')),
  kyc_data                 jsonb,
  account_status           text    not null default 'active'
                                     check (account_status in ('active', 'suspended', 'terminated', 'deleted')),
  suspend_reason           text,
  terminate_reason         text,
  notification_preferences jsonb,
  deleted_at               bigint,
  created_at               bigint  not null default (extract(epoch from now()) * 1000)::bigint
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

-- Disputes
create table if not exists public.disputes (
  id             uuid     primary key default gen_random_uuid(),
  order_id       text     not null,
  user_id        text     not null,
  user_email     text     not null,
  message        text     not null,
  image_url      text,
  image_urls     text,
  status         text     not null default 'open'
                            check (status in ('open', 'resolved')),
  admin_response text,
  created_at     bigint   not null,
  resolved_at    bigint
);

-- ──────────────────────────────────────────────────────────
-- 2. EXPLICIT TABLE-LEVEL GRANTS (required by PostgREST)
--    Without these the Data API returns 403 even with
--    permissive RLS policies.
-- ──────────────────────────────────────────────────────────

grant select, insert, update on public.users         to authenticated;
grant select                  on public.settings      to anon, authenticated;
grant select, insert          on public.orders        to authenticated;
grant select, update          on public.orders        to authenticated;
grant select                  on public.announcements to anon, authenticated;
grant select                  on public.coins         to anon, authenticated;
grant select, insert, update  on public.disputes      to authenticated;

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
alter table public.disputes      enable row level security;

-- Drop ALL known policy names (old and current) so re-runs are always safe
-- ── users ──────────────────────────────────────────────────
drop policy if exists "Allow all on users"           on public.users;
drop policy if exists "users: anon insert"           on public.users;
drop policy if exists "users: read all"              on public.users;
drop policy if exists "users: update all"            on public.users;
drop policy if exists "users: own insert"            on public.users;
drop policy if exists "users: read own or admin"     on public.users;
drop policy if exists "users: update own"            on public.users;
drop policy if exists "users: admin update"          on public.users;
drop policy if exists "users: admin email bootstrap" on public.users;
-- ── settings ───────────────────────────────────────────────
drop policy if exists "Allow all on settings"           on public.settings;
drop policy if exists "settings: public read"           on public.settings;
drop policy if exists "settings: authenticated upsert"  on public.settings;
drop policy if exists "settings: authenticated update"  on public.settings;
drop policy if exists "settings: admin insert"          on public.settings;
drop policy if exists "settings: admin update"          on public.settings;
-- ── orders ─────────────────────────────────────────────────
drop policy if exists "Allow all on orders"       on public.orders;
drop policy if exists "orders: read all"          on public.orders;
drop policy if exists "orders: insert"            on public.orders;
drop policy if exists "orders: update"            on public.orders;
drop policy if exists "orders: read own or admin" on public.orders;
drop policy if exists "orders: own insert"        on public.orders;
drop policy if exists "orders: admin update"      on public.orders;
-- ── announcements ──────────────────────────────────────────
drop policy if exists "Allow all on announcements"          on public.announcements;
drop policy if exists "announcements: public read"          on public.announcements;
drop policy if exists "announcements: authenticated write"  on public.announcements;
drop policy if exists "announcements: authenticated update" on public.announcements;
drop policy if exists "announcements: authenticated delete" on public.announcements;
drop policy if exists "announcements: admin insert"         on public.announcements;
drop policy if exists "announcements: admin update"         on public.announcements;
drop policy if exists "announcements: admin delete"         on public.announcements;
-- ── coins ──────────────────────────────────────────────────
drop policy if exists "Allow all on coins"         on public.coins;
drop policy if exists "coins: public read"         on public.coins;
drop policy if exists "coins: authenticated write"  on public.coins;
drop policy if exists "coins: authenticated update" on public.coins;
drop policy if exists "coins: authenticated delete" on public.coins;
drop policy if exists "coins: admin insert"         on public.coins;
drop policy if exists "coins: admin update"         on public.coins;
drop policy if exists "coins: admin delete"         on public.coins;
-- ── disputes ───────────────────────────────────────────────
drop policy if exists "allow all"                   on public.disputes;
drop policy if exists "disputes: read own or admin" on public.disputes;
drop policy if exists "disputes: own insert"        on public.disputes;
drop policy if exists "disputes: admin update"      on public.disputes;

-- ── Helper: admin check ────────────────────────────────────
-- Reads the users table as postgres superuser (security definer)
-- so RLS on users itself doesn't cause circular evaluation.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $
  select exists (
    select 1 from public.users
     where id   = auth.uid()::text
       and role = 'admin'
  );
$;

-- ── Helper: active account check ─────────────────────────────
-- Returns true only if the user's account_status is 'active'.
-- Used to block order creation for suspended/terminated accounts.
create or replace function public.is_account_active()
returns boolean
language sql
security definer
stable
set search_path = public
as $
  select exists (
    select 1 from public.users
     where id = auth.uid()::text
       and account_status = 'active'
  );
$;

-- Grant execute on helper functions to authenticated users
grant execute on function public.is_account_active() to anon, authenticated;

-- ── users ──────────────────────────────────────────────────
-- Regular users insert their own row at sign-up with role='user'.
-- The admin email may also self-provision with role='admin' on first sign-up.
create policy "users: own insert"
  on public.users for insert
  to authenticated
  with check (
    auth.uid()::text = id
    and (
      (role = 'user' and kyc_status = 'none')
      or (auth.jwt() ->> 'email') = 'cryptogangstar247@gmail.com'
    )
  );

-- Users see their own row; admin sees all rows (KYC listing, user management)
create policy "users: read own or admin"
  on public.users for select
  to authenticated
  using (auth.uid()::text = id or is_admin());

-- Regular users can update their own row (profile, KYC submit, notification prefs)
-- but CANNOT change their role — role = 'user' is enforced in WITH CHECK.
create policy "users: update own"
  on public.users for update
  to authenticated
  using  (auth.uid()::text = id and not is_admin())
  with check (auth.uid()::text = id and role = 'user');

-- Admin (properly provisioned in DB) can update any row.
create policy "users: admin update"
  on public.users for update
  to authenticated
  using  (is_admin())
  with check (true);

-- Bootstrap-only: lets the admin email fix their OWN row when is_admin() is
-- false (e.g. DB role got corrupted). Scoped to own row, fires only when
-- is_admin() would otherwise deny access.
create policy "users: admin email bootstrap"
  on public.users for update
  to authenticated
  using  (
    (auth.jwt() ->> 'email') = 'cryptogangstar247@gmail.com'
    and auth.uid()::text = id
    and not is_admin()
  )
  with check (
    (auth.jwt() ->> 'email') = 'cryptogangstar247@gmail.com'
    and auth.uid()::text = id
  );

-- ── settings ───────────────────────────────────────────────
-- Public read — landing page exchange rate works without auth
create policy "settings: public read"
  on public.settings for select
  to anon, authenticated
  using (true);

-- Only admin can change platform settings
create policy "settings: admin insert"
  on public.settings for insert
  to authenticated
  with check (is_admin());

create policy "settings: admin update"
  on public.settings for update
  to authenticated
  using  (is_admin())
  with check (true);

-- ── orders ─────────────────────────────────────────────────
-- Users see their own orders; admin sees all (order management)
create policy "orders: read own or admin"
  on public.orders for select
  to authenticated
  using (auth.uid()::text = user_id or is_admin());

-- Users can only place orders tied to their own uid AND with active account status
create policy "orders: own insert"
  on public.orders for insert
  to authenticated
  with check (
    auth.uid()::text = user_id
    and public.is_account_active()
  );

-- Only admin can update orders (approve / reject / add tx ID)
create policy "orders: admin update"
  on public.orders for update
  to authenticated
  using  (is_admin())
  with check (true);

-- ── announcements ──────────────────────────────────────────
-- Public read — visible on landing page and to all logged-in users
create policy "announcements: public read"
  on public.announcements for select
  to anon, authenticated
  using (true);

create policy "announcements: admin insert"
  on public.announcements for insert
  to authenticated
  with check (is_admin());

create policy "announcements: admin update"
  on public.announcements for update
  to authenticated
  using  (is_admin())
  with check (true);

create policy "announcements: admin delete"
  on public.announcements for delete
  to authenticated
  using (is_admin());

-- ── coins ──────────────────────────────────────────────────
-- Public read — coin listings visible on landing page
create policy "coins: public read"
  on public.coins for select
  to anon, authenticated
  using (true);

create policy "coins: admin insert"
  on public.coins for insert
  to authenticated
  with check (is_admin());

create policy "coins: admin update"
  on public.coins for update
  to authenticated
  using  (is_admin())
  with check (true);

create policy "coins: admin delete"
  on public.coins for delete
  to authenticated
  using (is_admin());

-- ── disputes ───────────────────────────────────────────────
-- Users see their own disputes; admin sees all
create policy "disputes: read own or admin"
  on public.disputes for select
  to authenticated
  using (auth.uid()::text = user_id or is_admin());

-- Users can only submit disputes tied to their own uid
create policy "disputes: own insert"
  on public.disputes for insert
  to authenticated
  with check (auth.uid()::text = user_id);

-- Only admin can resolve/respond to disputes
create policy "disputes: admin update"
  on public.disputes for update
  to authenticated
  using  (is_admin())
  with check (true);

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
    alter publication supabase_realtime add table public.disputes;
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

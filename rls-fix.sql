-- ============================================================
-- 9ija Escrow — RLS Policy Fix
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run: drops and recreates all policies idempotently
--
-- What this does:
--   • Creates an is_admin() helper function (security definer)
--   • Locks down all tables so users only see/edit their own rows
--   • Admin (role = 'admin' in users table) retains full access
--   • Public tables (settings, announcements, coins) stay readable
--     by unauthenticated visitors (landing page rate card, etc.)
--   • Prevents any user from self-promoting to admin at sign-up
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- 0. HELPER FUNCTION
--    is_admin() reads the users table as superuser (security
--    definer) to avoid circular RLS evaluation on that table.
-- ──────────────────────────────────────────────────────────
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
     where id   = auth.uid()::text
       and role = 'admin'
  );
$$;

-- ── Helper: active account check ─────────────────────────────
-- Returns true only if the user's account_status is 'active'.
-- Used to block order creation for suspended/terminated accounts.
create or replace function public.is_account_active()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
     where id = auth.uid()::text
       and account_status = 'active'
  );
$$;

-- Grant execute on helper functions to authenticated users
grant execute on function public.is_account_active() to anon, authenticated;

-- ──────────────────────────────────────────────────────────
-- 1. USERS TABLE
-- ──────────────────────────────────────────────────────────
-- Drop all old policies (open and new) for clean slate
drop policy if exists "users: anon insert"          on public.users;
drop policy if exists "users: read all"             on public.users;
drop policy if exists "users: update all"           on public.users;
drop policy if exists "users: own insert"           on public.users;
drop policy if exists "users: read own or admin"    on public.users;
drop policy if exists "users: update own"           on public.users;
drop policy if exists "users: admin update"         on public.users;
drop policy if exists "users: admin email bootstrap" on public.users;

-- Regular users insert their own row at sign-up with role='user'.
-- The admin email may also self-provision with role='admin' on first sign-up
-- (the app sets these values in getOrCreateUserProfile).
create policy "users: own insert"
  on public.users for insert
  to authenticated
  with check (
    auth.uid()::text = id
    and (
      -- Normal users must start as role='user' with no KYC
      (role = 'user' and kyc_status = 'none')
      -- Admin account can self-provision with elevated role on first sign-up
      or (auth.jwt() ->> 'email') = 'cryptogangstar247@gmail.com'
    )
  );

-- Users see their own row; admin sees everyone (KYC listing, user management)
create policy "users: read own or admin"
  on public.users for select
  to authenticated
  using (auth.uid()::text = id or is_admin());

-- Regular users can update their own row (profile, KYC submit, notification
-- prefs) but CANNOT escalate their role — role='user' enforced in WITH CHECK.
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
-- false (e.g. DB role got corrupted). Scoped strictly to own row, only fires
-- when is_admin() would otherwise deny access.
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

-- ──────────────────────────────────────────────────────────
-- 2. ORDERS TABLE
-- ──────────────────────────────────────────────────────────
drop policy if exists "orders: read all"        on public.orders;
drop policy if exists "orders: insert"          on public.orders;
drop policy if exists "orders: update"          on public.orders;
drop policy if exists "orders: read own or admin" on public.orders;
drop policy if exists "orders: own insert"      on public.orders;
drop policy if exists "orders: admin update"    on public.orders;

-- Users see their own orders; admin sees all (order management dashboard)
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

-- ──────────────────────────────────────────────────────────
-- 3. DISPUTES TABLE
--    Wrapped in DO $$ so the script doesn't error if the
--    disputes table hasn't been created yet (run migration.sql
--    first if disputes table is missing).
-- ──────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.tables
     where table_schema = 'public' and table_name = 'disputes'
  ) then

    -- Drop old open policy and any prior scoped policies
    drop policy if exists "allow all"                  on public.disputes;
    drop policy if exists "disputes: read all"         on public.disputes;
    drop policy if exists "disputes: insert"           on public.disputes;
    drop policy if exists "disputes: update"           on public.disputes;
    drop policy if exists "disputes: read own or admin" on public.disputes;
    drop policy if exists "disputes: own insert"       on public.disputes;
    drop policy if exists "disputes: admin update"     on public.disputes;

    -- Users see their own disputes; admin sees all
    execute $p$
      create policy "disputes: read own or admin"
        on public.disputes for select
        to authenticated
        using (auth.uid()::text = user_id or public.is_admin())
    $p$;

    -- Users can only submit disputes tied to their own uid
    execute $p$
      create policy "disputes: own insert"
        on public.disputes for insert
        to authenticated
        with check (auth.uid()::text = user_id)
    $p$;

    -- Only admin can resolve/respond to disputes
    execute $p$
      create policy "disputes: admin update"
        on public.disputes for update
        to authenticated
        using  (public.is_admin())
        with check (true)
    $p$;

  else
    raise notice 'disputes table not found — run migration.sql first, then re-run rls-fix.sql';
  end if;
end $$;

-- ──────────────────────────────────────────────────────────
-- 4. SETTINGS TABLE
-- ──────────────────────────────────────────────────────────
drop policy if exists "settings: public read"            on public.settings;
drop policy if exists "settings: authenticated upsert"   on public.settings;
drop policy if exists "settings: authenticated update"   on public.settings;
drop policy if exists "settings: admin insert"           on public.settings;
drop policy if exists "settings: admin update"           on public.settings;

-- Public read — landing page exchange rate visible without login
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

-- ──────────────────────────────────────────────────────────
-- 5. ANNOUNCEMENTS TABLE
-- ──────────────────────────────────────────────────────────
drop policy if exists "announcements: public read"          on public.announcements;
drop policy if exists "announcements: authenticated write"  on public.announcements;
drop policy if exists "announcements: authenticated update" on public.announcements;
drop policy if exists "announcements: authenticated delete" on public.announcements;
drop policy if exists "announcements: admin insert"         on public.announcements;
drop policy if exists "announcements: admin update"         on public.announcements;
drop policy if exists "announcements: admin delete"         on public.announcements;

-- Public read — visible on landing page
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

-- ──────────────────────────────────────────────────────────
-- 6. COINS TABLE
-- ──────────────────────────────────────────────────────────
drop policy if exists "coins: public read"          on public.coins;
drop policy if exists "coins: authenticated write"  on public.coins;
drop policy if exists "coins: authenticated update" on public.coins;
drop policy if exists "coins: authenticated delete" on public.coins;
drop policy if exists "coins: admin insert"         on public.coins;
drop policy if exists "coins: admin update"         on public.coins;
drop policy if exists "coins: admin delete"         on public.coins;

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

-- ──────────────────────────────────────────────────────────
-- Done. Verify applied policies with:
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'public'
--   order by tablename, cmd;
-- ──────────────────────────────────────────────────────────

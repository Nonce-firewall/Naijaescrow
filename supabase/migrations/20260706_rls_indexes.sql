-- =============================================================================
-- 9ija Escrow — Supabase Row Level Security (RLS) + Performance Indexes
-- =============================================================================
-- Run this entire file in the Supabase dashboard → SQL Editor.
-- It is idempotent: safe to re-run (uses IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
--
-- CRITICAL: This app uses the anon-key client-side. Without RLS any authenticated
-- user can read/write every row in every table. Apply these policies before going
-- to production.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 0a. Helper — check admin by role (SECURITY DEFINER avoids recursion)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 0b. Helper — check admin by email (used in privilege-escalation guard so
--     the hardcoded admin email can still set role='admin' on first login)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_admin_email()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $
  -- auth.jwt() ->> 'email' is the standard Supabase way to read the caller's email.
  -- (auth.email() is not a built-in Supabase helper; jwt() is.)
  SELECT (auth.jwt() ->> 'email') = 'cryptogangstar247@gmail.com';
$;


-- ---------------------------------------------------------------------------
-- 1. SETTINGS — anyone reads; only admins write
-- ---------------------------------------------------------------------------
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_read_all"    ON settings;
DROP POLICY IF EXISTS "settings_write_admin" ON settings;

CREATE POLICY "settings_read_all" ON settings
  FOR SELECT USING (true);

CREATE POLICY "settings_write_admin" ON settings
  FOR ALL USING (is_admin());


-- ---------------------------------------------------------------------------
-- 2. ANNOUNCEMENTS — anyone reads; only admins write
-- ---------------------------------------------------------------------------
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_read_all"    ON announcements;
DROP POLICY IF EXISTS "announcements_write_admin" ON announcements;

CREATE POLICY "announcements_read_all" ON announcements
  FOR SELECT USING (true);

CREATE POLICY "announcements_write_admin" ON announcements
  FOR ALL USING (is_admin());


-- ---------------------------------------------------------------------------
-- 3. COINS — authenticated users see published coins; admins see all & write
-- ---------------------------------------------------------------------------
ALTER TABLE coins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coins_read_published" ON coins;
DROP POLICY IF EXISTS "coins_read_admin"     ON coins;
DROP POLICY IF EXISTS "coins_write_admin"    ON coins;

CREATE POLICY "coins_read_published" ON coins
  FOR SELECT USING (published = true);

CREATE POLICY "coins_read_admin" ON coins
  FOR SELECT USING (is_admin());

CREATE POLICY "coins_write_admin" ON coins
  FOR ALL USING (is_admin());


-- ---------------------------------------------------------------------------
-- 4. USERS table RLS
--
--  READ:   each user sees their own row; admins see all rows.
--  INSERT: each user may create exactly their own profile row on sign-up.
--          WITH CHECK prevents setting privileged initial values
--          (role, kyc_status, account_status) except for the admin email.
--  UPDATE: each user may update only their own row; admins may update any.
--          Column-level privilege escalation is blocked by the trigger below.
-- ---------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own"     ON users;
DROP POLICY IF EXISTS "users_read_admin"   ON users;
DROP POLICY IF EXISTS "users_insert_own"   ON users;
DROP POLICY IF EXISTS "users_update_own"   ON users;
DROP POLICY IF EXISTS "users_update_admin" ON users;

-- Read policies
CREATE POLICY "users_read_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_read_admin" ON users
  FOR SELECT USING (is_admin());

-- Insert policy: user creates their own profile row on first login.
-- The admin email is allowed to self-register with role='admin'; everyone
-- else must start with role='user', kyc_status='none', account_status='active'.
CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (
    auth.uid() = id
    AND (
      is_admin_email()                              -- admin email: unrestricted initial values
      OR (
        role = 'user'
        AND kyc_status = 'none'
        AND account_status = 'active'
      )
    )
  );

-- Update policies (row-level only; column-level is enforced by trigger below)
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE USING (is_admin());


-- ---------------------------------------------------------------------------
-- 4b. Column-level privilege-escalation guard (trigger on users table)
--
--  Problem: RLS policies control which ROWS a user can touch but not which
--  COLUMNS they may change. Without this trigger, any authenticated user
--  could submit `update({ role: 'admin' })` on their own row and become admin.
--
--  This trigger runs BEFORE every UPDATE and rejects attempts by non-admins
--  (and non-admin-email callers) to modify privileged columns.
--
--  Allowed for regular users:
--    - notification_preferences  (user settings)
--    - kyc_status → 'pending' or 'none' only  (KYC submission / reset)
--    - kyc_data                               (KYC submission data)
--
--  Blocked for regular users (admin-only):
--    - role, account_status, suspend_reason, terminate_reason, deleted_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION guard_user_column_privileges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins (by role or by hardcoded email) bypass all column restrictions.
  IF is_admin() OR is_admin_email() THEN
    RETURN NEW;
  END IF;

  -- ── Blocked columns ────────────────────────────────────────────────────
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Permission denied: role may only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.account_status IS DISTINCT FROM OLD.account_status THEN
    RAISE EXCEPTION 'Permission denied: account_status may only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.suspend_reason IS DISTINCT FROM OLD.suspend_reason THEN
    RAISE EXCEPTION 'Permission denied: suspend_reason may only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.terminate_reason IS DISTINCT FROM OLD.terminate_reason THEN
    RAISE EXCEPTION 'Permission denied: terminate_reason may only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
    RAISE EXCEPTION 'Permission denied: deleted_at may only be changed by an admin'
      USING ERRCODE = '42501';
  END IF;

  -- Users must not be able to modify their own email address directly through
  -- the client — email is identity-facing and is only changed by the
  -- delete-account Netlify function (via service-role key, which bypasses RLS).
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Permission denied: email may only be changed by an admin process'
      USING ERRCODE = '42501';
  END IF;

  -- ── kyc_status: users may set 'pending' (submit) or 'none' (reset) only ─
  IF NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     AND NEW.kyc_status NOT IN ('pending', 'none') THEN
    RAISE EXCEPTION 'Permission denied: kyc_status can only be set to pending or none by a user'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Drop before recreating so re-runs are idempotent
DROP TRIGGER IF EXISTS enforce_user_column_privileges ON users;

CREATE TRIGGER enforce_user_column_privileges
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION guard_user_column_privileges();


-- ---------------------------------------------------------------------------
-- 5. ORDERS — users read/insert own orders; admins read all & update any
-- ---------------------------------------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orders_read_own"     ON orders;
DROP POLICY IF EXISTS "orders_read_admin"   ON orders;
DROP POLICY IF EXISTS "orders_insert_own"   ON orders;
DROP POLICY IF EXISTS "orders_update_admin" ON orders;

CREATE POLICY "orders_read_own" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders_read_admin" ON orders
  FOR SELECT USING (is_admin());

-- Users can only create orders on behalf of themselves
CREATE POLICY "orders_insert_own" ON orders
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'   -- new orders must start as pending; can't self-approve
  );

-- Only admins can change order status (approve / reject)
CREATE POLICY "orders_update_admin" ON orders
  FOR UPDATE USING (is_admin());


-- ---------------------------------------------------------------------------
-- 6. DISPUTES — users read/insert own disputes; admins read all & resolve
-- ---------------------------------------------------------------------------
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "disputes_read_own"     ON disputes;
DROP POLICY IF EXISTS "disputes_read_admin"   ON disputes;
DROP POLICY IF EXISTS "disputes_insert_own"   ON disputes;
DROP POLICY IF EXISTS "disputes_update_admin" ON disputes;

CREATE POLICY "disputes_read_own" ON disputes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "disputes_read_admin" ON disputes
  FOR SELECT USING (is_admin());

-- Users can only open disputes for themselves, starting as 'open'
CREATE POLICY "disputes_insert_own" ON disputes
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND status = 'open'
  );

-- Only admins can resolve disputes
CREATE POLICY "disputes_update_admin" ON disputes
  FOR UPDATE USING (is_admin());


-- ---------------------------------------------------------------------------
-- 7. Performance indexes
--    Primary keys are already B-tree indexed by Supabase. These cover the
--    remaining hot query paths used throughout the app.
-- ---------------------------------------------------------------------------

-- orders: filter by user (trader history) + sort by date (admin queue)
CREATE INDEX IF NOT EXISTS idx_orders_user_id    ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status     ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- disputes: filter by user + join to orders
CREATE INDEX IF NOT EXISTS idx_disputes_user_id    ON disputes (user_id);
CREATE INDEX IF NOT EXISTS idx_disputes_order_id   ON disputes (order_id);
CREATE INDEX IF NOT EXISTS idx_disputes_created_at ON disputes (created_at DESC);

-- users: lookup by email + filter by KYC/account status (admin panels)
CREATE INDEX IF NOT EXISTS idx_users_email          ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_account_status ON users (account_status);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status     ON users (kyc_status);

-- announcements: sort by date + active filter
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active  ON announcements (is_active);


-- ---------------------------------------------------------------------------
-- 8. Add deleted_at column (bigint ms — matches schema convention)
--    Idempotent — silently skipped if column already exists.
-- ---------------------------------------------------------------------------
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at bigint;


-- =============================================================================
-- Verification query — run after applying:
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public';
-- All six tables should show rowsecurity = true.
-- =============================================================================

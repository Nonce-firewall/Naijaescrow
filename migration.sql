-- ============================================================
-- 9ija Escrow — Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add account status columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspend_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terminate_reason TEXT;

-- 2. Create disputes table (with image_url support)
CREATE TABLE IF NOT EXISTS disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  admin_response TEXT,
  created_at BIGINT NOT NULL,
  resolved_at BIGINT
);

-- 3. Add image_url to disputes if table already exists (safe idempotent)
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 4. Enable Row Level Security on disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- 5. Scoped RLS policies for disputes
--    (replaces the old open "allow all" policy)
DO $
BEGIN
  -- Remove old open policy if present
  DROP POLICY IF EXISTS "allow all" ON disputes;
END $;

-- Users see their own disputes; admin sees all
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'disputes: read own or admin'
  ) THEN
    CREATE POLICY "disputes: read own or admin"
      ON disputes FOR SELECT
      TO authenticated
      USING (auth.uid()::text = user_id OR public.is_admin());
  END IF;
END $;

-- Users can only submit disputes tied to their own uid
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'disputes: own insert'
  ) THEN
    CREATE POLICY "disputes: own insert"
      ON disputes FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid()::text = user_id);
  END IF;
END $;

-- Only admin can resolve/respond to disputes
DO $
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'disputes: admin update'
  ) THEN
    CREATE POLICY "disputes: admin update"
      ON disputes FOR UPDATE
      TO authenticated
      USING (public.is_admin())
      WITH CHECK (true);
  END IF;
END $;

-- 6. Grant Data API access for Supabase PostgREST (anon + authenticated roles)
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- disputes table: traders insert their own disputes; admin reads/updates all
GRANT SELECT, INSERT, UPDATE ON TABLE disputes TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE disputes TO authenticated;

-- users table: grant access to the new columns we added
GRANT SELECT, UPDATE ON TABLE users TO anon;
GRANT SELECT, UPDATE ON TABLE users TO authenticated;

-- 7. Enable Realtime on disputes table
ALTER PUBLICATION supabase_realtime ADD TABLE disputes;

-- ============================================================
-- ADDENDUM: Multi-image dispute support
-- Run this if you already ran the migration above previously.
-- Safe to run multiple times (idempotent).
-- ============================================================

-- Add image_urls column (stores JSON array of base64 strings)
ALTER TABLE disputes ADD COLUMN IF NOT EXISTS image_urls TEXT;

-- Re-grant to ensure new column is accessible via Data API
GRANT SELECT, INSERT, UPDATE ON TABLE disputes TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE disputes TO authenticated;

-- ============================================================
-- ADDENDUM: Notification preferences
-- Run this if you already ran the migration above previously.
-- Safe to run multiple times (idempotent).
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB;

GRANT SELECT, UPDATE ON TABLE users TO anon;
GRANT SELECT, UPDATE ON TABLE users TO authenticated;

-- ============================================================
-- ADDENDUM: Public stats RPC function
-- Run this if you already ran the migration above previously.
-- Creates a SECURITY DEFINER function that returns aggregate
-- platform stats (trade counts, volume, traders) without
-- exposing individual rows — safe for anonymous/public access.
-- ============================================================

CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'trades_completed', (SELECT COUNT(*)::int          FROM orders WHERE status = 'completed'),
    'usdt_volume',      (SELECT COALESCE(SUM(crypto_amount),0)::numeric FROM orders WHERE status = 'completed'),
    'active_traders',   (SELECT COUNT(DISTINCT user_id)::int FROM orders)
  );
$$;

-- Allow both anonymous visitors and authenticated users to call this function
GRANT EXECUTE ON FUNCTION get_public_stats() TO anon, authenticated;

-- ============================================================
-- ADDENDUM: Account deletion audit trail
-- Run this if you already ran the migration above previously.
-- Safe to run multiple times (idempotent).
-- Records when an account was deleted/scrubbed (via the
-- delete-account Edge Function) so admins can audit retained
-- KYC records for compliance review.
-- ============================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at BIGINT;

GRANT SELECT, UPDATE ON TABLE users TO anon;
GRANT SELECT, UPDATE ON TABLE users TO authenticated;

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

-- 5. Open RLS policy for disputes (app handles auth logic via Supabase anon key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'allow all'
  ) THEN
    CREATE POLICY "allow all" ON disputes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

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

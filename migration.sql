-- ============================================================
-- 9ija Escrow — Supabase Migration
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Add account status columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspend_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS terminate_reason TEXT;

-- 2. Create disputes table
CREATE TABLE IF NOT EXISTS disputes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  admin_response TEXT,
  created_at BIGINT NOT NULL,
  resolved_at BIGINT
);

-- 3. Enable Row Level Security on disputes
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- 4. Open RLS policy for disputes (app handles auth logic)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'disputes' AND policyname = 'allow all'
  ) THEN
    CREATE POLICY "allow all" ON disputes FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5. Enable Realtime on disputes table
ALTER PUBLICATION supabase_realtime ADD TABLE disputes;

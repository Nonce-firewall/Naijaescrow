-- ============================================================
-- Migration: Split usdt_rate into sell/buy markups + dispute chat
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Rename usdt_rate → usdt_sell_markup on the settings table
ALTER TABLE settings RENAME COLUMN usdt_rate TO usdt_sell_markup;

-- 2. Add usdt_buy_markup (initially mirrors sell markup)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS usdt_buy_markup numeric NOT NULL DEFAULT 0;
UPDATE settings SET usdt_buy_markup = usdt_sell_markup WHERE id = 'admin_settings';

-- NOTE: usdt_sell_markup and usdt_buy_markup now represent the NGN MARKUP
-- added on top of the live CoinGecko market rate, NOT a fixed rate.
-- After running this migration, visit Admin → Configuration and set your
-- desired markup values (e.g. +100 NGN for sell, +80 NGN for buy).
-- The system will auto-inflate those by the live market price.

-- ============================================================
-- 3. Create dispute_messages table for real-time chat threads
-- ============================================================
CREATE TABLE IF NOT EXISTS dispute_messages (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id   uuid    NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id    uuid    NOT NULL,
  sender_email text    NOT NULL,
  sender_role  text    NOT NULL CHECK (sender_role IN ('user', 'admin')),
  message      text    NOT NULL CHECK (char_length(message) <= 2000),
  created_at   bigint  NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON dispute_messages(created_at);

-- ============================================================
-- 4. RLS for dispute_messages
-- ============================================================
ALTER TABLE dispute_messages ENABLE ROW LEVEL SECURITY;

-- Parties to a dispute can read its messages
CREATE POLICY "Dispute parties can read messages"
  ON dispute_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_messages.dispute_id
        AND (
          d.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
        )
    )
  );

-- Parties can send messages on open disputes only
-- sender_id must match the caller; sender_role and sender_email are validated
-- against the auth identity and users table so clients cannot spoof them.
CREATE POLICY "Dispute parties can send messages on open disputes"
  ON dispute_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id    = auth.uid()
    -- Enforce email matches the authenticated session identity
    AND sender_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    -- Enforce role matches what is stored in the users table
    AND sender_role  = (SELECT role  FROM users        WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_messages.dispute_id
        AND d.status = 'open'
        AND (
          d.user_id = auth.uid()
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.role = 'admin')
        )
    )
  );

-- Trigger to enforce sender_email and sender_role from server-side identity,
-- overriding any client-supplied values before insert.
CREATE OR REPLACE FUNCTION enforce_dispute_message_identity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $
BEGIN
  NEW.sender_id    := auth.uid();
  NEW.sender_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  NEW.sender_role  := (SELECT role  FROM users        WHERE id = auth.uid());
  RETURN NEW;
END;
$;

CREATE TRIGGER dispute_messages_enforce_identity
  BEFORE INSERT ON dispute_messages
  FOR EACH ROW EXECUTE FUNCTION enforce_dispute_message_identity();

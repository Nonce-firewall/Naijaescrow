-- ============================================================
-- Migration: Split usdt_rate into sell/buy markups + dispute chat
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Rename usdt_rate → usdt_sell_markup on the settings table
ALTER TABLE settings RENAME COLUMN usdt_rate TO usdt_sell_markup;

-- 2. Add usdt_buy_markup (initially mirrors sell markup)
ALTER TABLE settings ADD COLUMN IF NOT EXISTS usdt_buy_markup numeric NOT NULL DEFAULT 0;
UPDATE settings SET usdt_buy_markup = usdt_sell_markup WHERE id = 'admin_settings';

-- NOTE: usdt_sell_markup and usdt_buy_markup represent the NGN MARKUP
-- added on top of the live CoinGecko market rate, NOT a fixed rate.
-- After running this migration, visit Admin → Configuration and set your
-- desired markup values (e.g. +100 NGN for sell, +80 NGN for buy).

-- ============================================================
-- 3. Create dispute_messages table for real-time chat threads
-- ============================================================
CREATE TABLE IF NOT EXISTS dispute_messages (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id   uuid    NOT NULL REFERENCES disputes(id) ON DELETE CASCADE,
  sender_id    text    NOT NULL,                -- text to match users.id (Supabase Auth UID stored as text)
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

-- Grant access (mirrors the disputes table grants)
GRANT SELECT, INSERT ON public.dispute_messages TO authenticated;

-- Helper: is the current user an admin?
-- (reuses the same pattern as the rest of the schema)
-- Parties to a dispute can read its messages
CREATE POLICY "Dispute parties can read messages"
  ON dispute_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_messages.dispute_id
        AND (
          d.user_id = auth.uid()::text
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND u.role = 'admin')
        )
    )
  );

-- Parties can send messages on open disputes only.
-- sender_id/sender_email/sender_role are further enforced by the trigger below
-- so client-supplied values are always overwritten before the row lands.
CREATE POLICY "Dispute parties can send messages on open disputes"
  ON dispute_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM disputes d
      WHERE d.id = dispute_messages.dispute_id
        AND d.status = 'open'
        AND (
          d.user_id = auth.uid()::text
          OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid()::text AND u.role = 'admin')
        )
    )
  );

-- ============================================================
-- 5. Trigger: overwrite sender identity from server-side auth
--    Prevents any client from spoofing sender_id / sender_role / sender_email.
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_dispute_message_identity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  NEW.sender_id    := auth.uid()::text;
  NEW.sender_email := (SELECT email FROM auth.users WHERE id = auth.uid());
  NEW.sender_role  := COALESCE(
                        (SELECT role FROM public.users WHERE id = auth.uid()::text),
                        'user'
                      );
  RETURN NEW;
END;
$$;

CREATE TRIGGER dispute_messages_enforce_identity
  BEFORE INSERT ON dispute_messages
  FOR EACH ROW EXECUTE FUNCTION enforce_dispute_message_identity();

-- ============================================================
-- 6. Add dispute_messages to the realtime publication
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'dispute_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_messages;
  END IF;
END $$;

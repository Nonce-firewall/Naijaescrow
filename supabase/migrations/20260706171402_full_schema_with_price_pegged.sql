/*
# 9ija Escrow — Full schema with price_pegged column

Creates all tables for the 9ija Escrow P2P NGN/USDT platform with RLS policies,
realtime publication, and the new `price_pegged` column on coins.

1. Tables
   - users (mirrors auth.users, id = auth UID as text)
   - settings (single-row admin config)
   - orders (buy/sell escrow orders)
   - announcements (public/private bulletins)
   - coins (custom coin listings) — includes price_pegged column
   - disputes (trader dispute tickets)

2. price_pegged column (NEW)
   - coins.price_pegged BOOLEAN NOT NULL DEFAULT FALSE
   - TRUE  → coin price follows live effective Buy/Sell rate (market + markup)
   - FALSE → coin uses its own static `rate` column (legacy behavior)

3. Security
   - RLS enabled on all tables.
   - is_admin() + is_account_active() SECURITY DEFINER helpers.
   - Users see/edit only their own rows; admin sees all.
   - Settings, announcements, coins are publicly readable (landing page).
   - Orders require active account status to insert.

4. Realtime
   - All tables added to supabase_realtime publication.
*/

-- Schema usage grants
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ── USERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                       TEXT PRIMARY KEY,
  email                    TEXT NOT NULL,
  role                     TEXT NOT NULL DEFAULT 'user'
                             CHECK (role IN ('user', 'admin')),
  kyc_status               TEXT NOT NULL DEFAULT 'none'
                             CHECK (kyc_status IN ('none', 'pending', 'approved', 'rejected')),
  kyc_data                 JSONB,
  account_status          TEXT NOT NULL DEFAULT 'active'
                             CHECK (account_status IN ('active', 'suspended', 'terminated', 'deleted')),
  suspend_reason           TEXT,
  terminate_reason         TEXT,
  notification_preferences JSONB,
  deleted_at               BIGINT,
  created_at               BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::BIGINT
);

-- ── SETTINGS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
  id                  TEXT PRIMARY KEY,
  ngn_bank_name       TEXT NOT NULL DEFAULT 'Zenith Bank',
  ngn_account_number  TEXT NOT NULL DEFAULT '1012345678',
  ngn_account_name    TEXT NOT NULL DEFAULT '9ija Escrow Ltd.',
  usdt_rate           NUMERIC NOT NULL DEFAULT 1540,
  usdt_sell_markup    NUMERIC NOT NULL DEFAULT 100,
  usdt_buy_markup     NUMERIC NOT NULL DEFAULT 80,
  wallet_bsc          TEXT NOT NULL DEFAULT '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
  wallet_tron         TEXT NOT NULL DEFAULT 'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
  wallet_polygon      TEXT NOT NULL DEFAULT '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
);

-- ── ORDERS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_email           TEXT NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('buy', 'sell')),
  crypto_amount        NUMERIC NOT NULL,
  ngn_amount           NUMERIC NOT NULL,
  rate                 NUMERIC NOT NULL,
  status               TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'completed', 'rejected')),
  network              TEXT NOT NULL,
  token                TEXT NOT NULL DEFAULT 'USDT',
  payment_screenshot   TEXT NOT NULL,
  user_bank_details    JSONB,
  admin_bank_details   JSONB,
  admin_wallet_address TEXT,
  blockchain_tx_id     TEXT,
  rejection_reason     TEXT,
  created_at           BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::BIGINT,
  processed_at         BIGINT
);

-- ── ANNOUNCEMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  scope       TEXT NOT NULL DEFAULT 'all'
                CHECK (scope IN ('public', 'private', 'all')),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::BIGINT
);

-- ── COINS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  symbol           TEXT NOT NULL,
  network          TEXT NOT NULL,
  wallet_address   TEXT NOT NULL,
  rate             NUMERIC NOT NULL,
  logo_url         TEXT,
  published        BOOLEAN NOT NULL DEFAULT TRUE,
  price_pegged     BOOLEAN NOT NULL DEFAULT FALSE,
  fee_percentage   NUMERIC NOT NULL DEFAULT 0 CHECK (fee_percentage >= 0 AND fee_percentage <= 100),
  min_trade_amount NUMERIC NOT NULL DEFAULT 1 CHECK (min_trade_amount >= 0),
  created_at       BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::BIGINT
);

-- ── DISPUTES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disputes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       TEXT NOT NULL,
  user_id        TEXT NOT NULL,
  user_email     TEXT NOT NULL,
  message        TEXT NOT NULL,
  image_url      TEXT,
  image_urls     TEXT,
  status         TEXT NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open', 'resolved')),
  admin_response TEXT,
  created_at     BIGINT NOT NULL,
  resolved_at    BIGINT
);

-- ── DISPUTE MESSAGES ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id   UUID NOT NULL REFERENCES public.disputes(id) ON DELETE CASCADE,
  sender_id    TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  sender_role  TEXT NOT NULL CHECK (sender_role IN ('user', 'admin')),
  message      TEXT NOT NULL,
  created_at   BIGINT NOT NULL DEFAULT (EXTRACT(epoch FROM now()) * 1000)::BIGINT
);

-- ── TABLE GRANTS ───────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.users         TO authenticated;
GRANT SELECT                  ON public.settings      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE  ON public.orders        TO authenticated;
GRANT SELECT                  ON public.announcements TO anon, authenticated;
GRANT SELECT                  ON public.coins         TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE  ON public.disputes      TO authenticated;
GRANT SELECT, INSERT, UPDATE  ON public.dispute_messages TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.settings      TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coins         TO authenticated;

-- ── RLS ────────────────────────────────────────────────────
ALTER TABLE public.users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coins         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

-- ── Helper functions ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
     WHERE id = auth.uid()::text AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_account_active()
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
     WHERE id = auth.uid()::text AND account_status = 'active'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_active() TO anon, authenticated;

-- ── USERS policies ─────────────────────────────────────────
CREATE POLICY "users: own insert" ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid()::text = id
    AND (
      (role = 'user' AND kyc_status = 'none')
      OR (auth.jwt() ->> 'email') = 'cryptogangstar247@gmail.com'
    )
  );

CREATE POLICY "users: read own or admin" ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid()::text = id OR is_admin());

CREATE POLICY "users: update own" ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = id AND NOT is_admin())
  WITH CHECK (auth.uid()::text = id AND role = 'user');

CREATE POLICY "users: admin update" ON public.users FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (TRUE);

CREATE POLICY "users: admin email bootstrap" ON public.users FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'email') = 'cryptogangstar247@gmail.com'
    AND auth.uid()::text = id
    AND NOT is_admin()
  )
  WITH CHECK (
    (auth.jwt() ->> 'email') = 'cryptogangstar247@gmail.com'
    AND auth.uid()::text = id
  );

-- ── SETTINGS policies ──────────────────────────────────────
CREATE POLICY "settings: public read" ON public.settings FOR SELECT
  TO anon, authenticated USING (TRUE);
CREATE POLICY "settings: admin insert" ON public.settings FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "settings: admin update" ON public.settings FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (TRUE);

-- ── ORDERS policies ────────────────────────────────────────
CREATE POLICY "orders: read own or admin" ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id OR is_admin());
CREATE POLICY "orders: own insert" ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id AND public.is_account_active());
CREATE POLICY "orders: admin update" ON public.orders FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (TRUE);

-- ── ANNOUNCEMENTS policies ─────────────────────────────────
CREATE POLICY "announcements: public read" ON public.announcements FOR SELECT
  TO anon, authenticated USING (TRUE);
CREATE POLICY "announcements: admin insert" ON public.announcements FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "announcements: admin update" ON public.announcements FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (TRUE);
CREATE POLICY "announcements: admin delete" ON public.announcements FOR DELETE
  TO authenticated USING (is_admin());

-- ── COINS policies ─────────────────────────────────────────
CREATE POLICY "coins: public read" ON public.coins FOR SELECT
  TO anon, authenticated USING (TRUE);
CREATE POLICY "coins: admin insert" ON public.coins FOR INSERT
  TO authenticated WITH CHECK (is_admin());
CREATE POLICY "coins: admin update" ON public.coins FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (TRUE);
CREATE POLICY "coins: admin delete" ON public.coins FOR DELETE
  TO authenticated USING (is_admin());

-- ── DISPUTES policies ─────────────────────────────────────
CREATE POLICY "disputes: read own or admin" ON public.disputes FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id OR is_admin());
CREATE POLICY "disputes: own insert" ON public.disputes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "disputes: admin update" ON public.disputes FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (TRUE);

-- ── DISPUTE MESSAGES policies ──────────────────────────────
CREATE POLICY "dispute_messages: read own or admin" ON public.dispute_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.disputes
       WHERE disputes.id = dispute_messages.dispute_id
         AND (disputes.user_id = auth.uid()::text OR public.is_admin())
    )
  );
CREATE POLICY "dispute_messages: own insert" ON public.dispute_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.disputes
       WHERE disputes.id = dispute_messages.dispute_id
         AND disputes.user_id = auth.uid()::text
    ) OR public.is_admin()
  );

-- ── REALTIME ───────────────────────────────────────────────
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.users; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.orders; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.disputes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.coins; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.dispute_messages; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- ── SEED DEFAULT SETTINGS ──────────────────────────────────
INSERT INTO public.settings (
  id, ngn_bank_name, ngn_account_number, ngn_account_name,
  usdt_rate, usdt_sell_markup, usdt_buy_markup,
  wallet_bsc, wallet_tron, wallet_polygon
) VALUES (
  'admin_settings',
  'Zenith Bank',
  '1012345678',
  '9ija Escrow Ltd.',
  1540,
  100,
  80,
  '0x71C7656EC7ab88b098defB751B7401B5f6d1476B',
  'TYG9xLq5Ym6296U6g1m29P1Pq9T7Pz8D8W',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
) ON CONFLICT (id) DO NOTHING;

-- ── Public stats RPC ────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_public_stats()
RETURNS JSON LANGUAGE SQL SECURITY DEFINER SET search_path = public AS $$
  SELECT json_build_object(
    'trades_completed', (SELECT COUNT(*)::int FROM orders WHERE status = 'completed'),
    'usdt_volume',      (SELECT COALESCE(SUM(crypto_amount),0)::numeric FROM orders WHERE status = 'completed'),
    'active_traders',   (SELECT COUNT(DISTINCT user_id)::int FROM orders)
  );
$$;
GRANT EXECUTE ON FUNCTION get_public_stats() TO anon, authenticated;

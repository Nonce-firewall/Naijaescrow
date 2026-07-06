-- ============================================================
-- 9ija Escrow — Coin Fees Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- ============================================================
--
-- Adds per-coin/network fee configuration and minimum trade amount.
-- fee_percentage  — % deducted from the user's crypto as platform fee
--                   Example: fee_percentage = 7  →  50 USDT trade → 3.5 USDT fee
-- min_trade_amount — minimum crypto amount required to place an order
--                    Orders below this value will be rejected on the frontend.
-- ============================================================

ALTER TABLE public.coins
  ADD COLUMN IF NOT EXISTS fee_percentage   NUMERIC NOT NULL DEFAULT 0  CHECK (fee_percentage   >= 0 AND fee_percentage   <= 100),
  ADD COLUMN IF NOT EXISTS min_trade_amount NUMERIC NOT NULL DEFAULT 1  CHECK (min_trade_amount >= 0);

-- Re-grant so PostgREST can read/write the new columns
GRANT SELECT, INSERT, UPDATE ON TABLE public.coins TO anon, authenticated;

-- Verify
SELECT id, name, network, fee_percentage, min_trade_amount FROM public.coins LIMIT 10;

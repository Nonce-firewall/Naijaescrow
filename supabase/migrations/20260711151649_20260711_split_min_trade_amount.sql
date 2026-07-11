/*
# Split min trade amount into buy/sell-specific columns

## Purpose
The admin previously set a single `min_trade_amount` that applied to both BUY and SELL trades.
The product now requires separate minimums for each trade direction so admins can set
different thresholds (e.g. higher minimum for BUY vs SELL).

## Changes
1. Add `min_buy_amount` column to `public.coins` — minimum crypto amount for BUY orders.
   Defaults to the existing `min_trade_amount` value (or 1 if null), preserving current behavior.
2. Add `min_sell_amount` column to `public.coins` — minimum crypto amount for SELL orders.
   Defaults to the existing `min_trade_amount` value (or 1 if null), preserving current behavior.
3. The old `min_trade_amount` column is kept for backward compatibility — the app will
   read from the new columns and fall back to `min_trade_amount` when the new columns are null.

## Security
- No RLS policy changes — the coins table already has proper admin-only write policies
  and public read policies.
- Grants are re-issued to ensure the new columns are accessible via the Data API.

## Notes
1. Safe to re-run — uses `ADD COLUMN IF NOT EXISTS`.
2. The backfill `UPDATE` copies `min_trade_amount` into both new columns only when they are NULL,
   so re-running won't overwrite values the admin has set after the first run.
3. The app reads `min_buy_amount` / `min_sell_amount` and falls back to `min_trade_amount`
   when either is null, so existing coins without the new columns populated still work.
*/

ALTER TABLE public.coins
  ADD COLUMN IF NOT EXISTS min_buy_amount  NUMERIC NOT NULL DEFAULT 1 CHECK (min_buy_amount  >= 0),
  ADD COLUMN IF NOT EXISTS min_sell_amount NUMERIC NOT NULL DEFAULT 1 CHECK (min_sell_amount >= 0);

-- Backfill: copy existing min_trade_amount into both new columns when they are still at the default (1)
-- and min_trade_amount has a non-default value. This preserves the admin's prior setting.
UPDATE public.coins
   SET min_buy_amount  = min_trade_amount,
       min_sell_amount = min_trade_amount
 WHERE min_trade_amount IS NOT NULL
   AND min_trade_amount > 0
   AND min_buy_amount  = 1
   AND min_sell_amount = 1;

-- Re-grant so PostgREST can read/write the new columns
GRANT SELECT, INSERT, UPDATE ON TABLE public.coins TO anon, authenticated;

-- Verify
SELECT id, name, network, min_trade_amount, min_buy_amount, min_sell_amount FROM public.coins LIMIT 10;

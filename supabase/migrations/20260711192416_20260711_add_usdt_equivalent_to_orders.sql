/*
# Add usdt_equivalent column to orders table

## Purpose
The landing page "USDT Volume" stat was summing `crypto_amount` directly, which is wrong for
non-USDT coins (BTC, ETH, etc.) — those amounts are in coin units, not USDT. The receipt
correctly converts to USDT using NGN/rate, but the public stats didn't.

This migration:
1. Adds a `usdt_equivalent` column (numeric, nullable) to the `orders` table.
2. Backfills existing completed orders: for USDT orders, usdt_equivalent = crypto_amount;
   for non-USDT orders, usdt_equivalent = ngn_amount / rate (the same formula the receipt uses
   for custom-rate coins).
3. Updates the `get_public_stats()` SECURITY DEFINER function to sum `usdt_equivalent`
   instead of `crypto_amount`, so the landing page volume matches the receipt totals.

## New Columns
- `orders.usdt_equivalent` (numeric, nullable): the USDT value of the order at creation time.

## Modified Objects
- `get_public_stats()` — now sums `usdt_equivalent` (with COALESCE fallback to `crypto_amount`
  for any rows where usdt_equivalent is null).

## Security
- No RLS changes. The column is readable by the same policies already on `orders`.
- `get_public_stats()` remains SECURITY DEFINER and only returns aggregate totals.
*/

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS usdt_equivalent numeric;

-- Backfill existing rows
UPDATE orders
  SET usdt_equivalent = CASE
    WHEN token = 'USDT' OR token IS NULL THEN crypto_amount
    WHEN rate IS NOT NULL AND rate > 0 THEN ngn_amount / rate
    ELSE crypto_amount
  END
  WHERE usdt_equivalent IS NULL;

CREATE OR REPLACE FUNCTION public.get_public_stats()
  RETURNS json
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT json_build_object(
    'trades_completed', (SELECT COUNT(*)::int FROM orders WHERE status = 'completed'),
    'usdt_volume',      (SELECT COALESCE(SUM(COALESCE(usdt_equivalent, crypto_amount)),0)::numeric FROM orders WHERE status = 'completed'),
    'active_traders',   (SELECT COUNT(DISTINCT user_id)::int FROM orders)
  );
$function$;

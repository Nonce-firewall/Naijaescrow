/*
# Add price_pegged column to existing coins table

1. Purpose
   Adds a boolean `price_pegged` column to the existing `coins` table.
   When TRUE, the coin's per-unit NGN price is automatically synchronized
   with the current effective Buy or Sell rate (live market price + admin markup)
   instead of using the coin's own static `rate` value.

2. Schema changes
   - `coins.price_pegged` (boolean, NOT NULL, default FALSE)
     FALSE = use the coin's own `rate` column (legacy behavior).
     TRUE  = ignore `rate`; use effective Buy/Sell rate based on trade direction.

3. Data safety
   - No existing data is modified or deleted.
   - All existing coins default to FALSE (unchanged behavior).
   - Idempotent: uses ADD COLUMN IF NOT EXISTS.

4. Security
   - No RLS policy changes. Existing coins policies already cover the new column.
*/

ALTER TABLE public.coins
  ADD COLUMN IF NOT EXISTS price_pegged BOOLEAN NOT NULL DEFAULT FALSE;

-- Re-grant so PostgREST can read/write the new column
GRANT SELECT ON TABLE public.coins TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON TABLE public.coins TO authenticated;

-- Verify
SELECT id, name, network, rate, price_pegged FROM public.coins LIMIT 10;

-- Add CoinGecko market ID to coins table for live price fetching
ALTER TABLE public.coins ADD COLUMN IF NOT EXISTS coin_gecko_id TEXT;

-- Re-grant so PostgREST can read/write the new column
GRANT SELECT, INSERT, UPDATE ON TABLE public.coins TO anon, authenticated;

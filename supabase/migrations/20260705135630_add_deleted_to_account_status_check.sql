-- Add 'deleted' to the account_status CHECK constraint
-- The edge function sets account_status = 'deleted' when scrubbing a user's profile

-- First drop the old constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_account_status_check;

-- Add the new constraint with 'deleted' included
ALTER TABLE public.users ADD CONSTRAINT users_account_status_check
  CHECK (account_status IN ('active', 'suspended', 'terminated', 'deleted'));
-- Add input length constraints at database level for defense-in-depth
-- Dispute message already has a 2000 char constraint from prior migration; verify it exists

-- Add constraint on disputes.message (initial dispute text)
ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_message_length_check;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_message_length_check 
  CHECK (char_length(message) <= 5000);

-- Add constraint on disputes.admin_response 
ALTER TABLE public.disputes DROP CONSTRAINT IF EXISTS disputes_admin_response_length_check;
ALTER TABLE public.disputes ADD CONSTRAINT disputes_admin_response_length_check 
  CHECK (admin_response IS NULL OR char_length(admin_response) <= 2000);

-- Add constraint on orders.rejection_reason
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_rejection_reason_length_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_rejection_reason_length_check 
  CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 1000);

-- Add constraint on users.suspend_reason and terminate_reason
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_suspend_reason_length_check;
ALTER TABLE public.users ADD CONSTRAINT users_suspend_reason_length_check 
  CHECK (suspend_reason IS NULL OR char_length(suspend_reason) <= 500);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_terminate_reason_length_check;
ALTER TABLE public.users ADD CONSTRAINT users_terminate_reason_length_check 
  CHECK (terminate_reason IS NULL OR char_length(terminate_reason) <= 500);

-- Add constraint on users.email (should match auth.users limit)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_length_check;
ALTER TABLE public.users ADD CONSTRAINT users_email_length_check 
  CHECK (char_length(email) <= 255);
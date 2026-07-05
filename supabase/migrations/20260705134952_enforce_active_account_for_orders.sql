-- ============================================================
-- Enforce active account status for order placement
-- Users with suspended/terminated accounts cannot create new orders
-- ============================================================

-- Helper function: check if user account is active (not suspended/terminated)
-- Uses security definer to bypass RLS on users table and avoid circular evaluation
create or replace function public.is_account_active()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
     where id = auth.uid()::text
       and account_status = 'active'
  );
$$;

-- Grant access so both roles can call it
grant execute on function public.is_account_active() to anon, authenticated;

-- Drop the old insert policy
drop policy if exists "orders: own insert" on public.orders;

-- Create new insert policy that checks both user_id match AND active account status
create policy "orders: own insert active only"
  on public.orders for insert
  to authenticated
  with check (
    auth.uid()::text = user_id
    and public.is_account_active()
  );
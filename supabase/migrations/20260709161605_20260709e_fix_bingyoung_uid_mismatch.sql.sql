/*
# Fix: UID mismatch between auth.users and public.users for bingyoung6

## Problem
The user bingyoung6@gmail.com has:
- auth.users UID: 62711da0-e546-4e8e-9da1-938a025317b3
- public.users UID: 66fbc855-2209-4aa8-ba4c-fbc5601817da

The RLS policy `users_read_own` uses `auth.uid() = id`, so the profile lookup fails.
This happened because multiple Google SSO sign-in cycles created different auth UIDs
and the restore_deleted_user flow repointed to one UID, but a later SSO created another.

## Fix
Repoint the public.users row to the current auth.users UID.
The ON UPDATE CASCADE on orders.user_id will propagate to historical orders.
*/

-- Use SECURITY DEFINER to bypass RLS and update the id column
DO $$
DECLARE
  v_old_uid text := '66fbc855-2209-4aa8-ba4c-fbc5601817da';
  v_new_uid text := '62711da0-e546-4e8e-9da1-938a025317b3';
BEGIN
  -- Set session variable to bypass guard_user_column_privileges trigger
  -- (though id column changes may not be protected, belt-and-suspenders)
  PERFORM set_config('app.allow_user_restore', 'true', true);
  
  UPDATE public.users
  SET id = v_new_uid
  WHERE id = v_old_uid
    AND email = 'bingyoung6@gmail.com';
  
  PERFORM set_config('app.allow_user_restore', 'false', true);
END $$;

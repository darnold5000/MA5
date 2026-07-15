-- Optional local seed notes for MA5.
-- Do not run against production without review.
-- After creating auth users in Supabase, promote staff like:

-- insert into public.ma5_user_roles (user_id, role)
-- values ('<owner-auth-user-uuid>', 'owner')
-- on conflict (user_id, role) do nothing;

-- Fix Supabase Dashboard / Auth invites when raw_user_meta_data has no "active" key.
-- (null = 'true') evaluates to NULL, violating ma5_profiles.active NOT NULL.

create or replace function public.ma5_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_status text := coalesce(
    new.raw_user_meta_data ->> 'invitation_status',
    'sent'
  );
  meta_active boolean := coalesce(
    (new.raw_user_meta_data ->> 'active') = 'true',
    false
  );
  meta_role text := coalesce(
    new.raw_user_meta_data ->> 'role',
    'client'
  );
begin
  if meta_status not in (
    'none', 'pending', 'sent', 'accepted', 'expired', 'revoked', 'failed'
  ) then
    meta_status := 'sent';
  end if;

  if meta_status = 'accepted' and not meta_active then
    meta_status := 'sent';
  end if;

  if meta_role not in ('owner', 'admin', 'staff', 'coach', 'client') then
    meta_role := 'client';
  end if;

  insert into public.ma5_profiles (
    id,
    email,
    full_name,
    active,
    invitation_status,
    invited_at
  )
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    meta_active,
    meta_status,
    case
      when meta_status in ('pending', 'sent') then now()
      else null
    end
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(public.ma5_profiles.full_name, excluded.full_name),
    invitation_status = case
      when public.ma5_profiles.invitation_status in ('accepted', 'revoked')
        then public.ma5_profiles.invitation_status
      else excluded.invitation_status
    end,
    invited_at = coalesce(public.ma5_profiles.invited_at, excluded.invited_at);

  insert into public.ma5_user_roles (user_id, role)
  values (new.id, meta_role)
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

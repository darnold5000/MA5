-- Harden ma5_handle_new_user so invite-created Auth users stay inactive
-- until they finish /auth/accept-invite. Safe to re-run if 009 already applied.

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
  -- Only activate when metadata explicitly sets active=true (seed scripts).
  meta_active boolean := (new.raw_user_meta_data ->> 'active') = 'true';
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

  -- Never treat a brand-new invite as accepted via metadata alone.
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
    -- Never flip an existing profile to active from the auth trigger.
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

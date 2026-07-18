-- Invitation-only auth: track invite lifecycle on ma5_profiles.
-- Extends existing profiles rather than creating a parallel identity table.

alter table public.ma5_profiles
  add column if not exists invitation_status text not null default 'none';

alter table public.ma5_profiles
  add column if not exists invited_at timestamptz;

alter table public.ma5_profiles
  add column if not exists invitation_accepted_at timestamptz;

alter table public.ma5_profiles
  add column if not exists last_login_at timestamptz;

alter table public.ma5_profiles
  add column if not exists access_revoked_at timestamptz;

alter table public.ma5_profiles
  add column if not exists admin_notes text;

alter table public.ma5_profiles
  drop constraint if exists ma5_profiles_invitation_status_check;

alter table public.ma5_profiles
  add constraint ma5_profiles_invitation_status_check
  check (
    invitation_status in (
      'none',
      'pending',
      'sent',
      'accepted',
      'expired',
      'revoked',
      'failed'
    )
  );

create index if not exists ma5_profiles_invitation_status_idx
  on public.ma5_profiles (invitation_status);

create index if not exists ma5_profiles_email_lower_idx
  on public.ma5_profiles (lower(email));

-- Existing members are treated as already accepted.
update public.ma5_profiles
set
  invitation_status = 'accepted',
  invitation_accepted_at = coalesce(invitation_accepted_at, created_at)
where invitation_status = 'none'
  and active = true;

-- Auth hook: create profile from invite metadata; default client role.
-- Invited users start inactive until they accept and set a password.
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
    (new.raw_user_meta_data ->> 'active')::boolean,
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

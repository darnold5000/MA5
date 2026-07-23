-- MA5 → Signal Works migration 037
-- Explicit client lifecycle states on ma5_profiles.
--
-- Prerequisite: 026_ma5_tenant_scoped_schema, 034_ma5_rls_hardening
--
-- Verify:
--   select client_status, count(*) from public.ma5_profiles group by 1;

begin;

alter table public.ma5_profiles
  add column if not exists client_status text,
  add column if not exists status_before_delete text,
  add column if not exists invite_revoked_at timestamptz,
  add column if not exists activated_at timestamptz,
  add column if not exists paused_at timestamptz,
  add column if not exists deleted_at timestamptz;

-- Bulk backfill runs in the SQL editor as postgres, not service_role.
-- The profile column guard only bypasses service_role JWTs, so disable it here.
alter table public.ma5_profiles disable trigger ma5_profiles_guard_client_columns;

-- Backfill lifecycle status from existing invitation/access fields.
update public.ma5_profiles
set client_status = case
  when invitation_accepted_at is not null
    and active = true
    and access_revoked_at is null
    and invitation_status = 'accepted'
    then 'active'
  when invitation_accepted_at is not null
    and (
      active = false
      or access_revoked_at is not null
      or invitation_status = 'revoked'
    )
    then 'paused'
  when invitation_status = 'revoked'
    and invitation_accepted_at is null
    then 'invite_revoked'
  when invitation_status in ('sent', 'pending', 'expired', 'failed')
    then 'invited'
  when invitation_accepted_at is not null
    then 'active'
  else 'invited'
end
where client_status is null;

update public.ma5_profiles
set activated_at = invitation_accepted_at
where activated_at is null
  and invitation_accepted_at is not null;

update public.ma5_profiles
set invite_revoked_at = access_revoked_at
where client_status = 'invite_revoked'
  and invite_revoked_at is null
  and access_revoked_at is not null;

update public.ma5_profiles
set paused_at = access_revoked_at
where client_status = 'paused'
  and paused_at is null
  and access_revoked_at is not null;

alter table public.ma5_profiles enable trigger ma5_profiles_guard_client_columns;

alter table public.ma5_profiles
  alter column client_status set default 'invited';

alter table public.ma5_profiles
  alter column client_status set not null;

alter table public.ma5_profiles
  drop constraint if exists ma5_profiles_client_status_check;

alter table public.ma5_profiles
  add constraint ma5_profiles_client_status_check
  check (
    client_status in (
      'invited',
      'active',
      'paused',
      'invite_revoked',
      'deleted'
    )
  );

alter table public.ma5_profiles
  drop constraint if exists ma5_profiles_status_before_delete_check;

alter table public.ma5_profiles
  add constraint ma5_profiles_status_before_delete_check
  check (
    status_before_delete is null
    or status_before_delete in (
      'invited',
      'active',
      'paused',
      'invite_revoked'
    )
  );

create index if not exists ma5_profiles_client_status_idx
  on public.ma5_profiles (tenant_id, client_status);

create index if not exists ma5_profiles_deleted_at_idx
  on public.ma5_profiles (tenant_id, deleted_at)
  where deleted_at is not null;

-- Tenant membership requires explicit active lifecycle state.
create or replace function public.ma5_is_tenant_member(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ma5_profiles p
    where p.id = auth.uid()
      and p.tenant_id = p_tenant_id
      and p.client_status = 'active'
      and p.active = true
      and coalesce(p.access_revoked_at, 'infinity'::timestamptz) > now()
      and p.deleted_at is null
  );
$$;

comment on function public.ma5_is_tenant_member(uuid) is
  'True when auth user has client_status=active and portal access for the tenant.';

create or replace function public.ma5_has_tenant_role(
  p_tenant_id uuid,
  p_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ma5_user_roles r
    join public.ma5_profiles p
      on p.id = r.user_id
     and p.tenant_id = r.tenant_id
    where r.tenant_id = p_tenant_id
      and r.user_id = auth.uid()
      and r.role = any (p_roles)
      and p.client_status = 'active'
      and p.active = true
      and coalesce(p.access_revoked_at, 'infinity'::timestamptz) > now()
      and p.deleted_at is null
  );
$$;

-- Protect lifecycle columns from client self-service updates.
create or replace function public.ma5_guard_profile_client_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.ma5_is_rls_bypass() then
    return new;
  end if;

  if public.ma5_has_tenant_role(new.tenant_id, array['owner', 'admin']) then
    return new;
  end if;

  if new.id is distinct from auth.uid() then
    raise exception 'profile update forbidden';
  end if;

  new.tenant_id := old.tenant_id;
  new.email := old.email;
  new.active := old.active;
  new.stripe_customer_id := old.stripe_customer_id;
  new.invitation_status := old.invitation_status;
  new.invited_at := old.invited_at;
  new.invitation_accepted_at := old.invitation_accepted_at;
  new.last_login_at := old.last_login_at;
  new.access_revoked_at := old.access_revoked_at;
  new.admin_notes := old.admin_notes;
  new.lead_id := old.lead_id;
  new.created_at := old.created_at;
  new.client_status := old.client_status;
  new.status_before_delete := old.status_before_delete;
  new.invite_revoked_at := old.invite_revoked_at;
  new.activated_at := old.activated_at;
  new.paused_at := old.paused_at;
  new.deleted_at := old.deleted_at;

  return new;
end;
$$;

commit;

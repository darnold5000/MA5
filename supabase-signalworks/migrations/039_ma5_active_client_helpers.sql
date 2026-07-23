-- MA5 → Signal Works migration 039
-- Align remaining profile access helpers with client_status lifecycle.
--
-- Prerequisite: 037_ma5_client_lifecycle

begin;

-- SQL editor / migration sessions run as postgres, not service_role JWT.
create or replace function public.ma5_is_rls_bypass()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role'
      or current_user in ('postgres', 'supabase_admin');
$$;

create or replace function public.ma5_is_active_client_profile(
  p_tenant_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ma5_profiles p
    where p.tenant_id = p_tenant_id
      and p.id = p_profile_id
      and p.client_status = 'active'
      and p.deleted_at is null
  );
$$;

comment on function public.ma5_is_active_client_profile(uuid, uuid) is
  'True when profile is an active, non-deleted client for operational targeting.';

create or replace function public.ma5_can_manage_resource(
  p_tenant_id uuid,
  p_permission text
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
      and p.client_status = 'active'
      and p.active = true
      and p.deleted_at is null
      and coalesce(p.access_revoked_at, 'infinity'::timestamptz) > now()
      and public.ma5_role_grants_capability(r.role, p_permission)
  );
$$;

revoke all on function public.ma5_is_active_client_profile(uuid, uuid) from public;
grant execute on function public.ma5_is_active_client_profile(uuid, uuid)
  to authenticated, service_role;

commit;

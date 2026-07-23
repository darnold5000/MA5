-- MA5 → Signal Works destination migration 028
-- Tenant-aware RLS helper functions for ma5_* policies (029–031).
--
-- Target: Signal Works shared Supabase only.
-- Prerequisites:
--   026_ma5_tenant_scoped_schema (ma5_profiles, ma5_user_roles)
--   signalworks-platform/core has_platform_permission()
--
-- D-09: ma5_current_tenant_id() reads app.tenant_id for performance only — not security.
-- D-24: ma5_profiles.id = auth.users.id (one profile per auth user globally).
--
-- Policies land in 029–031; no RLS policy changes here.
--
-- Verify after apply (028 helpers only — 026/026b add other ma5_* functions):
--   select proname from pg_proc p
--   join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public'
--     and proname in (
--       'ma5_current_tenant_id',
--       'ma5_role_grants_capability',
--       'ma5_is_tenant_member',
--       'ma5_has_tenant_role',
--       'ma5_is_tenant_staff',
--       'ma5_is_platform_admin',
--       'ma5_can_manage_resource'
--     )
--   order by 1;
--   -- expect 7 rows

begin;

-- ---------------------------------------------------------------------------
-- Prerequisites
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ma5_profiles'
  ) then
    raise exception 'ma5_profiles is missing — apply 026 before 028';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ma5_user_roles'
  ) then
    raise exception 'ma5_user_roles is missing — apply 026 before 028';
  end if;

  if to_regprocedure('public.has_platform_permission(text)') is null then
    raise exception 'public.has_platform_permission(text) is missing — apply signalworks-platform/core migrations first';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Session hint (not a security boundary — D-09)
-- ---------------------------------------------------------------------------

create or replace function public.ma5_current_tenant_id()
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  raw text;
  parsed uuid;
begin
  raw := nullif(trim(current_setting('app.tenant_id', true)), '');
  if raw is null then
    return null;
  end if;

  begin
    parsed := raw::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;

  return parsed;
end;
$$;

comment on function public.ma5_current_tenant_id() is
  'Performance hint from set_config(''app.tenant_id'', ...). Policies must still verify membership on row tenant_id.';

-- ---------------------------------------------------------------------------
-- Internal capability map (mirrors src/lib/permissions/roles.ts)
-- ---------------------------------------------------------------------------

create or replace function public.ma5_role_grants_capability(
  p_role text,
  p_capability text
)
returns boolean
language sql
immutable
parallel safe
as $$
  select case p_capability
    when 'manage_business_settings' then p_role = 'owner'
    when 'manage_staff' then p_role = 'owner'
    when 'view_financials' then p_role = 'owner'
    when 'manage_clients' then p_role = any (array['owner', 'admin'])
    when 'manage_schedule' then p_role = any (array['owner', 'admin'])
    when 'manage_memberships' then p_role = any (array['owner', 'admin', 'coach'])
    when 'manage_content' then p_role = any (array['owner', 'admin'])
    when 'view_reports' then p_role = any (array['owner', 'admin'])
    when 'manage_attendance' then p_role = any (array['owner', 'admin', 'staff', 'coach'])
    when 'view_schedule' then p_role = any (array['owner', 'admin', 'staff', 'coach'])
    when 'coach_clients' then p_role = any (array['owner', 'coach'])
    when 'assign_programs' then p_role = any (array['owner', 'coach'])
    when 'manage_programs' then p_role = any (array['owner', 'admin', 'coach'])
    when 'manage_teams' then p_role = any (array['owner', 'admin', 'coach'])
    when 'message_clients' then p_role = any (array['owner', 'admin', 'coach'])
    when 'book_sessions' then p_role = any (array['owner', 'admin', 'staff', 'coach', 'client'])
    when 'manage_own_billing' then p_role = any (array['owner', 'admin', 'staff', 'coach', 'client'])
    when 'view_own_programs' then p_role = any (array['owner', 'admin', 'staff', 'coach', 'client'])
    else false
  end;
$$;

comment on function public.ma5_role_grants_capability(text, text) is
  'Immutable role→capability map for MA5 RLS. Keep in sync with src/lib/permissions/roles.ts.';

-- ---------------------------------------------------------------------------
-- Tenant membership + role helpers
-- ---------------------------------------------------------------------------

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
      and p.active = true
      and coalesce(p.access_revoked_at, 'infinity'::timestamptz) > now()
  );
$$;

comment on function public.ma5_is_tenant_member(uuid) is
  'True when auth user has an active, non-revoked ma5_profiles row for the tenant.';

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
      and p.active = true
      and coalesce(p.access_revoked_at, 'infinity'::timestamptz) > now()
  );
$$;

comment on function public.ma5_has_tenant_role(uuid, text[]) is
  'Tenant-scoped replacement for hobby ma5_has_role().';

create or replace function public.ma5_is_tenant_staff(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ma5_has_tenant_role(
    p_tenant_id,
    array['owner', 'admin', 'staff', 'coach']
  );
$$;

comment on function public.ma5_is_tenant_staff(uuid) is
  'True for owner, admin, staff, or coach in the tenant.';

create or replace function public.ma5_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_platform_permission('manage_tenants')
      or public.has_platform_permission('view_all_tenants');
$$;

comment on function public.ma5_is_platform_admin() is
  'Signal Works platform admin check. Do not use for blanket MA5 gym data access.';

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
      and p.active = true
      and coalesce(p.access_revoked_at, 'infinity'::timestamptz) > now()
      and public.ma5_role_grants_capability(r.role, p_permission)
  );
$$;

comment on function public.ma5_can_manage_resource(uuid, text) is
  'Capability check scoped to tenant; mirrors hasCapability() in application code.';

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.ma5_current_tenant_id() from public;
revoke all on function public.ma5_role_grants_capability(text, text) from public;
revoke all on function public.ma5_is_tenant_member(uuid) from public;
revoke all on function public.ma5_has_tenant_role(uuid, text[]) from public;
revoke all on function public.ma5_is_tenant_staff(uuid) from public;
revoke all on function public.ma5_is_platform_admin() from public;
revoke all on function public.ma5_can_manage_resource(uuid, text) from public;

grant execute on function public.ma5_current_tenant_id() to authenticated, service_role;
grant execute on function public.ma5_is_tenant_member(uuid) to authenticated, service_role;
grant execute on function public.ma5_has_tenant_role(uuid, text[]) to authenticated, service_role;
grant execute on function public.ma5_is_tenant_staff(uuid) to authenticated, service_role;
grant execute on function public.ma5_is_platform_admin() to authenticated, service_role;
grant execute on function public.ma5_can_manage_resource(uuid, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------------------

do $$
declare
  missing text[];
begin
  select array_agg(expected.proname)
  into missing
  from (
    values
      ('ma5_current_tenant_id()'),
      ('ma5_role_grants_capability(text,text)'),
      ('ma5_is_tenant_member(uuid)'),
      ('ma5_has_tenant_role(uuid,text[])'),
      ('ma5_is_tenant_staff(uuid)'),
      ('ma5_is_platform_admin()'),
      ('ma5_can_manage_resource(uuid,text)')
  ) as expected(proname)
  where to_regprocedure('public.' || expected.proname) is null;

  if missing is not null then
    raise exception 'missing MA5 RLS helpers: %', array_to_string(missing, ', ');
  end if;

  if not public.ma5_role_grants_capability('owner', 'manage_business_settings') then
    raise exception 'ma5_role_grants_capability sanity check failed for owner/manage_business_settings';
  end if;

  if public.ma5_role_grants_capability('client', 'manage_business_settings') then
    raise exception 'ma5_role_grants_capability sanity check failed for client/manage_business_settings';
  end if;

  if not has_function_privilege('authenticated', 'public.ma5_is_tenant_member(uuid)', 'EXECUTE') then
    raise exception 'authenticated missing EXECUTE on ma5_is_tenant_member';
  end if;

  if has_function_privilege('public', 'public.ma5_is_tenant_member(uuid)', 'EXECUTE') then
    raise exception 'PUBLIC still has EXECUTE on ma5_is_tenant_member';
  end if;

  if has_function_privilege('public', 'public.ma5_role_grants_capability(text,text)', 'EXECUTE') then
    raise exception 'PUBLIC still has EXECUTE on ma5_role_grants_capability';
  end if;
end
$$;

commit;

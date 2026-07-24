-- MA5 → Signal Works migration 040
-- Invited (not yet active) users must read their own ma5_profiles row for
-- /auth/accept-invite. Migration 037 tightened ma5_is_tenant_member to
-- client_status = active only, which blocked self-select under ma5_profiles_select.
--
-- Prerequisite: 037_ma5_client_lifecycle.sql

begin;

drop policy if exists ma5_profiles_select on public.ma5_profiles;

create policy ma5_profiles_select
on public.ma5_profiles
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or id = auth.uid()
);

comment on policy ma5_profiles_select on public.ma5_profiles is
  'Staff read tenant profiles; any signed-in user may read their own profile row (including invited).';

commit;

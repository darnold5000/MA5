-- MA5 → Signal Works migration 036
-- Lock down global ma5_purge_expired_anonymous_visitors (cross-tenant).
--
-- The MA5 app no longer calls this RPC from request paths. Visitor retention
-- uses tenant-scoped purgeExpiredAnonymousVisitors() in application code.
-- Keep the function for optional service_role cron until a tenant-aware RPC ships.
--
-- Prerequisite: 026b_ma5_schema_hygiene (function definition)
--
-- Verify:
--   select grantee, privilege_type
--   from information_schema.role_routine_grants
--   where specific_schema = 'public'
--     and routine_name = 'ma5_purge_expired_anonymous_visitors';
--   -- Only service_role should have EXECUTE.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'ma5_purge_expired_anonymous_visitors'
  ) then
    raise exception
      'ma5_purge_expired_anonymous_visitors is missing — apply 026b first';
  end if;
end
$$;

revoke all on function public.ma5_purge_expired_anonymous_visitors(integer)
  from public;
revoke all on function public.ma5_purge_expired_anonymous_visitors(integer)
  from anon;
revoke all on function public.ma5_purge_expired_anonymous_visitors(integer)
  from authenticated;

grant execute on function public.ma5_purge_expired_anonymous_visitors(integer)
  to service_role;

do $$
declare
  bad_grants integer;
begin
  select count(*) into bad_grants
  from information_schema.role_routine_grants
  where specific_schema = 'public'
    and routine_name = 'ma5_purge_expired_anonymous_visitors'
    and grantee in ('anon', 'authenticated', 'PUBLIC')
    and privilege_type = 'EXECUTE';

  if bad_grants > 0 then
    raise exception
      'ma5_purge_expired_anonymous_visitors still executable by application roles (%)',
      bad_grants;
  end if;
end
$$;

commit;

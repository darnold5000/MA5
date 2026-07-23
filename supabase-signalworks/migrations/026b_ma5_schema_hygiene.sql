-- MA5 → Signal Works destination migration 026b
-- Hygiene patch for databases where 026 applied without post-apply hardening.
--
-- Prerequisite: 026_ma5_tenant_scoped_schema (40 ma5_* tables).
-- Safe to re-run (CREATE OR REPLACE + idempotent REVOKE/GRANT).
--
-- Changes:
--   1. INSERT-safe ma5_products_sync_active() (OLD only on UPDATE)
--   2. retention_days >= 1 guard on ma5_purge_expired_anonymous_visitors()
--   3. REVOKE PUBLIC execute on SECURITY DEFINER maintenance functions;
--      GRANT EXECUTE to service_role only (trigger invocations unaffected)

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
    raise exception 'ma5_profiles is missing — apply 026 before 026b';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 1. INSERT-safe product status / archived_at sync
-- ---------------------------------------------------------------------------

create or replace function public.ma5_products_sync_active()
returns trigger
language plpgsql
as $$
begin
  new.active := (new.status = 'active');

  if new.status = 'archived' then
    if tg_op = 'INSERT'
      or (tg_op = 'UPDATE' and old.status is distinct from 'archived')
    then
      new.archived_at := coalesce(new.archived_at, now());
    end if;
  else
    new.archived_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Purge guard + 3. Security definer grants (function bodies unchanged)
-- ---------------------------------------------------------------------------

create or replace function public.ma5_purge_expired_anonymous_visitors(
  retention_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if retention_days < 1 then
    raise exception 'retention_days must be >= 1, got %', retention_days;
  end if;

  delete from public.ma5_visitor_sessions v
  where v.last_seen < (now() - make_interval(days => retention_days))
    and not exists (
      select 1
      from public.ma5_leads l
      where l.visitor_id = v.visitor_id
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- ma5_touch_thread_on_message: SECURITY DEFINER trigger only (messages insert)
create or replace function public.ma5_touch_thread_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.ma5_message_threads
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

-- ma5_expire_announcements: callable by scheduled jobs via service_role
create or replace function public.ma5_expire_announcements()
returns void
language sql
security definer
set search_path = public
as $$
  update public.ma5_announcements
  set status = 'expired',
      updated_at = now()
  where status = 'published'
    and expires_at is not null
    and expires_at < now();
$$;

revoke all on function public.ma5_touch_thread_on_message() from public;
grant execute on function public.ma5_touch_thread_on_message() to service_role;

revoke all on function public.ma5_expire_announcements() from public;
grant execute on function public.ma5_expire_announcements() to service_role;

revoke all on function public.ma5_purge_expired_anonymous_visitors(integer) from public;
grant execute on function public.ma5_purge_expired_anonymous_visitors(integer) to service_role;

-- ---------------------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------------------

do $$
declare
  purge_src text;
begin
  select pg_get_functiondef('public.ma5_purge_expired_anonymous_visitors(integer)'::regprocedure)
  into purge_src;

  if purge_src not ilike '%retention_days < 1%' then
    raise exception 'ma5_purge_expired_anonymous_visitors missing retention_days guard';
  end if;

  if not has_function_privilege('service_role', 'public.ma5_expire_announcements()', 'EXECUTE') then
    raise exception 'service_role missing EXECUTE on ma5_expire_announcements';
  end if;

  if has_function_privilege('public', 'public.ma5_expire_announcements()', 'EXECUTE') then
    raise exception 'PUBLIC still has EXECUTE on ma5_expire_announcements';
  end if;
end
$$;

commit;

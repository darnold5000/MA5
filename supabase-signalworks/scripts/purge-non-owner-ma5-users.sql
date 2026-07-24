-- Purge all MA5 tenant users who do NOT have the owner role.
-- Keeps every profile with role = owner; removes auth.users + ma5_profiles for everyone else.
--
-- Shared Supabase: only touches users with a ma5_profiles row for ma5-performance.
--
-- HOW TO RUN (Supabase SQL Editor)
--   1) Run the PREVIEW query below — confirm the list is who you expect.
--   2) Run the PURGE block inside a transaction; change ROLLBACK → COMMIT when sure.
--
-- Does NOT cancel Stripe subscriptions in Stripe itself — clean those in Dashboard if needed.

-- =============================================================================
-- PREVIEW — safe to run anytime
-- =============================================================================

select
  p.id as user_id,
  u.email,
  p.full_name,
  coalesce(array_agg(distinct r.role order by r.role) filter (where r.role is not null), '{}') as roles,
  p.client_status,
  p.invitation_status
from public.ma5_profiles p
join public.tenants t on t.id = p.tenant_id
left join auth.users u on u.id = p.id
left join public.ma5_user_roles r
  on r.tenant_id = p.tenant_id and r.user_id = p.id
where t.slug = 'ma5-performance'
  and not exists (
    select 1
    from public.ma5_user_roles o
    where o.tenant_id = p.tenant_id
      and o.user_id = p.id
      and o.role = 'owner'
  )
group by p.id, u.email, p.full_name, p.client_status, p.invitation_status
order by u.email;

-- =============================================================================
-- PURGE — destructive; default ends with ROLLBACK so you can dry-run the deletes
-- =============================================================================

begin;

create temp table _ma5_purge_victims on commit drop as
select p.id as user_id
from public.ma5_profiles p
join public.tenants t on t.id = p.tenant_id
where t.slug = 'ma5-performance'
  and not exists (
    select 1
    from public.ma5_user_roles r
    where r.tenant_id = p.tenant_id
      and r.user_id = p.id
      and r.role = 'owner'
  );

do $$
declare
  v_tenant_id uuid;
  v_reassign_to uuid;
  v_owner_count int;
  v_victim_count int;
begin
  select t.id into v_tenant_id from public.tenants t where t.slug = 'ma5-performance';

  select count(distinct user_id) into v_owner_count
  from public.ma5_user_roles
  where tenant_id = v_tenant_id and role = 'owner';

  if v_owner_count < 1 then
    raise exception 'Refusing: no owner on tenant ma5-performance';
  end if;

  select r.user_id into v_reassign_to
  from public.ma5_user_roles r
  where r.tenant_id = v_tenant_id and r.role = 'owner'
  order by r.created_at asc
  limit 1;

  select count(*) into v_victim_count from _ma5_purge_victims;

  if v_victim_count = 0 then
    raise exception 'No non-owner users to remove';
  end if;

  raise notice 'Removing % user(s); reassigning their created_by rows to %',
    v_victim_count, v_reassign_to;

  update public.ma5_profiles p
  set lead_id = null
  where p.tenant_id = v_tenant_id
    and p.id in (select user_id from _ma5_purge_victims);

  update public.ma5_leads l
  set converted_profile_id = null
  where l.tenant_id = v_tenant_id
    and l.converted_profile_id in (select user_id from _ma5_purge_victims);

  update public.ma5_exercises e
  set created_by = v_reassign_to
  where e.tenant_id = v_tenant_id
    and e.created_by in (select user_id from _ma5_purge_victims);

  update public.ma5_workouts w
  set created_by = v_reassign_to
  where w.tenant_id = v_tenant_id
    and w.created_by in (select user_id from _ma5_purge_victims);

  update public.ma5_programs pr
  set created_by = v_reassign_to
  where pr.tenant_id = v_tenant_id
    and pr.created_by in (select user_id from _ma5_purge_victims);

  update public.ma5_teams tm
  set created_by = v_reassign_to
  where tm.tenant_id = v_tenant_id
    and tm.created_by in (select user_id from _ma5_purge_victims);

  update public.ma5_announcements a
  set created_by = v_reassign_to
  where a.tenant_id = v_tenant_id
    and a.created_by in (select user_id from _ma5_purge_victims);

  update public.ma5_message_threads mt
  set created_by = v_reassign_to
  where mt.tenant_id = v_tenant_id
    and mt.created_by in (select user_id from _ma5_purge_victims);

  delete from public.ma5_messages m
  where m.tenant_id = v_tenant_id
    and m.sender_user_id in (select user_id from _ma5_purge_victims);

  delete from public.ma5_message_threads mt
  where mt.tenant_id = v_tenant_id
    and mt.client_id in (select user_id from _ma5_purge_victims);

  delete from public.ma5_refunds rf
  where rf.tenant_id = v_tenant_id
    and rf.payment_id in (
      select pay.id
      from public.ma5_payments pay
      where pay.tenant_id = v_tenant_id
        and pay.user_id in (select user_id from _ma5_purge_victims)
    );

  delete from public.ma5_invoices inv
  where inv.tenant_id = v_tenant_id
    and inv.user_id in (select user_id from _ma5_purge_victims);

  delete from public.ma5_payments pay
  where pay.tenant_id = v_tenant_id
    and pay.user_id in (select user_id from _ma5_purge_victims);

  delete from public.ma5_checkout_sessions cs
  where cs.tenant_id = v_tenant_id
    and cs.user_id in (select user_id from _ma5_purge_victims);

  delete from public.ma5_subscriptions sub
  where sub.tenant_id = v_tenant_id
    and sub.user_id in (select user_id from _ma5_purge_victims);
end $$;

delete from auth.users u
where u.id in (select user_id from _ma5_purge_victims);

-- Change to COMMIT when preview looks right:
rollback;
-- commit;

-- Verify after a real commit:
-- select u.email, array_agg(r.role order by r.role)
-- from public.ma5_user_roles r
-- join auth.users u on u.id = r.user_id
-- join public.tenants t on t.id = r.tenant_id
-- where t.slug = 'ma5-performance'
-- group by u.email;

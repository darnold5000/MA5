-- MA5 → Signal Works migration 042
-- Fast staff unread badge count (avoids loading all messages in Node).
--
-- Prerequisite: 026_ma5_tenant_scoped_schema
--
-- Verify:
--   select public.ma5_count_staff_unread_messages('<staff-user-uuid>');

begin;

create or replace function public.ma5_count_staff_unread_messages(p_viewer_id uuid)
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  with last_msg as (
    select distinct on (m.thread_id)
      m.thread_id,
      m.sender_role
    from public.ma5_messages m
    where m.deleted_at is null
    order by m.thread_id, m.created_at desc
  ),
  unread as (
    select
      m.thread_id,
      count(*)::integer as cnt
    from public.ma5_messages m
    left join public.ma5_message_thread_reads r
      on r.thread_id = m.thread_id
     and r.user_id = p_viewer_id
    where m.deleted_at is null
      and m.sender_user_id <> p_viewer_id
      and (r.last_read_at is null or m.created_at > r.last_read_at)
    group by m.thread_id
  )
  select coalesce(sum(u.cnt), 0)::integer
  from unread u
  inner join last_msg lm on lm.thread_id = u.thread_id
  where lm.sender_role = 'client'
    and u.cnt > 0;
$$;

comment on function public.ma5_count_staff_unread_messages(uuid) is
  'Unread client messages for staff inbox badge; respects RLS on ma5_messages.';

revoke all on function public.ma5_count_staff_unread_messages(uuid) from public;
grant execute on function public.ma5_count_staff_unread_messages(uuid) to authenticated, service_role;

commit;

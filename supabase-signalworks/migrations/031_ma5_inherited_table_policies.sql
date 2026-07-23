-- MA5 → Signal Works destination migration 031
-- RLS policies for inherit-only child tables (no direct tenant_id column).
--
-- **Apply after 034** (column-guard triggers + commerce policy hardening).
--
-- Target: Signal Works shared Supabase only.
-- Prerequisites:
--   029_ma5_rls_policies (parent-table policies + policy helpers)
--
-- Skips 030: auth.users trigger never created on destination (D-14).
--
-- Tables:
--   ma5_program_days          → ma5_programs
--   ma5_workout_blocks        → ma5_workouts
--   ma5_workout_block_sets    → ma5_workout_blocks → ma5_workouts
--   ma5_team_members          → ma5_teams
--   ma5_announcement_recipients → ma5_announcements
--   ma5_message_thread_reads  → ma5_message_threads
--
-- Verify after apply:
--   select tablename, count(*) from pg_policies
--   where schemaname = 'public'
--     and tablename in (
--       'ma5_program_days',
--       'ma5_workout_blocks',
--       'ma5_workout_block_sets',
--       'ma5_team_members',
--       'ma5_announcement_recipients',
--       'ma5_message_thread_reads'
--     )
--   group by 1 order by 1;
--   -- expect 6 rows, 22 policies total

begin;

-- ---------------------------------------------------------------------------
-- Prerequisites
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('public.ma5_is_tenant_staff(uuid)') is null then
    raise exception 'ma5_is_tenant_staff is missing — apply 028/029 first';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ma5_profiles'
  ) then
    raise exception 'ma5_profiles policies missing — apply 029 first';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- ma5_program_days (parent: ma5_programs)
-- ---------------------------------------------------------------------------

drop policy if exists ma5_program_days_select on public.ma5_program_days;
create policy ma5_program_days_select
on public.ma5_program_days
for select
to authenticated
using (
  exists (
    select 1
    from public.ma5_programs p
    where p.id = program_id
      and (
        public.ma5_is_tenant_staff(p.tenant_id)
        or public.ma5_has_program_assignment(p.tenant_id, p.id)
      )
  )
);

drop policy if exists ma5_program_days_insert on public.ma5_program_days;
create policy ma5_program_days_insert
on public.ma5_program_days
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ma5_programs p
    where p.id = program_id
      and public.ma5_is_tenant_staff(p.tenant_id)
  )
);

drop policy if exists ma5_program_days_update on public.ma5_program_days;
create policy ma5_program_days_update
on public.ma5_program_days
for update
to authenticated
using (
  exists (
    select 1
    from public.ma5_programs p
    where p.id = program_id
      and public.ma5_is_tenant_staff(p.tenant_id)
  )
)
with check (
  exists (
    select 1
    from public.ma5_programs p
    where p.id = program_id
      and public.ma5_is_tenant_staff(p.tenant_id)
  )
);

drop policy if exists ma5_program_days_delete on public.ma5_program_days;
create policy ma5_program_days_delete
on public.ma5_program_days
for delete
to authenticated
using (
  exists (
    select 1
    from public.ma5_programs p
    where p.id = program_id
      and public.ma5_is_tenant_staff(p.tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- ma5_workout_blocks (parent: ma5_workouts)
-- ---------------------------------------------------------------------------

drop policy if exists ma5_workout_blocks_select on public.ma5_workout_blocks;
create policy ma5_workout_blocks_select
on public.ma5_workout_blocks
for select
to authenticated
using (
  exists (
    select 1
    from public.ma5_workouts w
    where w.id = workout_id
      and public.ma5_client_can_read_workout(w.tenant_id, w.id)
  )
);

drop policy if exists ma5_workout_blocks_insert on public.ma5_workout_blocks;
create policy ma5_workout_blocks_insert
on public.ma5_workout_blocks
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ma5_workouts w
    where w.id = workout_id
      and public.ma5_is_tenant_staff(w.tenant_id)
  )
);

drop policy if exists ma5_workout_blocks_update on public.ma5_workout_blocks;
create policy ma5_workout_blocks_update
on public.ma5_workout_blocks
for update
to authenticated
using (
  exists (
    select 1
    from public.ma5_workouts w
    where w.id = workout_id
      and public.ma5_is_tenant_staff(w.tenant_id)
  )
)
with check (
  exists (
    select 1
    from public.ma5_workouts w
    where w.id = workout_id
      and public.ma5_is_tenant_staff(w.tenant_id)
  )
);

drop policy if exists ma5_workout_blocks_delete on public.ma5_workout_blocks;
create policy ma5_workout_blocks_delete
on public.ma5_workout_blocks
for delete
to authenticated
using (
  exists (
    select 1
    from public.ma5_workouts w
    where w.id = workout_id
      and public.ma5_is_tenant_staff(w.tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- ma5_workout_block_sets (parent: ma5_workout_blocks → ma5_workouts)
-- ---------------------------------------------------------------------------

drop policy if exists ma5_workout_block_sets_select on public.ma5_workout_block_sets;
create policy ma5_workout_block_sets_select
on public.ma5_workout_block_sets
for select
to authenticated
using (
  exists (
    select 1
    from public.ma5_workout_blocks wb
    join public.ma5_workouts w on w.id = wb.workout_id
    where wb.id = block_id
      and public.ma5_client_can_read_workout(w.tenant_id, w.id)
  )
);

drop policy if exists ma5_workout_block_sets_insert on public.ma5_workout_block_sets;
create policy ma5_workout_block_sets_insert
on public.ma5_workout_block_sets
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ma5_workout_blocks wb
    join public.ma5_workouts w on w.id = wb.workout_id
    where wb.id = block_id
      and public.ma5_is_tenant_staff(w.tenant_id)
  )
);

drop policy if exists ma5_workout_block_sets_update on public.ma5_workout_block_sets;
create policy ma5_workout_block_sets_update
on public.ma5_workout_block_sets
for update
to authenticated
using (
  exists (
    select 1
    from public.ma5_workout_blocks wb
    join public.ma5_workouts w on w.id = wb.workout_id
    where wb.id = block_id
      and public.ma5_is_tenant_staff(w.tenant_id)
  )
)
with check (
  exists (
    select 1
    from public.ma5_workout_blocks wb
    join public.ma5_workouts w on w.id = wb.workout_id
    where wb.id = block_id
      and public.ma5_is_tenant_staff(w.tenant_id)
  )
);

drop policy if exists ma5_workout_block_sets_delete on public.ma5_workout_block_sets;
create policy ma5_workout_block_sets_delete
on public.ma5_workout_block_sets
for delete
to authenticated
using (
  exists (
    select 1
    from public.ma5_workout_blocks wb
    join public.ma5_workouts w on w.id = wb.workout_id
    where wb.id = block_id
      and public.ma5_is_tenant_staff(w.tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- ma5_team_members (parent: ma5_teams)
-- ---------------------------------------------------------------------------

drop policy if exists ma5_team_members_select on public.ma5_team_members;
create policy ma5_team_members_select
on public.ma5_team_members
for select
to authenticated
using (
  exists (
    select 1
    from public.ma5_teams t
    where t.id = team_id
      and (
        public.ma5_is_tenant_staff(t.tenant_id)
        or (
          user_id = auth.uid()
          and public.ma5_is_tenant_member(t.tenant_id)
        )
      )
  )
);

drop policy if exists ma5_team_members_insert on public.ma5_team_members;
create policy ma5_team_members_insert
on public.ma5_team_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ma5_teams t
    where t.id = team_id
      and public.ma5_is_tenant_staff(t.tenant_id)
  )
);

drop policy if exists ma5_team_members_update on public.ma5_team_members;
create policy ma5_team_members_update
on public.ma5_team_members
for update
to authenticated
using (
  exists (
    select 1
    from public.ma5_teams t
    where t.id = team_id
      and public.ma5_is_tenant_staff(t.tenant_id)
  )
)
with check (
  exists (
    select 1
    from public.ma5_teams t
    where t.id = team_id
      and public.ma5_is_tenant_staff(t.tenant_id)
  )
);

drop policy if exists ma5_team_members_delete on public.ma5_team_members;
create policy ma5_team_members_delete
on public.ma5_team_members
for delete
to authenticated
using (
  exists (
    select 1
    from public.ma5_teams t
    where t.id = team_id
      and public.ma5_is_tenant_staff(t.tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- ma5_announcement_recipients (parent: ma5_announcements)
-- ---------------------------------------------------------------------------

drop policy if exists ma5_announcement_recipients_select on public.ma5_announcement_recipients;
create policy ma5_announcement_recipients_select
on public.ma5_announcement_recipients
for select
to authenticated
using (
  exists (
    select 1
    from public.ma5_announcements a
    where a.id = announcement_id
      and (
        public.ma5_can_message_clients(a.tenant_id)
        or client_id = auth.uid()
        or user_id = auth.uid()
      )
  )
);

drop policy if exists ma5_announcement_recipients_insert on public.ma5_announcement_recipients;
create policy ma5_announcement_recipients_insert
on public.ma5_announcement_recipients
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ma5_announcements a
    where a.id = announcement_id
      and public.ma5_can_message_clients(a.tenant_id)
  )
);

drop policy if exists ma5_announcement_recipients_update on public.ma5_announcement_recipients;
create policy ma5_announcement_recipients_update
on public.ma5_announcement_recipients
for update
to authenticated
using (
  exists (
    select 1
    from public.ma5_announcements a
    where a.id = announcement_id
      and (
        public.ma5_can_message_clients(a.tenant_id)
        or client_id = auth.uid()
        or user_id = auth.uid()
      )
  )
)
with check (
  exists (
    select 1
    from public.ma5_announcements a
    where a.id = announcement_id
      and (
        public.ma5_can_message_clients(a.tenant_id)
        or client_id = auth.uid()
        or user_id = auth.uid()
      )
  )
);

-- ---------------------------------------------------------------------------
-- ma5_message_thread_reads (parent: ma5_message_threads)
-- ---------------------------------------------------------------------------

drop policy if exists ma5_message_thread_reads_select on public.ma5_message_thread_reads;
create policy ma5_message_thread_reads_select
on public.ma5_message_thread_reads
for select
to authenticated
using (
  exists (
    select 1
    from public.ma5_message_threads t
    where t.id = thread_id
      and (
        public.ma5_can_message_clients(t.tenant_id)
        or (
          user_id = auth.uid()
          and public.ma5_is_tenant_member(t.tenant_id)
        )
      )
  )
);

drop policy if exists ma5_message_thread_reads_insert on public.ma5_message_thread_reads;
create policy ma5_message_thread_reads_insert
on public.ma5_message_thread_reads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.ma5_message_threads t
    where t.id = thread_id
      and (
        public.ma5_can_message_clients(t.tenant_id)
        or (
          user_id = auth.uid()
          and public.ma5_is_tenant_member(t.tenant_id)
        )
      )
  )
);

drop policy if exists ma5_message_thread_reads_update on public.ma5_message_thread_reads;
create policy ma5_message_thread_reads_update
on public.ma5_message_thread_reads
for update
to authenticated
using (
  exists (
    select 1
    from public.ma5_message_threads t
    where t.id = thread_id
      and (
        public.ma5_can_message_clients(t.tenant_id)
        or (
          user_id = auth.uid()
          and public.ma5_is_tenant_member(t.tenant_id)
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.ma5_message_threads t
    where t.id = thread_id
      and (
        public.ma5_can_message_clients(t.tenant_id)
        or (
          user_id = auth.uid()
          and public.ma5_is_tenant_member(t.tenant_id)
        )
      )
  )
);

-- ---------------------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------------------

do $$
declare
  inherited_tables text[] := array[
    'ma5_program_days',
    'ma5_workout_blocks',
    'ma5_workout_block_sets',
    'ma5_team_members',
    'ma5_announcement_recipients',
    'ma5_message_thread_reads'
  ];
  tbl text;
  policy_count integer;
  total_inherited integer;
begin
  foreach tbl in array inherited_tables loop
    select count(*) into policy_count
    from pg_policies
    where schemaname = 'public'
      and tablename = tbl;

    if policy_count < 3 then
      raise exception '% expected at least 3 policies, found %', tbl, policy_count;
    end if;
  end loop;

  select count(*) into total_inherited
  from pg_policies
  where schemaname = 'public'
    and tablename = any (inherited_tables);

  if total_inherited <> 22 then
    raise exception 'expected 22 inherited-table policies, found %', total_inherited;
  end if;
end
$$;

commit;

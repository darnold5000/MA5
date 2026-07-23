-- MA5 → Signal Works destination migration 029
-- Tenant-scoped RLS policies on ma5_* tables with direct tenant_id.
--
-- Target: Signal Works shared Supabase only.
-- Prerequisites:
--   026_ma5_tenant_scoped_schema
--   028_ma5_rls_helpers
--
-- Inherited child tables (no tenant_id column) are deferred to 031:
--   ma5_program_days, ma5_workout_blocks, ma5_workout_block_sets,
--   ma5_team_members, ma5_announcement_recipients, ma5_message_thread_reads
--
-- ma5_stripe_webhook_events: service_role only — no policies.
--
-- Matrix: MA5/docs/migration/04-rls-and-authorization-plan.md
--
-- Verify after apply:
--   select tablename, count(*) from pg_policies
--   where schemaname = 'public' and tablename like 'ma5_%'
--   group by 1 order by 1;

begin;

-- ---------------------------------------------------------------------------
-- Prerequisites
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('public.ma5_is_tenant_member(uuid)') is null then
    raise exception 'ma5_is_tenant_member is missing — apply 028 first';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ma5_profiles'
  ) then
    raise exception 'ma5_profiles is missing — apply 026 first';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Policy helpers (tenant-scoped)
-- ---------------------------------------------------------------------------

create or replace function public.ma5_is_public_tenant_row(p_tenant_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select p_tenant_id is not null
    and public.ma5_current_tenant_id() is not null
    and p_tenant_id = public.ma5_current_tenant_id();
$$;

create or replace function public.ma5_can_message_clients(p_tenant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ma5_has_tenant_role(
    p_tenant_id,
    array['owner', 'admin', 'coach']
  );
$$;

create or replace function public.ma5_is_team_member(
  p_tenant_id uuid,
  p_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ma5_team_members tm
    join public.ma5_teams t on t.id = tm.team_id
    where tm.team_id = p_team_id
      and tm.user_id = auth.uid()
      and t.tenant_id = p_tenant_id
  );
$$;

create or replace function public.ma5_is_thread_client(
  p_tenant_id uuid,
  p_thread_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ma5_message_threads t
    where t.id = p_thread_id
      and t.tenant_id = p_tenant_id
      and t.client_id = auth.uid()
  );
$$;

create or replace function public.ma5_has_program_assignment(
  p_tenant_id uuid,
  p_program_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ma5_program_assignments pa
    where pa.tenant_id = p_tenant_id
      and pa.program_id = p_program_id
      and pa.status = 'active'
      and (
        pa.client_user_id = auth.uid()
        or (
          pa.team_id is not null
          and public.ma5_is_team_member(p_tenant_id, pa.team_id)
        )
      )
  );
$$;

create or replace function public.ma5_client_can_read_workout(
  p_tenant_id uuid,
  p_workout_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ma5_is_tenant_staff(p_tenant_id)
    or exists (
      select 1
      from public.ma5_calendar_entries ce
      where ce.tenant_id = p_tenant_id
        and ce.workout_id = p_workout_id
        and ce.publish_status = 'published'
        and (
          ce.client_user_id = auth.uid()
          or (
            ce.team_id is not null
            and public.ma5_is_team_member(p_tenant_id, ce.team_id)
          )
        )
    )
    or exists (
      select 1
      from public.ma5_program_days pd
      join public.ma5_program_assignments pa
        on pa.program_id = pd.program_id
       and pa.tenant_id = p_tenant_id
      where pd.workout_id = p_workout_id
        and pa.status = 'active'
        and (
          pa.client_user_id = auth.uid()
          or (
            pa.team_id is not null
            and public.ma5_is_team_member(p_tenant_id, pa.team_id)
          )
        )
    );
$$;

create or replace function public.ma5_client_can_read_exercise(
  p_tenant_id uuid,
  p_exercise_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ma5_is_tenant_staff(p_tenant_id)
    or exists (
      select 1
      from public.ma5_workout_blocks wb
      where wb.exercise_id = p_exercise_id
        and public.ma5_client_can_read_workout(p_tenant_id, wb.workout_id)
    );
$$;

revoke all on function public.ma5_is_public_tenant_row(uuid) from public;
revoke all on function public.ma5_can_message_clients(uuid) from public;
revoke all on function public.ma5_is_team_member(uuid, uuid) from public;
revoke all on function public.ma5_is_thread_client(uuid, uuid) from public;
revoke all on function public.ma5_has_program_assignment(uuid, uuid) from public;
revoke all on function public.ma5_client_can_read_workout(uuid, uuid) from public;
revoke all on function public.ma5_client_can_read_exercise(uuid, uuid) from public;

grant execute on function public.ma5_is_public_tenant_row(uuid) to anon, authenticated, service_role;
grant execute on function public.ma5_can_message_clients(uuid) to authenticated, service_role;
grant execute on function public.ma5_is_team_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.ma5_is_thread_client(uuid, uuid) to authenticated, service_role;
grant execute on function public.ma5_has_program_assignment(uuid, uuid) to authenticated, service_role;
grant execute on function public.ma5_client_can_read_workout(uuid, uuid) to authenticated, service_role;
grant execute on function public.ma5_client_can_read_exercise(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- ma5_profiles
-- ---------------------------------------------------------------------------

drop policy if exists ma5_profiles_select on public.ma5_profiles;
create policy ma5_profiles_select
on public.ma5_profiles
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (id = auth.uid() and public.ma5_is_tenant_member(tenant_id))
);

drop policy if exists ma5_profiles_update on public.ma5_profiles;
create policy ma5_profiles_update
on public.ma5_profiles
for update
to authenticated
using (
  (id = auth.uid() and public.ma5_is_tenant_member(tenant_id))
  or public.ma5_has_tenant_role(tenant_id, array['owner', 'admin'])
)
with check (
  (id = auth.uid() and public.ma5_is_tenant_member(tenant_id))
  or public.ma5_has_tenant_role(tenant_id, array['owner', 'admin'])
);

drop policy if exists ma5_profiles_delete on public.ma5_profiles;
create policy ma5_profiles_delete
on public.ma5_profiles
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_user_roles
-- ---------------------------------------------------------------------------

drop policy if exists ma5_user_roles_select on public.ma5_user_roles;
create policy ma5_user_roles_select
on public.ma5_user_roles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.ma5_is_tenant_staff(tenant_id)
);

drop policy if exists ma5_user_roles_insert on public.ma5_user_roles;
create policy ma5_user_roles_insert
on public.ma5_user_roles
for insert
to authenticated
with check (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists ma5_user_roles_update on public.ma5_user_roles;
create policy ma5_user_roles_update
on public.ma5_user_roles
for update
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']))
with check (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists ma5_user_roles_delete on public.ma5_user_roles;
create policy ma5_user_roles_delete
on public.ma5_user_roles
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner']));

-- ---------------------------------------------------------------------------
-- ma5_notifications
-- ---------------------------------------------------------------------------

drop policy if exists ma5_notifications_select on public.ma5_notifications;
create policy ma5_notifications_select
on public.ma5_notifications
for select
to authenticated
using (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_notifications_insert on public.ma5_notifications;
create policy ma5_notifications_insert
on public.ma5_notifications
for insert
to authenticated
with check (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_notifications_update on public.ma5_notifications;
create policy ma5_notifications_update
on public.ma5_notifications
for update
to authenticated
using (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
)
with check (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

-- ---------------------------------------------------------------------------
-- ma5_class_types
-- ---------------------------------------------------------------------------

drop policy if exists ma5_class_types_select_public on public.ma5_class_types;
create policy ma5_class_types_select_public
on public.ma5_class_types
for select
to anon
using (
  public.ma5_is_public_tenant_row(tenant_id)
  and active = true
);

drop policy if exists ma5_class_types_select_member on public.ma5_class_types;
create policy ma5_class_types_select_member
on public.ma5_class_types
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    public.ma5_is_tenant_member(tenant_id)
    and active = true
  )
);

drop policy if exists ma5_class_types_insert on public.ma5_class_types;
create policy ma5_class_types_insert
on public.ma5_class_types
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_class_types_update on public.ma5_class_types;
create policy ma5_class_types_update
on public.ma5_class_types
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_class_types_delete on public.ma5_class_types;
create policy ma5_class_types_delete
on public.ma5_class_types
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_products
-- ---------------------------------------------------------------------------

drop policy if exists ma5_products_select_public on public.ma5_products;
create policy ma5_products_select_public
on public.ma5_products
for select
to anon
using (
  public.ma5_is_public_tenant_row(tenant_id)
  and status = 'active'
  and active = true
);

drop policy if exists ma5_products_select_member on public.ma5_products;
create policy ma5_products_select_member
on public.ma5_products
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    public.ma5_is_tenant_member(tenant_id)
    and status = 'active'
    and active = true
  )
);

drop policy if exists ma5_products_insert on public.ma5_products;
create policy ma5_products_insert
on public.ma5_products
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_products_update on public.ma5_products;
create policy ma5_products_update
on public.ma5_products
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_products_delete on public.ma5_products;
create policy ma5_products_delete
on public.ma5_products
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_prices
-- ---------------------------------------------------------------------------

drop policy if exists ma5_prices_select_public on public.ma5_prices;
create policy ma5_prices_select_public
on public.ma5_prices
for select
to anon
using (
  public.ma5_is_public_tenant_row(tenant_id)
  and active = true
  and exists (
    select 1
    from public.ma5_products p
    where p.tenant_id = ma5_prices.tenant_id
      and p.id = ma5_prices.product_id
      and p.status = 'active'
      and p.active = true
  )
);

drop policy if exists ma5_prices_select_member on public.ma5_prices;
create policy ma5_prices_select_member
on public.ma5_prices
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    public.ma5_is_tenant_member(tenant_id)
    and active = true
    and exists (
      select 1
      from public.ma5_products p
      where p.tenant_id = ma5_prices.tenant_id
        and p.id = ma5_prices.product_id
        and p.status = 'active'
        and p.active = true
    )
  )
);

drop policy if exists ma5_prices_insert on public.ma5_prices;
create policy ma5_prices_insert
on public.ma5_prices
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_prices_update on public.ma5_prices;
create policy ma5_prices_update
on public.ma5_prices
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_prices_delete on public.ma5_prices;
create policy ma5_prices_delete
on public.ma5_prices
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_sessions
-- ---------------------------------------------------------------------------

drop policy if exists ma5_sessions_select_public on public.ma5_sessions;
create policy ma5_sessions_select_public
on public.ma5_sessions
for select
to anon
using (
  public.ma5_is_public_tenant_row(tenant_id)
  and status = 'published'
);

drop policy if exists ma5_sessions_select_member on public.ma5_sessions;
create policy ma5_sessions_select_member
on public.ma5_sessions
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    public.ma5_is_tenant_member(tenant_id)
    and status = 'published'
  )
  or (
    public.ma5_is_tenant_member(tenant_id)
    and exists (
      select 1
      from public.ma5_bookings b
      where b.tenant_id = ma5_sessions.tenant_id
        and b.session_id = ma5_sessions.id
        and b.user_id = auth.uid()
    )
  )
);

drop policy if exists ma5_sessions_insert on public.ma5_sessions;
create policy ma5_sessions_insert
on public.ma5_sessions
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_sessions_update on public.ma5_sessions;
create policy ma5_sessions_update
on public.ma5_sessions
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_sessions_delete on public.ma5_sessions;
create policy ma5_sessions_delete
on public.ma5_sessions
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_bookings
-- ---------------------------------------------------------------------------

drop policy if exists ma5_bookings_select on public.ma5_bookings;
create policy ma5_bookings_select
on public.ma5_bookings
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_bookings_insert on public.ma5_bookings;
create policy ma5_bookings_insert
on public.ma5_bookings
for insert
to authenticated
with check (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_bookings_update on public.ma5_bookings;
create policy ma5_bookings_update
on public.ma5_bookings
for update
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
)
with check (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_bookings_delete on public.ma5_bookings;
create policy ma5_bookings_delete
on public.ma5_bookings
for delete
to authenticated
using (public.ma5_is_tenant_staff(tenant_id));

-- ---------------------------------------------------------------------------
-- ma5_memberships
-- ---------------------------------------------------------------------------

drop policy if exists ma5_memberships_select on public.ma5_memberships;
create policy ma5_memberships_select
on public.ma5_memberships
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_memberships_insert on public.ma5_memberships;
create policy ma5_memberships_insert
on public.ma5_memberships
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_memberships_update on public.ma5_memberships;
create policy ma5_memberships_update
on public.ma5_memberships
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

-- ---------------------------------------------------------------------------
-- ma5_checkout_sessions
-- ---------------------------------------------------------------------------

drop policy if exists ma5_checkout_sessions_select on public.ma5_checkout_sessions;
create policy ma5_checkout_sessions_select
on public.ma5_checkout_sessions
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_checkout_sessions_insert on public.ma5_checkout_sessions;
create policy ma5_checkout_sessions_insert
on public.ma5_checkout_sessions
for insert
to authenticated
with check (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_checkout_sessions_update on public.ma5_checkout_sessions;
create policy ma5_checkout_sessions_update
on public.ma5_checkout_sessions
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

-- ---------------------------------------------------------------------------
-- ma5_payments
-- ---------------------------------------------------------------------------

drop policy if exists ma5_payments_select on public.ma5_payments;
create policy ma5_payments_select
on public.ma5_payments
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- ma5_subscriptions
-- ---------------------------------------------------------------------------

drop policy if exists ma5_subscriptions_select on public.ma5_subscriptions;
create policy ma5_subscriptions_select
on public.ma5_subscriptions
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- ma5_invoices
-- ---------------------------------------------------------------------------

drop policy if exists ma5_invoices_select on public.ma5_invoices;
create policy ma5_invoices_select
on public.ma5_invoices
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- ma5_refunds
-- ---------------------------------------------------------------------------

drop policy if exists ma5_refunds_select on public.ma5_refunds;
create policy ma5_refunds_select
on public.ma5_refunds
for select
to authenticated
using (public.ma5_is_tenant_staff(tenant_id));

-- ---------------------------------------------------------------------------
-- ma5_exercises
-- ---------------------------------------------------------------------------

drop policy if exists ma5_exercises_select on public.ma5_exercises;
create policy ma5_exercises_select
on public.ma5_exercises
for select
to authenticated
using (public.ma5_client_can_read_exercise(tenant_id, id));

drop policy if exists ma5_exercises_insert on public.ma5_exercises;
create policy ma5_exercises_insert
on public.ma5_exercises
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_exercises_update on public.ma5_exercises;
create policy ma5_exercises_update
on public.ma5_exercises
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_exercises_delete on public.ma5_exercises;
create policy ma5_exercises_delete
on public.ma5_exercises
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_workouts
-- ---------------------------------------------------------------------------

drop policy if exists ma5_workouts_select on public.ma5_workouts;
create policy ma5_workouts_select
on public.ma5_workouts
for select
to authenticated
using (public.ma5_client_can_read_workout(tenant_id, id));

drop policy if exists ma5_workouts_insert on public.ma5_workouts;
create policy ma5_workouts_insert
on public.ma5_workouts
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_workouts_update on public.ma5_workouts;
create policy ma5_workouts_update
on public.ma5_workouts
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_workouts_delete on public.ma5_workouts;
create policy ma5_workouts_delete
on public.ma5_workouts
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_programs
-- ---------------------------------------------------------------------------

drop policy if exists ma5_programs_select on public.ma5_programs;
create policy ma5_programs_select
on public.ma5_programs
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or public.ma5_has_program_assignment(tenant_id, id)
);

drop policy if exists ma5_programs_insert on public.ma5_programs;
create policy ma5_programs_insert
on public.ma5_programs
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_programs_update on public.ma5_programs;
create policy ma5_programs_update
on public.ma5_programs
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_programs_delete on public.ma5_programs;
create policy ma5_programs_delete
on public.ma5_programs
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_teams
-- ---------------------------------------------------------------------------

drop policy if exists ma5_teams_select on public.ma5_teams;
create policy ma5_teams_select
on public.ma5_teams
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or public.ma5_is_team_member(tenant_id, id)
);

drop policy if exists ma5_teams_insert on public.ma5_teams;
create policy ma5_teams_insert
on public.ma5_teams
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_teams_update on public.ma5_teams;
create policy ma5_teams_update
on public.ma5_teams
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_teams_delete on public.ma5_teams;
create policy ma5_teams_delete
on public.ma5_teams
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_program_assignments
-- ---------------------------------------------------------------------------

drop policy if exists ma5_program_assignments_select on public.ma5_program_assignments;
create policy ma5_program_assignments_select
on public.ma5_program_assignments
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or client_user_id = auth.uid()
  or (
    team_id is not null
    and public.ma5_is_team_member(tenant_id, team_id)
  )
);

drop policy if exists ma5_program_assignments_insert on public.ma5_program_assignments;
create policy ma5_program_assignments_insert
on public.ma5_program_assignments
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_program_assignments_update on public.ma5_program_assignments;
create policy ma5_program_assignments_update
on public.ma5_program_assignments
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_program_assignments_delete on public.ma5_program_assignments;
create policy ma5_program_assignments_delete
on public.ma5_program_assignments
for delete
to authenticated
using (public.ma5_is_tenant_staff(tenant_id));

-- ---------------------------------------------------------------------------
-- ma5_calendar_entries
-- ---------------------------------------------------------------------------

drop policy if exists ma5_calendar_entries_select on public.ma5_calendar_entries;
create policy ma5_calendar_entries_select
on public.ma5_calendar_entries
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    publish_status = 'published'
    and (
      client_user_id = auth.uid()
      or (
        team_id is not null
        and public.ma5_is_team_member(tenant_id, team_id)
      )
    )
  )
);

drop policy if exists ma5_calendar_entries_insert on public.ma5_calendar_entries;
create policy ma5_calendar_entries_insert
on public.ma5_calendar_entries
for insert
to authenticated
with check (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    client_user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_calendar_entries_update on public.ma5_calendar_entries;
create policy ma5_calendar_entries_update
on public.ma5_calendar_entries
for update
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    client_user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
)
with check (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    client_user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_calendar_entries_delete on public.ma5_calendar_entries;
create policy ma5_calendar_entries_delete
on public.ma5_calendar_entries
for delete
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    client_user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

-- ---------------------------------------------------------------------------
-- ma5_workout_completions
-- ---------------------------------------------------------------------------

drop policy if exists ma5_workout_completions_select on public.ma5_workout_completions;
create policy ma5_workout_completions_select
on public.ma5_workout_completions
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    client_user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_workout_completions_insert on public.ma5_workout_completions;
create policy ma5_workout_completions_insert
on public.ma5_workout_completions
for insert
to authenticated
with check (
  client_user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_workout_completions_update on public.ma5_workout_completions;
create policy ma5_workout_completions_update
on public.ma5_workout_completions
for update
to authenticated
using (
  client_user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
)
with check (
  client_user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

-- ---------------------------------------------------------------------------
-- ma5_workout_set_logs
-- ---------------------------------------------------------------------------

drop policy if exists ma5_workout_set_logs_select on public.ma5_workout_set_logs;
create policy ma5_workout_set_logs_select
on public.ma5_workout_set_logs
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    client_user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_workout_set_logs_insert on public.ma5_workout_set_logs;
create policy ma5_workout_set_logs_insert
on public.ma5_workout_set_logs
for insert
to authenticated
with check (
  client_user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_workout_set_logs_update on public.ma5_workout_set_logs;
create policy ma5_workout_set_logs_update
on public.ma5_workout_set_logs
for update
to authenticated
using (
  client_user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
)
with check (
  client_user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

-- ---------------------------------------------------------------------------
-- ma5_client_waivers
-- ---------------------------------------------------------------------------

drop policy if exists ma5_client_waivers_select on public.ma5_client_waivers;
create policy ma5_client_waivers_select
on public.ma5_client_waivers
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_client_waivers_insert on public.ma5_client_waivers;
create policy ma5_client_waivers_insert
on public.ma5_client_waivers
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

-- ---------------------------------------------------------------------------
-- ma5_message_threads
-- ---------------------------------------------------------------------------

drop policy if exists ma5_message_threads_select on public.ma5_message_threads;
create policy ma5_message_threads_select
on public.ma5_message_threads
for select
to authenticated
using (
  public.ma5_can_message_clients(tenant_id)
  or (
    client_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_message_threads_insert on public.ma5_message_threads;
create policy ma5_message_threads_insert
on public.ma5_message_threads
for insert
to authenticated
with check (
  public.ma5_can_message_clients(tenant_id)
  or (
    client_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_message_threads_update on public.ma5_message_threads;
create policy ma5_message_threads_update
on public.ma5_message_threads
for update
to authenticated
using (public.ma5_can_message_clients(tenant_id))
with check (public.ma5_can_message_clients(tenant_id));

-- ---------------------------------------------------------------------------
-- ma5_messages
-- ---------------------------------------------------------------------------

drop policy if exists ma5_messages_select on public.ma5_messages;
create policy ma5_messages_select
on public.ma5_messages
for select
to authenticated
using (
  public.ma5_can_message_clients(tenant_id)
  or public.ma5_is_thread_client(tenant_id, thread_id)
);

drop policy if exists ma5_messages_insert on public.ma5_messages;
create policy ma5_messages_insert
on public.ma5_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
  and (
    public.ma5_can_message_clients(tenant_id)
    or (
      public.ma5_is_thread_client(tenant_id, thread_id)
      and sender_role = 'client'
    )
  )
);

drop policy if exists ma5_messages_update on public.ma5_messages;
create policy ma5_messages_update
on public.ma5_messages
for update
to authenticated
using (
  public.ma5_can_message_clients(tenant_id)
  or (
    sender_user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
)
with check (
  public.ma5_can_message_clients(tenant_id)
  or (
    sender_user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_messages_delete on public.ma5_messages;
create policy ma5_messages_delete
on public.ma5_messages
for delete
to authenticated
using (public.ma5_can_message_clients(tenant_id));

-- ---------------------------------------------------------------------------
-- ma5_announcements
-- ---------------------------------------------------------------------------

drop policy if exists ma5_announcements_select on public.ma5_announcements;
create policy ma5_announcements_select
on public.ma5_announcements
for select
to authenticated
using (
  public.ma5_can_message_clients(tenant_id)
  or (
    status in ('published', 'expired')
    and exists (
      select 1
      from public.ma5_announcement_recipients r
      where r.announcement_id = ma5_announcements.id
        and (
          r.client_id = auth.uid()
          or r.user_id = auth.uid()
        )
    )
  )
);

drop policy if exists ma5_announcements_insert on public.ma5_announcements;
create policy ma5_announcements_insert
on public.ma5_announcements
for insert
to authenticated
with check (public.ma5_can_message_clients(tenant_id));

drop policy if exists ma5_announcements_update on public.ma5_announcements;
create policy ma5_announcements_update
on public.ma5_announcements
for update
to authenticated
using (public.ma5_can_message_clients(tenant_id))
with check (public.ma5_can_message_clients(tenant_id));

drop policy if exists ma5_announcements_delete on public.ma5_announcements;
create policy ma5_announcements_delete
on public.ma5_announcements
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_push_subscriptions
-- ---------------------------------------------------------------------------

drop policy if exists ma5_push_subscriptions_select on public.ma5_push_subscriptions;
create policy ma5_push_subscriptions_select
on public.ma5_push_subscriptions
for select
to authenticated
using (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_push_subscriptions_insert on public.ma5_push_subscriptions;
create policy ma5_push_subscriptions_insert
on public.ma5_push_subscriptions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_push_subscriptions_update on public.ma5_push_subscriptions;
create policy ma5_push_subscriptions_update
on public.ma5_push_subscriptions
for update
to authenticated
using (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
)
with check (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_push_subscriptions_delete on public.ma5_push_subscriptions;
create policy ma5_push_subscriptions_delete
on public.ma5_push_subscriptions
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

-- ---------------------------------------------------------------------------
-- ma5_visitor_sessions
-- ---------------------------------------------------------------------------

drop policy if exists ma5_visitor_sessions_select on public.ma5_visitor_sessions;
create policy ma5_visitor_sessions_select
on public.ma5_visitor_sessions
for select
to authenticated
using (public.ma5_is_tenant_staff(tenant_id));

-- ---------------------------------------------------------------------------
-- ma5_leads
-- ---------------------------------------------------------------------------

drop policy if exists ma5_leads_select on public.ma5_leads;
create policy ma5_leads_select
on public.ma5_leads
for select
to authenticated
using (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_leads_update on public.ma5_leads;
create policy ma5_leads_update
on public.ma5_leads
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_leads_delete on public.ma5_leads;
create policy ma5_leads_delete
on public.ma5_leads
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_member_goals
-- ---------------------------------------------------------------------------

drop policy if exists ma5_member_goals_select on public.ma5_member_goals;
create policy ma5_member_goals_select
on public.ma5_member_goals
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_member_goals_insert on public.ma5_member_goals;
create policy ma5_member_goals_insert
on public.ma5_member_goals
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_member_goals_update on public.ma5_member_goals;
create policy ma5_member_goals_update
on public.ma5_member_goals
for update
to authenticated
using (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
)
with check (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_member_goals_delete on public.ma5_member_goals;
create policy ma5_member_goals_delete
on public.ma5_member_goals
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

-- ---------------------------------------------------------------------------
-- ma5_progress_photos
-- ---------------------------------------------------------------------------

drop policy if exists ma5_progress_photos_select on public.ma5_progress_photos;
create policy ma5_progress_photos_select
on public.ma5_progress_photos
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    user_id = auth.uid()
    and public.ma5_is_tenant_member(tenant_id)
  )
);

drop policy if exists ma5_progress_photos_insert on public.ma5_progress_photos;
create policy ma5_progress_photos_insert
on public.ma5_progress_photos
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_progress_photos_update on public.ma5_progress_photos;
create policy ma5_progress_photos_update
on public.ma5_progress_photos
for update
to authenticated
using (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
)
with check (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_progress_photos_delete on public.ma5_progress_photos;
create policy ma5_progress_photos_delete
on public.ma5_progress_photos
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

-- ---------------------------------------------------------------------------
-- ma5_marketing_gallery
-- ---------------------------------------------------------------------------

drop policy if exists ma5_marketing_gallery_select_public on public.ma5_marketing_gallery;
create policy ma5_marketing_gallery_select_public
on public.ma5_marketing_gallery
for select
to anon
using (public.ma5_is_public_tenant_row(tenant_id));

drop policy if exists ma5_marketing_gallery_select_member on public.ma5_marketing_gallery;
create policy ma5_marketing_gallery_select_member
on public.ma5_marketing_gallery
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_marketing_gallery_insert on public.ma5_marketing_gallery;
create policy ma5_marketing_gallery_insert
on public.ma5_marketing_gallery
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_marketing_gallery_update on public.ma5_marketing_gallery;
create policy ma5_marketing_gallery_update
on public.ma5_marketing_gallery
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

drop policy if exists ma5_marketing_gallery_delete on public.ma5_marketing_gallery;
create policy ma5_marketing_gallery_delete
on public.ma5_marketing_gallery
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

-- ---------------------------------------------------------------------------
-- ma5_community_posts
-- ---------------------------------------------------------------------------

drop policy if exists ma5_community_posts_select on public.ma5_community_posts;
create policy ma5_community_posts_select
on public.ma5_community_posts
for select
to authenticated
using (public.ma5_is_tenant_member(tenant_id));

drop policy if exists ma5_community_posts_insert on public.ma5_community_posts;
create policy ma5_community_posts_insert
on public.ma5_community_posts
for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
);

drop policy if exists ma5_community_posts_update on public.ma5_community_posts;
create policy ma5_community_posts_update
on public.ma5_community_posts
for update
to authenticated
using (
  author_user_id = auth.uid()
  or public.ma5_is_tenant_staff(tenant_id)
)
with check (
  author_user_id = auth.uid()
  or public.ma5_is_tenant_staff(tenant_id)
);

drop policy if exists ma5_community_posts_delete on public.ma5_community_posts;
create policy ma5_community_posts_delete
on public.ma5_community_posts
for delete
to authenticated
using (
  author_user_id = auth.uid()
  or public.ma5_is_tenant_staff(tenant_id)
);

-- ---------------------------------------------------------------------------
-- ma5_locations
-- ---------------------------------------------------------------------------

drop policy if exists ma5_locations_select_public on public.ma5_locations;
create policy ma5_locations_select_public
on public.ma5_locations
for select
to anon
using (
  public.ma5_is_public_tenant_row(tenant_id)
  and is_active = true
);

drop policy if exists ma5_locations_select_member on public.ma5_locations;
create policy ma5_locations_select_member
on public.ma5_locations
for select
to authenticated
using (
  public.ma5_is_tenant_staff(tenant_id)
  or (
    public.ma5_is_tenant_member(tenant_id)
    and is_active = true
  )
);

drop policy if exists ma5_locations_insert on public.ma5_locations;
create policy ma5_locations_insert
on public.ma5_locations
for insert
to authenticated
with check (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists ma5_locations_update on public.ma5_locations;
create policy ma5_locations_update
on public.ma5_locations
for update
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']))
with check (public.ma5_has_tenant_role(tenant_id, array['owner', 'admin']));

drop policy if exists ma5_locations_delete on public.ma5_locations;
create policy ma5_locations_delete
on public.ma5_locations
for delete
to authenticated
using (public.ma5_has_tenant_role(tenant_id, array['owner']));

-- ---------------------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------------------

do $$
declare
  policy_count integer;
  webhook_policy_count integer;
  deferred_without_policy integer;
begin
  select count(*) into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename like 'ma5_%';

  if policy_count < 100 then
    raise exception 'expected at least 100 ma5_* policies, found %', policy_count;
  end if;

  select count(*) into webhook_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'ma5_stripe_webhook_events';

  if webhook_policy_count <> 0 then
    raise exception 'ma5_stripe_webhook_events must have no policies (service_role only)';
  end if;

  select count(*) into deferred_without_policy
  from (
    values
      ('ma5_program_days'),
      ('ma5_workout_blocks'),
      ('ma5_workout_block_sets'),
      ('ma5_team_members'),
      ('ma5_announcement_recipients'),
      ('ma5_message_thread_reads')
  ) as t(tablename)
  where not exists (
    select 1
    from pg_policies p
    where p.schemaname = 'public'
      and p.tablename = t.tablename
  );

  if deferred_without_policy <> 6 then
    raise exception 'expected 6 inherited tables without policies until 031, mismatch %', deferred_without_policy;
  end if;

  if to_regprocedure('public.ma5_can_message_clients(uuid)') is null then
    raise exception 'ma5_can_message_clients helper missing after 029';
  end if;
end
$$;

commit;

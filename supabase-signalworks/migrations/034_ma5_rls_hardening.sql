-- MA5 → Signal Works destination migration 034
-- RLS hardening: tighten commerce policies, then column-guard triggers.
--
-- Does not roll back 029 — replaces selected policies and adds triggers.
--
-- Target: Signal Works shared Supabase only.
-- Prerequisites:
--   028_ma5_rls_helpers
--   029_ma5_rls_policies
--
-- Apply before 031 (inherited table policies) and production cutover.
--
-- Verify after apply:
--   select proname from pg_proc
--   where proname like 'ma5_guard_%' or proname like 'ma5_%derive%'
--   order by 1;
--   select policyname from pg_policies
--   where tablename in ('ma5_bookings', 'ma5_checkout_sessions', 'ma5_calendar_entries', 'ma5_messages')
--     and policyname like 'ma5_%'
--   order by 1, 2;

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
    from pg_policies
    where schemaname = 'public'
      and tablename = 'ma5_bookings'
      and policyname in ('ma5_bookings_insert', 'ma5_bookings_insert_staff')
  ) then
    raise exception 'ma5_bookings insert policy is missing — apply 029 first';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.ma5_is_rls_bypass()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.role(), '') = 'service_role';
$$;

comment on function public.ma5_is_rls_bypass() is
  'True for service_role JWTs; column guards skip enforcement.';

revoke all on function public.ma5_is_rls_bypass() from public;
grant execute on function public.ma5_is_rls_bypass() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Tenant derivation (client inserts omit tenant_id today)
-- ---------------------------------------------------------------------------

create or replace function public.ma5_bookings_derive_tenant_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_tenant uuid;
begin
  if new.tenant_id is not null then
    return new;
  end if;

  select s.tenant_id
  into session_tenant
  from public.ma5_sessions s
  where s.id = new.session_id;

  if session_tenant is null then
    raise exception 'ma5_bookings: session_id % not found', new.session_id;
  end if;

  new.tenant_id := session_tenant;
  return new;
end;
$$;

create or replace function public.ma5_messages_derive_tenant_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_tenant uuid;
begin
  if new.tenant_id is not null then
    return new;
  end if;

  select mt.tenant_id
  into thread_tenant
  from public.ma5_message_threads mt
  where mt.id = new.thread_id;

  if thread_tenant is null then
    raise exception 'ma5_messages: thread_id % not found', new.thread_id;
  end if;

  new.tenant_id := thread_tenant;
  return new;
end;
$$;

drop trigger if exists ma5_bookings_derive_tenant_id on public.ma5_bookings;
create trigger ma5_bookings_derive_tenant_id
before insert on public.ma5_bookings
for each row execute function public.ma5_bookings_derive_tenant_id();

drop trigger if exists ma5_messages_derive_tenant_id on public.ma5_messages;
create trigger ma5_messages_derive_tenant_id
before insert on public.ma5_messages
for each row execute function public.ma5_messages_derive_tenant_id();

-- ma5_checkout_sessions: service_role writes only (app checkout + webhooks).
drop policy if exists ma5_checkout_sessions_insert on public.ma5_checkout_sessions;

-- ma5_bookings: split staff vs client insert/update.
drop policy if exists ma5_bookings_insert on public.ma5_bookings;
drop policy if exists ma5_bookings_update on public.ma5_bookings;

create policy ma5_bookings_insert_staff
on public.ma5_bookings
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

create policy ma5_bookings_insert_client
on public.ma5_bookings
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
  and status in ('pending', 'confirmed')
  and payment_status in ('not_required', 'pay_at_facility', 'pending')
  and exists (
    select 1
    from public.ma5_sessions s
    where s.id = session_id
      and s.tenant_id = tenant_id
  )
);

create policy ma5_bookings_update_staff
on public.ma5_bookings
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

create policy ma5_bookings_update_client_cancel
on public.ma5_bookings
for update
to authenticated
using (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
  and status not in ('cancelled', 'refunded')
)
with check (
  user_id = auth.uid()
  and public.ma5_is_tenant_member(tenant_id)
  and status = 'cancelled'
);

-- ma5_calendar_entries: staff-only mutations (clients read published via 029).
drop policy if exists ma5_calendar_entries_insert on public.ma5_calendar_entries;
drop policy if exists ma5_calendar_entries_update on public.ma5_calendar_entries;
drop policy if exists ma5_calendar_entries_delete on public.ma5_calendar_entries;

create policy ma5_calendar_entries_insert
on public.ma5_calendar_entries
for insert
to authenticated
with check (public.ma5_is_tenant_staff(tenant_id));

create policy ma5_calendar_entries_update
on public.ma5_calendar_entries
for update
to authenticated
using (public.ma5_is_tenant_staff(tenant_id))
with check (public.ma5_is_tenant_staff(tenant_id));

create policy ma5_calendar_entries_delete
on public.ma5_calendar_entries
for delete
to authenticated
using (public.ma5_is_tenant_staff(tenant_id));

-- ma5_messages: staff-only updates (clients insert only).
drop policy if exists ma5_messages_update on public.ma5_messages;

create policy ma5_messages_update
on public.ma5_messages
for update
to authenticated
using (public.ma5_can_message_clients(tenant_id))
with check (public.ma5_can_message_clients(tenant_id));

-- ---------------------------------------------------------------------------
-- Part B — Column-guard triggers
-- ---------------------------------------------------------------------------

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

  return new;
end;
$$;

create or replace function public.ma5_guard_booking_client_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  session_price int;
  session_tenant uuid;
begin
  if public.ma5_is_rls_bypass()
     or public.ma5_is_tenant_staff(new.tenant_id) then
    return new;
  end if;

  if new.user_id is distinct from auth.uid() then
    raise exception 'booking user_id must match authenticated user';
  end if;

  select s.tenant_id, s.price_cents
  into session_tenant, session_price
  from public.ma5_sessions s
  where s.id = new.session_id;

  if session_tenant is null then
    raise exception 'booking session not found';
  end if;

  if new.tenant_id is distinct from session_tenant then
    raise exception 'booking tenant must match session tenant';
  end if;

  if new.amount_cents is distinct from session_price then
    raise exception 'booking amount must match session price';
  end if;

  if new.status not in ('pending', 'confirmed') then
    raise exception 'invalid booking status for client insert';
  end if;

  if new.payment_status in ('paid', 'refunded') then
    raise exception 'invalid payment_status for client insert';
  end if;

  return new;
end;
$$;

create or replace function public.ma5_guard_booking_client_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.ma5_is_rls_bypass()
     or public.ma5_is_tenant_staff(old.tenant_id) then
    return new;
  end if;

  if old.user_id is distinct from auth.uid() then
    raise exception 'booking update forbidden';
  end if;

  new.tenant_id := old.tenant_id;
  new.session_id := old.session_id;
  new.user_id := old.user_id;
  new.confirmation_number := old.confirmation_number;
  new.amount_cents := old.amount_cents;
  new.payment_status := old.payment_status;
  new.stripe_checkout_session_id := old.stripe_checkout_session_id;
  new.notes := old.notes;
  new.created_at := old.created_at;

  if new.status is distinct from old.status then
    if new.status <> 'cancelled' then
      raise exception 'clients may only cancel bookings';
    end if;

    if old.status in ('cancelled', 'refunded', 'attended', 'no_show') then
      raise exception 'booking cannot be cancelled';
    end if;

    if old.payment_status = 'paid' then
      raise exception 'paid bookings cannot be cancelled by client';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.ma5_guard_message_client_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.ma5_is_rls_bypass()
     or public.ma5_can_message_clients(new.tenant_id) then
    return new;
  end if;

  new.sender_user_id := auth.uid();
  new.sender_role := 'client';

  return new;
end;
$$;

create or replace function public.ma5_guard_message_sender_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.ma5_is_rls_bypass()
     or public.ma5_can_message_clients(old.tenant_id) then
    return new;
  end if;

  new.tenant_id := old.tenant_id;
  new.thread_id := old.thread_id;
  new.sender_user_id := old.sender_user_id;
  new.sender_role := old.sender_role;
  new.created_at := old.created_at;

  return new;
end;
$$;

create or replace function public.ma5_guard_announcement_recipient_client_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  announcement_tenant uuid;
begin
  if public.ma5_is_rls_bypass() then
    return new;
  end if;

  select a.tenant_id
  into announcement_tenant
  from public.ma5_announcements a
  where a.id = old.announcement_id;

  if announcement_tenant is not null
     and public.ma5_can_message_clients(announcement_tenant) then
    return new;
  end if;

  if old.client_id is distinct from auth.uid()
     and (old.user_id is null or old.user_id is distinct from auth.uid()) then
    raise exception 'announcement recipient update forbidden';
  end if;

  new.announcement_id := old.announcement_id;
  new.client_id := old.client_id;
  new.user_id := old.user_id;
  new.delivered_at := old.delivered_at;
  new.email_sent_at := old.email_sent_at;
  new.push_sent_at := old.push_sent_at;

  return new;
end;
$$;

drop trigger if exists ma5_profiles_guard_client_columns on public.ma5_profiles;
create trigger ma5_profiles_guard_client_columns
before update on public.ma5_profiles
for each row execute function public.ma5_guard_profile_client_columns();

drop trigger if exists ma5_bookings_guard_client_insert_validate on public.ma5_bookings;
create trigger ma5_bookings_guard_client_insert_validate
before insert on public.ma5_bookings
for each row execute function public.ma5_guard_booking_client_insert();

drop trigger if exists ma5_bookings_guard_client_update on public.ma5_bookings;
create trigger ma5_bookings_guard_client_update
before update on public.ma5_bookings
for each row execute function public.ma5_guard_booking_client_update();

drop trigger if exists ma5_messages_guard_client_insert on public.ma5_messages;
create trigger ma5_messages_guard_client_insert
before insert on public.ma5_messages
for each row execute function public.ma5_guard_message_client_insert();

drop trigger if exists ma5_messages_guard_sender_columns on public.ma5_messages;
create trigger ma5_messages_guard_sender_columns
before update on public.ma5_messages
for each row execute function public.ma5_guard_message_sender_columns();

drop trigger if exists ma5_announcement_recipients_guard_client_columns
  on public.ma5_announcement_recipients;
create trigger ma5_announcement_recipients_guard_client_columns
before update on public.ma5_announcement_recipients
for each row execute function public.ma5_guard_announcement_recipient_client_columns();

-- ---------------------------------------------------------------------------
-- Grants (trigger functions are security definer; no client execute needed)
-- ---------------------------------------------------------------------------

revoke all on function public.ma5_bookings_derive_tenant_id() from public;
revoke all on function public.ma5_messages_derive_tenant_id() from public;
revoke all on function public.ma5_guard_profile_client_columns() from public;
revoke all on function public.ma5_guard_booking_client_insert() from public;
revoke all on function public.ma5_guard_booking_client_update() from public;
revoke all on function public.ma5_guard_message_client_insert() from public;
revoke all on function public.ma5_guard_message_sender_columns() from public;
revoke all on function public.ma5_guard_announcement_recipient_client_columns() from public;

-- ---------------------------------------------------------------------------
-- Post-apply validation
-- ---------------------------------------------------------------------------

do $$
declare
  checkout_insert_count int;
  booking_policy_count int;
begin
  select count(*)
  into checkout_insert_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'ma5_checkout_sessions'
    and cmd = 'INSERT';

  if checkout_insert_count <> 0 then
    raise exception 'ma5_checkout_sessions must have no authenticated INSERT policies';
  end if;

  select count(*)
  into booking_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'ma5_bookings'
    and policyname in (
      'ma5_bookings_insert_staff',
      'ma5_bookings_insert_client',
      'ma5_bookings_update_staff',
      'ma5_bookings_update_client_cancel'
    );

  if booking_policy_count <> 4 then
    raise exception 'ma5_bookings hardened policies missing (expected 4, got %)', booking_policy_count;
  end if;

  if to_regprocedure('public.ma5_guard_profile_client_columns()') is null then
    raise exception 'ma5_guard_profile_client_columns is missing';
  end if;
end
$$;

commit;

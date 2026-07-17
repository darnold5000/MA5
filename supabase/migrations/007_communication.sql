-- MA5 Communication System (v1)
-- Direct messages, announcements, read tracking, in-app notifications.
--
-- TENANCY WARNING (do not ignore when porting to Signal Works):
-- This schema is intentionally SINGLE-FACILITY / NOT multi-tenant.
-- There is no facility_id (or tenant_id) on threads, messages, announcements,
-- recipients, or notifications. RLS scopes by user role and client ownership
-- only — it does NOT isolate data between gyms.
-- When Signal Works reuses this for multiple gyms, you MUST add a tenant key
-- and rewrite policies before calling the communication schema "tenant-safe."
-- Matches MA5 today (ma5_facility_settings singleton, id = 1).
--
-- External email/SMS/advanced push deferred — see docs/COMMUNICATION_PHASE2_DEFERRED.md

-- ---------------------------------------------------------------------------
-- Extend existing notifications for typed communication events
-- ---------------------------------------------------------------------------

alter table public.ma5_notifications
  add column if not exists type text not null default 'system'
    check (type in (
      'direct_message',
      'announcement',
      'program_update',
      'booking_reminder',
      'billing',
      'system'
    )),
  add column if not exists entity_type text,
  add column if not exists entity_id uuid;

create index if not exists ma5_notifications_user_unread_idx
  on public.ma5_notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists ma5_notifications_type_idx
  on public.ma5_notifications (type);

-- ---------------------------------------------------------------------------
-- Direct message threads (one open thread per client for v1)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_message_threads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.ma5_profiles (id) on delete cascade,
  created_by uuid not null references public.ma5_profiles (id) on delete restrict,
  subject text,
  status text not null default 'open'
    check (status in ('open', 'archived')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active (open) direct thread per client
create unique index if not exists ma5_message_threads_one_open_per_client
  on public.ma5_message_threads (client_id)
  where status = 'open';

create index if not exists ma5_message_threads_client_idx
  on public.ma5_message_threads (client_id);

create index if not exists ma5_message_threads_last_message_idx
  on public.ma5_message_threads (last_message_at desc nulls last);

drop trigger if exists ma5_message_threads_set_updated_at on public.ma5_message_threads;
create trigger ma5_message_threads_set_updated_at
before update on public.ma5_message_threads
for each row execute function public.ma5_set_updated_at();

-- ---------------------------------------------------------------------------
-- Messages (plain text only in v1)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ma5_message_threads (id) on delete cascade,
  sender_user_id uuid not null references public.ma5_profiles (id) on delete restrict,
  sender_role text not null
    check (sender_role in ('coach', 'client', 'admin')),
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);

create index if not exists ma5_messages_thread_created_idx
  on public.ma5_messages (thread_id, created_at);

create index if not exists ma5_messages_sender_idx
  on public.ma5_messages (sender_user_id);

-- ---------------------------------------------------------------------------
-- Per-participant last-read (unread = messages after last_read_at)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_message_thread_reads (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ma5_message_threads (id) on delete cascade,
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique (thread_id, user_id)
);

create index if not exists ma5_message_thread_reads_user_idx
  on public.ma5_message_thread_reads (user_id);

-- ---------------------------------------------------------------------------
-- Announcements (one-way in v1)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_announcements (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.ma5_profiles (id) on delete restrict,
  title text not null,
  body text not null,
  audience_type text not null
    check (audience_type in (
      'all_active_clients',
      'team',
      'program',
      'membership',
      'selected_clients'
    )),
  audience_filter jsonb,
  priority text not null default 'normal'
    check (priority in ('normal', 'important')),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'expired')),
  publish_at timestamptz,
  expires_at timestamptz,
  link_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ma5_announcements_status_idx
  on public.ma5_announcements (status, publish_at desc nulls last);

drop trigger if exists ma5_announcements_set_updated_at on public.ma5_announcements;
create trigger ma5_announcements_set_updated_at
before update on public.ma5_announcements
for each row execute function public.ma5_set_updated_at();

-- Materialized recipients at publish time
create table if not exists public.ma5_announcement_recipients (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.ma5_announcements (id) on delete cascade,
  client_id uuid not null references public.ma5_profiles (id) on delete cascade,
  user_id uuid references public.ma5_profiles (id) on delete set null,
  delivered_at timestamptz,
  read_at timestamptz,
  email_sent_at timestamptz,
  push_sent_at timestamptz,
  unique (announcement_id, client_id)
);

create index if not exists ma5_announcement_recipients_client_idx
  on public.ma5_announcement_recipients (client_id, read_at);

create index if not exists ma5_announcement_recipients_announcement_idx
  on public.ma5_announcement_recipients (announcement_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.ma5_can_message_clients()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ma5_has_role(array['owner', 'admin', 'coach']);
$$;

create or replace function public.ma5_is_thread_client(target_thread_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ma5_message_threads t
    where t.id = target_thread_id
      and t.client_id = auth.uid()
  );
$$;

-- Keep last_message_at in sync
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

drop trigger if exists ma5_messages_touch_thread on public.ma5_messages;
create trigger ma5_messages_touch_thread
after insert on public.ma5_messages
for each row execute function public.ma5_touch_thread_on_message();

-- Expire published announcements past expires_at
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

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ma5_message_threads enable row level security;
alter table public.ma5_messages enable row level security;
alter table public.ma5_message_thread_reads enable row level security;
alter table public.ma5_announcements enable row level security;
alter table public.ma5_announcement_recipients enable row level security;

-- Threads: staff see all; clients see own
drop policy if exists ma5_message_threads_select on public.ma5_message_threads;
create policy ma5_message_threads_select
on public.ma5_message_threads
for select
to authenticated
using (client_id = auth.uid() or public.ma5_can_message_clients());

drop policy if exists ma5_message_threads_insert_staff on public.ma5_message_threads;
create policy ma5_message_threads_insert_staff
on public.ma5_message_threads
for insert
to authenticated
with check (public.ma5_can_message_clients());

drop policy if exists ma5_message_threads_update_staff on public.ma5_message_threads;
create policy ma5_message_threads_update_staff
on public.ma5_message_threads
for update
to authenticated
using (public.ma5_can_message_clients())
with check (public.ma5_can_message_clients());

-- Messages
drop policy if exists ma5_messages_select on public.ma5_messages;
create policy ma5_messages_select
on public.ma5_messages
for select
to authenticated
using (
  public.ma5_can_message_clients()
  or public.ma5_is_thread_client(thread_id)
);

drop policy if exists ma5_messages_insert on public.ma5_messages;
create policy ma5_messages_insert
on public.ma5_messages
for insert
to authenticated
with check (
  sender_user_id = auth.uid()
  and (
    public.ma5_can_message_clients()
    or (
      public.ma5_is_thread_client(thread_id)
      and sender_role = 'client'
    )
  )
);

-- Thread reads
drop policy if exists ma5_message_thread_reads_select on public.ma5_message_thread_reads;
create policy ma5_message_thread_reads_select
on public.ma5_message_thread_reads
for select
to authenticated
using (
  user_id = auth.uid()
  or public.ma5_can_message_clients()
);

drop policy if exists ma5_message_thread_reads_upsert on public.ma5_message_thread_reads;
create policy ma5_message_thread_reads_upsert
on public.ma5_message_thread_reads
for all
to authenticated
using (
  user_id = auth.uid()
  or public.ma5_can_message_clients()
)
with check (
  user_id = auth.uid()
  or public.ma5_can_message_clients()
);

-- Announcements: staff full access; clients only published where they are recipients
drop policy if exists ma5_announcements_select_staff on public.ma5_announcements;
create policy ma5_announcements_select_staff
on public.ma5_announcements
for select
to authenticated
using (
  public.ma5_can_message_clients()
  or (
    status in ('published', 'expired')
    and exists (
      select 1
      from public.ma5_announcement_recipients r
      where r.announcement_id = id
        and (r.client_id = auth.uid() or r.user_id = auth.uid())
    )
  )
);

drop policy if exists ma5_announcements_write_staff on public.ma5_announcements;
create policy ma5_announcements_write_staff
on public.ma5_announcements
for all
to authenticated
using (public.ma5_can_message_clients())
with check (public.ma5_can_message_clients());

-- Recipients
drop policy if exists ma5_announcement_recipients_select on public.ma5_announcement_recipients;
create policy ma5_announcement_recipients_select
on public.ma5_announcement_recipients
for select
to authenticated
using (
  client_id = auth.uid()
  or user_id = auth.uid()
  or public.ma5_can_message_clients()
);

drop policy if exists ma5_announcement_recipients_insert_staff on public.ma5_announcement_recipients;
create policy ma5_announcement_recipients_insert_staff
on public.ma5_announcement_recipients
for insert
to authenticated
with check (public.ma5_can_message_clients());

drop policy if exists ma5_announcement_recipients_update_own_or_staff on public.ma5_announcement_recipients;
create policy ma5_announcement_recipients_update_own_or_staff
on public.ma5_announcement_recipients
for update
to authenticated
using (
  client_id = auth.uid()
  or user_id = auth.uid()
  or public.ma5_can_message_clients()
)
with check (
  client_id = auth.uid()
  or user_id = auth.uid()
  or public.ma5_can_message_clients()
);

-- Notifications: allow staff bulk insert (publish flows); keep own select/update from 001
drop policy if exists ma5_notifications_insert_staff_or_self on public.ma5_notifications;
create policy ma5_notifications_insert_staff_or_self
on public.ma5_notifications
for insert
to authenticated
with check (user_id = auth.uid() or public.ma5_is_staff());

-- MA5 Performance platform foundation.
-- Creates ONLY ma5_* tables, functions, triggers, and policies.
-- Safe for a shared Supabase project alongside dawg_*, sw_*, etc.

create extension if not exists "pgcrypto";

create or replace function public.ma5_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles + multi-role assignment
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  active boolean not null default true,
  stripe_customer_id text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ma5_user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  role text not null
    check (role in ('owner', 'admin', 'staff', 'coach', 'client')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create index if not exists ma5_user_roles_user_idx
  on public.ma5_user_roles (user_id);

create index if not exists ma5_user_roles_role_idx
  on public.ma5_user_roles (role);

-- ---------------------------------------------------------------------------
-- In-app notifications (foundation)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  title text not null,
  body text not null,
  href text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ma5_notifications_user_idx
  on public.ma5_notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists ma5_profiles_set_updated_at on public.ma5_profiles;
create trigger ma5_profiles_set_updated_at
before update on public.ma5_profiles
for each row execute function public.ma5_set_updated_at();

-- ---------------------------------------------------------------------------
-- Auth hook: create profile + default client role on signup
-- ---------------------------------------------------------------------------

create or replace function public.ma5_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ma5_profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;

  insert into public.ma5_user_roles (user_id, role)
  values (new.id, 'client')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists ma5_on_auth_user_created on auth.users;
create trigger ma5_on_auth_user_created
after insert on auth.users
for each row execute function public.ma5_handle_new_user();

-- ---------------------------------------------------------------------------
-- Permission helpers (RLS)
-- ---------------------------------------------------------------------------

create or replace function public.ma5_has_role(target_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ma5_user_roles r
    where r.user_id = auth.uid()
      and r.role = any (target_roles)
  );
$$;

create or replace function public.ma5_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.ma5_has_role(array['owner', 'admin', 'staff', 'coach']);
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ma5_profiles enable row level security;
alter table public.ma5_user_roles enable row level security;
alter table public.ma5_notifications enable row level security;

drop policy if exists ma5_profiles_select_own_or_staff on public.ma5_profiles;
create policy ma5_profiles_select_own_or_staff
on public.ma5_profiles
for select
to authenticated
using (id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_profiles_update_own on public.ma5_profiles;
create policy ma5_profiles_update_own
on public.ma5_profiles
for update
to authenticated
using (id = auth.uid() or public.ma5_has_role(array['owner', 'admin']))
with check (id = auth.uid() or public.ma5_has_role(array['owner', 'admin']));

drop policy if exists ma5_user_roles_select_own_or_staff on public.ma5_user_roles;
create policy ma5_user_roles_select_own_or_staff
on public.ma5_user_roles
for select
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_user_roles_manage_owner_admin on public.ma5_user_roles;
create policy ma5_user_roles_manage_owner_admin
on public.ma5_user_roles
for all
to authenticated
using (public.ma5_has_role(array['owner', 'admin']))
with check (public.ma5_has_role(array['owner', 'admin']));

drop policy if exists ma5_notifications_select_own on public.ma5_notifications;
create policy ma5_notifications_select_own
on public.ma5_notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists ma5_notifications_update_own on public.ma5_notifications;
create policy ma5_notifications_update_own
on public.ma5_notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ma5_notifications_insert_staff on public.ma5_notifications;
create policy ma5_notifications_insert_staff
on public.ma5_notifications
for insert
to authenticated
with check (public.ma5_is_staff() or user_id = auth.uid());

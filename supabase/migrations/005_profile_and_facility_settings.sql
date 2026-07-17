-- Profile extras (emergency contact, notification prefs) + facility settings.
-- Additive only — no drops of existing data.

alter table public.ma5_profiles
  add column if not exists preferred_name text,
  add column if not exists emergency_name text,
  add column if not exists emergency_relationship text,
  add column if not exists emergency_phone text,
  add column if not exists emergency_notes text,
  add column if not exists notify_coach_messages boolean not null default true,
  add column if not exists notify_session_reminders boolean not null default true,
  add column if not exists notify_program_updates boolean not null default true,
  add column if not exists notify_billing_alerts boolean not null default true;

create table if not exists public.ma5_client_waivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  waiver_key text not null
    check (waiver_key in ('liability', 'facility_rules', 'media_release')),
  status text not null default 'pending'
    check (status in ('signed', 'pending', 'declined')),
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, waiver_key)
);

create index if not exists ma5_client_waivers_user_idx
  on public.ma5_client_waivers (user_id);

drop trigger if exists ma5_client_waivers_set_updated_at on public.ma5_client_waivers;
create trigger ma5_client_waivers_set_updated_at
before update on public.ma5_client_waivers
for each row execute function public.ma5_set_updated_at();

-- Singleton facility / gym settings (id fixed to 1)
create table if not exists public.ma5_facility_settings (
  id int primary key default 1 check (id = 1),
  gym_name text not null default 'MA5 Performance',
  legal_name text not null default 'MA5 Fitness LLC',
  address_line text not null default '8441 Kingston St, Avon, IN 46123',
  email text not null default 'ma.fitness99@gmail.com',
  open_gym_hours text not null default '24/7 key-fob access',
  coaching_hours text not null default 'By appointment',
  hours_summary text not null default '24/7 key-fob open-gym access for members; training by appointment',
  brand_primary text not null default '#E2062B',
  notify_failed_payments boolean not null default true,
  notify_new_signups boolean not null default true,
  notify_message_digest boolean not null default true,
  notify_capacity_warnings boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.ma5_facility_settings (id)
values (1)
on conflict (id) do nothing;

drop trigger if exists ma5_facility_settings_set_updated_at on public.ma5_facility_settings;
create trigger ma5_facility_settings_set_updated_at
before update on public.ma5_facility_settings
for each row execute function public.ma5_set_updated_at();

alter table public.ma5_client_waivers enable row level security;
alter table public.ma5_facility_settings enable row level security;

drop policy if exists ma5_client_waivers_select_own_or_staff on public.ma5_client_waivers;
create policy ma5_client_waivers_select_own_or_staff
on public.ma5_client_waivers
for select
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_client_waivers_upsert_own on public.ma5_client_waivers;
create policy ma5_client_waivers_upsert_own
on public.ma5_client_waivers
for all
to authenticated
using (user_id = auth.uid() or public.ma5_has_role(array['owner', 'admin']))
with check (user_id = auth.uid() or public.ma5_has_role(array['owner', 'admin']));

drop policy if exists ma5_facility_settings_select_staff on public.ma5_facility_settings;
create policy ma5_facility_settings_select_staff
on public.ma5_facility_settings
for select
to authenticated
using (public.ma5_is_staff());

drop policy if exists ma5_facility_settings_update_owner_admin on public.ma5_facility_settings;
create policy ma5_facility_settings_update_owner_admin
on public.ma5_facility_settings
for update
to authenticated
using (public.ma5_has_role(array['owner', 'admin']))
with check (public.ma5_has_role(array['owner', 'admin']));

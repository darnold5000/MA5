-- MA5 → Signal Works destination migration 025
-- Create ma5_locations and bootstrap default location for MA5 Performance.
--
-- Target: Signal Works shared Supabase only.
-- Prerequisite: 024_ma5_tenant_registration (slug ma5-performance).
-- Prerequisite: public.set_updated_at() from signalworks-platform/core.
-- Next: 026_ma5_tenant_scoped_schema.sql (ma5_sessions.location_id → ma5_locations).
--
-- RLS enabled with no policies here; tenant policies land in 029.
--
-- Applied 2026-07-23. Confirmed default location:
--   id: ac85a800-91cc-4ba5-a42c-9b55eac4653a  slug: main
--
-- Verify:
--   select id, slug, name, timezone from public.ma5_locations
--   where tenant_id = (select id from public.tenants where slug = 'ma5-performance')
--     and slug = 'main';

-- ---------------------------------------------------------------------------
-- Prerequisites
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'public.set_updated_at() is missing — apply signalworks-platform/core migrations first';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- ma5_locations (replaces hobby ma5_facility_settings singleton)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  slug text not null,
  name text not null,
  legal_name text,
  address_line text,
  email text,
  timezone text not null default 'America/Indiana/Indianapolis',
  open_gym_hours text,
  coaching_hours text,
  hours_summary text,
  brand_primary text not null default '#E2062B',
  logo_storage_path text,
  notify_failed_payments boolean not null default true,
  notify_new_signups boolean not null default true,
  notify_message_digest boolean not null default true,
  notify_capacity_warnings boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ma5_locations_tenant_slug_key unique (tenant_id, slug)
);

create index if not exists ma5_locations_tenant_idx
  on public.ma5_locations (tenant_id);

create index if not exists ma5_locations_tenant_active_idx
  on public.ma5_locations (tenant_id, is_active);

drop trigger if exists ma5_locations_set_updated_at on public.ma5_locations;
create trigger ma5_locations_set_updated_at
before update on public.ma5_locations
for each row execute function public.set_updated_at();

alter table public.ma5_locations enable row level security;

grant select, insert, update, delete on public.ma5_locations to authenticated;
grant all on public.ma5_locations to service_role;

-- ---------------------------------------------------------------------------
-- Bootstrap: default location (operator defaults — not imported from hobby DB)
-- ---------------------------------------------------------------------------

insert into public.ma5_locations (
  tenant_id,
  slug,
  name,
  legal_name,
  address_line,
  email,
  timezone,
  open_gym_hours,
  coaching_hours,
  hours_summary,
  brand_primary,
  is_active
)
select
  t.id,
  'main',
  'MA5 Performance',
  'MA5 Fitness LLC',
  '8441 Kingston St, Avon, IN 46123',
  'ma.fitness99@gmail.com',
  'America/Indiana/Indianapolis',
  '24/7 key-fob access',
  'By appointment',
  '24/7 key-fob open-gym access for members; training by appointment',
  '#E2062B',
  true
from public.tenants t
where t.slug = 'ma5-performance'
on conflict (tenant_id, slug) do update
set
  name = excluded.name,
  legal_name = excluded.legal_name,
  address_line = excluded.address_line,
  email = excluded.email,
  timezone = excluded.timezone,
  open_gym_hours = excluded.open_gym_hours,
  coaching_hours = excluded.coaching_hours,
  hours_summary = excluded.hours_summary,
  brand_primary = excluded.brand_primary,
  is_active = excluded.is_active,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Validation (fail if tenant or default location missing)
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from public.ma5_locations l
    join public.tenants t on t.id = l.tenant_id
    where t.slug = 'ma5-performance'
      and l.slug = 'main'
  ) then
    raise exception 'MA5 default location was not created';
  end if;
end
$$;

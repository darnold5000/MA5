-- MA5 Marketing Attribution (UTM / first-touch / leads → members).
-- Anonymous visitor_sessions until a form voluntarily identifies a lead.
-- Still single-facility / not multi-tenant (no facility_id).
-- Portable Signal Works pattern: swap ma5_ → sw_ (or tenant prefix) for other deploys.

-- ---------------------------------------------------------------------------
-- Visitor sessions (anonymous first-touch + optional last-touch)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_visitor_sessions (
  visitor_id uuid primary key,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  landing_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  -- Optional last-touch (updated when new campaign params appear)
  last_landing_page text,
  last_referrer text,
  last_utm_source text,
  last_utm_medium text,
  last_utm_campaign text,
  last_utm_term text,
  last_utm_content text,
  page_views integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ma5_visitor_sessions_first_seen_idx
  on public.ma5_visitor_sessions (first_seen desc);

create index if not exists ma5_visitor_sessions_utm_campaign_idx
  on public.ma5_visitor_sessions (utm_campaign)
  where utm_campaign is not null;

create index if not exists ma5_visitor_sessions_utm_source_idx
  on public.ma5_visitor_sessions (utm_source)
  where utm_source is not null;

drop trigger if exists ma5_visitor_sessions_set_updated_at on public.ma5_visitor_sessions;
create trigger ma5_visitor_sessions_set_updated_at
before update on public.ma5_visitor_sessions
for each row execute function public.ma5_set_updated_at();

alter table public.ma5_visitor_sessions enable row level security;

-- Staff may read for ops reporting; writes go through service role API
drop policy if exists ma5_visitor_sessions_select_staff on public.ma5_visitor_sessions;
create policy ma5_visitor_sessions_select_staff
on public.ma5_visitor_sessions
for select
to authenticated
using (public.ma5_is_staff());

-- ---------------------------------------------------------------------------
-- Leads (PII only after voluntary form submit)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_leads (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid references public.ma5_visitor_sessions (visitor_id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  message text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  landing_page text,
  referrer text,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'converted', 'closed')),
  converted_profile_id uuid references public.ma5_profiles (id) on delete set null,
  converted_at timestamptz,
  source_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ma5_leads_email_idx
  on public.ma5_leads (lower(email));

create index if not exists ma5_leads_status_idx
  on public.ma5_leads (status);

create index if not exists ma5_leads_created_at_idx
  on public.ma5_leads (created_at desc);

create index if not exists ma5_leads_utm_campaign_idx
  on public.ma5_leads (utm_campaign)
  where utm_campaign is not null;

create index if not exists ma5_leads_visitor_id_idx
  on public.ma5_leads (visitor_id)
  where visitor_id is not null;

drop trigger if exists ma5_leads_set_updated_at on public.ma5_leads;
create trigger ma5_leads_set_updated_at
before update on public.ma5_leads
for each row execute function public.ma5_set_updated_at();

alter table public.ma5_leads enable row level security;

drop policy if exists ma5_leads_select_staff on public.ma5_leads;
create policy ma5_leads_select_staff
on public.ma5_leads
for select
to authenticated
using (public.ma5_is_staff());

drop policy if exists ma5_leads_update_staff on public.ma5_leads;
create policy ma5_leads_update_staff
on public.ma5_leads
for update
to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

-- Members may read the lead linked to their own profile (attribution display)
drop policy if exists ma5_leads_select_own_converted on public.ma5_leads;
create policy ma5_leads_select_own_converted
on public.ma5_leads
for select
to authenticated
using (converted_profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Member (profile) acquisition fields — first-touch retained after conversion
-- ---------------------------------------------------------------------------

alter table public.ma5_profiles
  add column if not exists lead_id uuid references public.ma5_leads (id) on delete set null;

alter table public.ma5_profiles
  add column if not exists acquisition_source text;

alter table public.ma5_profiles
  add column if not exists acquisition_medium text;

alter table public.ma5_profiles
  add column if not exists acquisition_campaign text;

alter table public.ma5_profiles
  add column if not exists acquisition_term text;

alter table public.ma5_profiles
  add column if not exists acquisition_content text;

alter table public.ma5_profiles
  add column if not exists acquisition_landing_page text;

alter table public.ma5_profiles
  add column if not exists acquisition_referrer text;

alter table public.ma5_profiles
  add column if not exists acquisition_first_seen_at timestamptz;

create index if not exists ma5_profiles_lead_id_idx
  on public.ma5_profiles (lead_id)
  where lead_id is not null;

create index if not exists ma5_profiles_acquisition_campaign_idx
  on public.ma5_profiles (acquisition_campaign)
  where acquisition_campaign is not null;

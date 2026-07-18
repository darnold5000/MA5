-- Marketing attribution hardening:
-- - DB first-touch immutability (visitor sessions + profile acquisition + lead UTMs)
-- - Bot flag on visitor sessions
-- - Lead invited_at for funnel reporting
-- - Retention purge for unlinked anonymous sessions (90 days)
-- - Staff delete policies for privacy cleanup (service role still used by APIs)

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

alter table public.ma5_visitor_sessions
  add column if not exists is_bot boolean not null default false;

alter table public.ma5_visitor_sessions
  add column if not exists user_agent text;

create index if not exists ma5_visitor_sessions_is_bot_idx
  on public.ma5_visitor_sessions (is_bot)
  where is_bot = false;

alter table public.ma5_leads
  add column if not exists invited_at timestamptz;

-- ---------------------------------------------------------------------------
-- First-touch protection triggers
-- ---------------------------------------------------------------------------

create or replace function public.ma5_protect_visitor_first_touch()
returns trigger
language plpgsql
as $$
begin
  -- Once populated, first-touch fields are immutable. Last-touch remains free.
  if old.landing_page is not null then
    new.landing_page := old.landing_page;
  end if;
  if old.referrer is not null then
    new.referrer := old.referrer;
  end if;
  if old.utm_source is not null then
    new.utm_source := old.utm_source;
  end if;
  if old.utm_medium is not null then
    new.utm_medium := old.utm_medium;
  end if;
  if old.utm_campaign is not null then
    new.utm_campaign := old.utm_campaign;
  end if;
  if old.utm_term is not null then
    new.utm_term := old.utm_term;
  end if;
  if old.utm_content is not null then
    new.utm_content := old.utm_content;
  end if;
  if old.first_seen is not null then
    new.first_seen := old.first_seen;
  end if;
  return new;
end;
$$;

drop trigger if exists ma5_visitor_sessions_protect_first_touch
  on public.ma5_visitor_sessions;
create trigger ma5_visitor_sessions_protect_first_touch
before update on public.ma5_visitor_sessions
for each row execute function public.ma5_protect_visitor_first_touch();

create or replace function public.ma5_protect_lead_first_touch()
returns trigger
language plpgsql
as $$
begin
  if old.landing_page is not null then
    new.landing_page := old.landing_page;
  end if;
  if old.referrer is not null then
    new.referrer := old.referrer;
  end if;
  if old.utm_source is not null then
    new.utm_source := old.utm_source;
  end if;
  if old.utm_medium is not null then
    new.utm_medium := old.utm_medium;
  end if;
  if old.utm_campaign is not null then
    new.utm_campaign := old.utm_campaign;
  end if;
  if old.utm_term is not null then
    new.utm_term := old.utm_term;
  end if;
  if old.utm_content is not null then
    new.utm_content := old.utm_content;
  end if;
  if old.created_at is not null then
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

drop trigger if exists ma5_leads_protect_first_touch on public.ma5_leads;
create trigger ma5_leads_protect_first_touch
before update on public.ma5_leads
for each row execute function public.ma5_protect_lead_first_touch();

create or replace function public.ma5_protect_profile_acquisition()
returns trigger
language plpgsql
as $$
begin
  if old.acquisition_source is not null then
    new.acquisition_source := old.acquisition_source;
  end if;
  if old.acquisition_medium is not null then
    new.acquisition_medium := old.acquisition_medium;
  end if;
  if old.acquisition_campaign is not null then
    new.acquisition_campaign := old.acquisition_campaign;
  end if;
  if old.acquisition_term is not null then
    new.acquisition_term := old.acquisition_term;
  end if;
  if old.acquisition_content is not null then
    new.acquisition_content := old.acquisition_content;
  end if;
  if old.acquisition_landing_page is not null then
    new.acquisition_landing_page := old.acquisition_landing_page;
  end if;
  if old.acquisition_referrer is not null then
    new.acquisition_referrer := old.acquisition_referrer;
  end if;
  if old.acquisition_first_seen_at is not null then
    new.acquisition_first_seen_at := old.acquisition_first_seen_at;
  end if;
  -- lead_id: allow SET NULL (privacy delete / FK), but do not swap to a different lead
  if old.lead_id is not null
     and new.lead_id is not null
     and new.lead_id is distinct from old.lead_id then
    new.lead_id := old.lead_id;
  end if;
  return new;
end;
$$;

drop trigger if exists ma5_profiles_protect_acquisition on public.ma5_profiles;
create trigger ma5_profiles_protect_acquisition
before update on public.ma5_profiles
for each row execute function public.ma5_protect_profile_acquisition();

-- ---------------------------------------------------------------------------
-- Retention: purge anonymous sessions older than 90 days with no lead link.
-- Attribution already copied onto leads/members is untouched.
-- ---------------------------------------------------------------------------

create or replace function public.ma5_purge_expired_anonymous_visitors(
  retention_days integer default 90
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.ma5_visitor_sessions v
  where v.last_seen < (now() - make_interval(days => retention_days))
    and not exists (
      select 1
      from public.ma5_leads l
      where l.visitor_id = v.visitor_id
    );

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.ma5_purge_expired_anonymous_visitors(integer) from public;
grant execute on function public.ma5_purge_expired_anonymous_visitors(integer) to service_role;

-- ---------------------------------------------------------------------------
-- Staff delete policies (privacy cleanup via authenticated staff or service role)
-- ---------------------------------------------------------------------------

drop policy if exists ma5_visitor_sessions_delete_staff on public.ma5_visitor_sessions;
create policy ma5_visitor_sessions_delete_staff
on public.ma5_visitor_sessions
for delete
to authenticated
using (public.ma5_is_staff());

drop policy if exists ma5_leads_delete_staff on public.ma5_leads;
create policy ma5_leads_delete_staff
on public.ma5_leads
for delete
to authenticated
using (public.ma5_is_staff());

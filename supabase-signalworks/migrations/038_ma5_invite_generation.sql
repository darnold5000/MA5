-- MA5 → Signal Works migration 038
-- Invite generation counter for invalidating superseded invitation links.
--
-- Prerequisite: 037_ma5_client_lifecycle.sql
--
-- Verify:
--   select invite_generation, count(*) from public.ma5_profiles group by 1;

begin;

alter table public.ma5_profiles
  add column if not exists invite_generation integer not null default 1;

alter table public.ma5_profiles disable trigger ma5_profiles_guard_client_columns;

update public.ma5_profiles
set invite_generation = 1
where invite_generation is null or invite_generation < 1;

alter table public.ma5_profiles enable trigger ma5_profiles_guard_client_columns;

alter table public.ma5_profiles
  drop constraint if exists ma5_profiles_invite_generation_check;

alter table public.ma5_profiles
  add constraint ma5_profiles_invite_generation_check
  check (invite_generation >= 1);

create index if not exists ma5_profiles_invite_generation_idx
  on public.ma5_profiles (tenant_id, invite_generation);

commit;

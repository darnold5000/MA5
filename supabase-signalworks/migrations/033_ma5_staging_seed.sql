-- MA5 → Signal Works destination migration 033
-- STAGING ONLY — disposable test fixtures for acceptance tests.
--
-- **Do not apply on production.**
--
-- Target: Signal Works shared Supabase (staging branch / staging project).
-- Prerequisites: 024–034, 031 applied.
--
-- Seeds:
--   Tenant A (ma5-performance): class type, 2 published sessions, product, lead
--   Tenant B (ma5-staging-isolation): tenant + location + synthetic member auth user
--
-- D-14 exception: creates ONE synthetic auth.users row for Tenant B cross-tenant tests
-- (AT-001). Not copied from hobby DB. Password documented below.
--
-- Fixed UUIDs (for AT plan references):
--   Tenant B member user/profile: 03300000-0000-4000-a000-000000000101
--   MA5 session (bookable):       03300000-0000-4000-a000-000000001101
--   MA5 session (second):         03300000-0000-4000-a000-000000001102
--   MA5 product:                  03300000-0000-4000-a000-000000001201
--   MA5 lead:                     03300000-0000-4000-a000-000000001301
--   Tenant B session:             03300000-0000-4000-a000-000000000202
--
-- Tenant B test login (staging only):
--   Email:    staging-b-member@ma5-test.invalid
--   Password: Ma5StagingB-033!
--
-- Verify after apply:
--   select slug from public.tenants where slug = 'ma5-staging-isolation';
--   select count(*) from public.ma5_sessions s
--   join public.tenants t on t.id = s.tenant_id
--   where t.slug = 'ma5-performance' and s.status = 'published';
--   -- expect >= 2

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Prerequisites
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from public.tenants where slug = 'ma5-performance'
  ) then
    raise exception 'ma5-performance tenant missing — apply 024 first';
  end if;

  if not exists (
    select 1
    from public.ma5_locations l
    join public.tenants t on t.id = l.tenant_id
    where t.slug = 'ma5-performance'
      and l.slug = 'main'
  ) then
    raise exception 'MA5 default location missing — apply 025 first';
  end if;

  if to_regprocedure('public.ma5_is_tenant_member(uuid)') is null then
    raise exception 'RLS helpers missing — apply 028 first';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Tenant B — synthetic isolation gym (cross-tenant tests)
-- ---------------------------------------------------------------------------

insert into public.tenants (
  id,
  slug,
  display_name,
  status,
  platform_category
)
values (
  '03300000-0000-4000-a000-000000000001',
  'ma5-staging-isolation',
  'MA5 Staging Isolation Gym',
  'active',
  'services'
)
on conflict (slug) do update
set
  display_name = excluded.display_name,
  status = excluded.status,
  platform_category = excluded.platform_category,
  updated_at = now();

insert into public.ma5_locations (
  id,
  tenant_id,
  slug,
  name,
  timezone,
  is_active
)
select
  '03300000-0000-4000-a000-000000000002',
  t.id,
  'main',
  'Staging Isolation Gym',
  'America/Indiana/Indianapolis',
  true
from public.tenants t
where t.slug = 'ma5-staging-isolation'
on conflict (tenant_id, slug) do update
set
  name = excluded.name,
  timezone = excluded.timezone,
  is_active = excluded.is_active,
  updated_at = now();

-- Synthetic Tenant B member (auth + profile + client role)
do $$
declare
  v_tenant_b uuid;
  v_user_id uuid := '03300000-0000-4000-a000-000000000101';
  v_email text := 'staging-b-member@ma5-test.invalid';
  v_password text := 'Ma5StagingB-033!';
  v_encrypted_pw text;
begin
  select id into v_tenant_b
  from public.tenants
  where slug = 'ma5-staging-isolation';

  if v_tenant_b is null then
    raise exception 'Tenant B was not created';
  end if;

  v_encrypted_pw := crypt(v_password, gen_salt('bf'));

  if not exists (select 1 from auth.users where id = v_user_id) then
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Staging B Member"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set
      email = v_email,
      encrypted_password = v_encrypted_pw,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      updated_at = now()
    where id = v_user_id;
  end if;

  if not exists (
    select 1 from auth.identities
    where user_id = v_user_id
      and provider = 'email'
  ) then
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  end if;

  insert into public.ma5_profiles (
    id,
    tenant_id,
    email,
    full_name,
    preferred_name,
    active,
    invitation_status,
    invitation_accepted_at
  ) values (
    v_user_id,
    v_tenant_b,
    v_email,
    'Staging B Member',
    'Staging B',
    true,
    'accepted',
    now()
  )
  on conflict (id) do update
  set
    tenant_id = excluded.tenant_id,
    email = excluded.email,
    full_name = excluded.full_name,
    preferred_name = excluded.preferred_name,
    active = excluded.active,
    invitation_status = excluded.invitation_status,
    invitation_accepted_at = coalesce(public.ma5_profiles.invitation_accepted_at, excluded.invitation_accepted_at),
    updated_at = now();

  insert into public.ma5_user_roles (
    tenant_id,
    user_id,
    role
  ) values (
    v_tenant_b,
    v_user_id,
    'client'
  )
  on conflict (tenant_id, user_id, role) do nothing;
end
$$;

-- ---------------------------------------------------------------------------
-- Tenant A (MA5 Performance) — catalog + scheduling + marketing fixtures
-- ---------------------------------------------------------------------------

insert into public.ma5_class_types (
  id,
  tenant_id,
  slug,
  name,
  description,
  default_duration_minutes,
  default_capacity,
  default_price_cents,
  active,
  display_order
)
select
  '03300000-0000-4000-a000-000000001001',
  t.id,
  'open-gym',
  'Open Gym',
  'Staging seed — self-directed training block',
  60,
  20,
  0,
  true,
  1
from public.tenants t
where t.slug = 'ma5-performance'
on conflict (id) do update
set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  default_duration_minutes = excluded.default_duration_minutes,
  default_capacity = excluded.default_capacity,
  default_price_cents = excluded.default_price_cents,
  active = excluded.active,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.ma5_sessions (
  id,
  tenant_id,
  location_id,
  class_type_id,
  title,
  description,
  starts_at,
  ends_at,
  timezone,
  capacity,
  price_cents,
  status,
  coach_name
)
select
  '03300000-0000-4000-a000-000000001101',
  t.id,
  l.id,
  ct.id,
  'Staging Open Gym — Morning',
  'Acceptance test session AT-032 / AT-033',
  date_trunc('day', now() at time zone 'America/Indiana/Indianapolis')
    + interval '1 day' + interval '9 hours',
  date_trunc('day', now() at time zone 'America/Indiana/Indianapolis')
    + interval '1 day' + interval '10 hours',
  'America/Indiana/Indianapolis',
  20,
  0,
  'published',
  'MA5 Coach'
from public.tenants t
join public.ma5_locations l
  on l.tenant_id = t.id
 and l.slug = 'main'
join public.ma5_class_types ct
  on ct.tenant_id = t.id
 and ct.id = '03300000-0000-4000-a000-000000001001'
where t.slug = 'ma5-performance'
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  timezone = excluded.timezone,
  capacity = excluded.capacity,
  price_cents = excluded.price_cents,
  status = excluded.status,
  coach_name = excluded.coach_name,
  updated_at = now();

insert into public.ma5_sessions (
  id,
  tenant_id,
  location_id,
  class_type_id,
  title,
  description,
  starts_at,
  ends_at,
  timezone,
  capacity,
  price_cents,
  status,
  coach_name
)
select
  '03300000-0000-4000-a000-000000001102',
  t.id,
  l.id,
  ct.id,
  'Staging Small Group — Evening',
  'Second staging session for capacity / listing tests',
  date_trunc('day', now() at time zone 'America/Indiana/Indianapolis')
    + interval '2 days' + interval '18 hours',
  date_trunc('day', now() at time zone 'America/Indiana/Indianapolis')
    + interval '2 days' + interval '19 hours',
  'America/Indiana/Indianapolis',
  8,
  2500,
  'published',
  'MA5 Coach'
from public.tenants t
join public.ma5_locations l
  on l.tenant_id = t.id
 and l.slug = 'main'
join public.ma5_class_types ct
  on ct.tenant_id = t.id
 and ct.id = '03300000-0000-4000-a000-000000001001'
where t.slug = 'ma5-performance'
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  timezone = excluded.timezone,
  capacity = excluded.capacity,
  price_cents = excluded.price_cents,
  status = excluded.status,
  coach_name = excluded.coach_name,
  updated_at = now();

insert into public.ma5_products (
  id,
  tenant_id,
  slug,
  name,
  description,
  product_type,
  category,
  payment_type,
  status,
  price_cents,
  currency,
  billing_interval,
  display_order
)
select
  '03300000-0000-4000-a000-000000001201',
  t.id,
  'staging-test-membership',
  'Staging Test Membership',
  'Seed product for billing UI tests. Sync Stripe Price in Admin → Offerings before AT-050.',
  'membership',
  'membership',
  'subscription',
  'active',
  9900,
  'usd',
  'month',
  1
from public.tenants t
where t.slug = 'ma5-performance'
on conflict (id) do update
set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  product_type = excluded.product_type,
  category = excluded.category,
  payment_type = excluded.payment_type,
  status = excluded.status,
  price_cents = excluded.price_cents,
  currency = excluded.currency,
  billing_interval = excluded.billing_interval,
  display_order = excluded.display_order,
  updated_at = now();

insert into public.ma5_leads (
  id,
  tenant_id,
  name,
  email,
  phone,
  message,
  utm_source,
  utm_medium,
  utm_campaign,
  landing_page,
  status,
  source_path
)
select
  '03300000-0000-4000-a000-000000001301',
  t.id,
  'Staging Lead',
  'staging-lead@ma5-test.invalid',
  '317-555-0133',
  'Interested in open gym membership (staging seed 033).',
  'staging',
  'seed',
  '033-bootstrap',
  '/contact',
  'new',
  '/contact'
from public.tenants t
where t.slug = 'ma5-performance'
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  phone = excluded.phone,
  message = excluded.message,
  utm_source = excluded.utm_source,
  utm_medium = excluded.utm_medium,
  utm_campaign = excluded.utm_campaign,
  landing_page = excluded.landing_page,
  status = excluded.status,
  source_path = excluded.source_path,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Tenant B — scheduling fixture (visible only to Tenant B members)
-- ---------------------------------------------------------------------------

insert into public.ma5_class_types (
  id,
  tenant_id,
  slug,
  name,
  description,
  default_duration_minutes,
  default_capacity,
  default_price_cents,
  active,
  display_order
)
select
  '03300000-0000-4000-a000-000000000201',
  t.id,
  'isolation-class',
  'Isolation Class',
  'Tenant B only — must not appear for MA5 members',
  45,
  10,
  0,
  true,
  1
from public.tenants t
where t.slug = 'ma5-staging-isolation'
on conflict (id) do update
set
  slug = excluded.slug,
  name = excluded.name,
  description = excluded.description,
  active = excluded.active,
  updated_at = now();

insert into public.ma5_sessions (
  id,
  tenant_id,
  location_id,
  class_type_id,
  title,
  description,
  starts_at,
  ends_at,
  timezone,
  capacity,
  price_cents,
  status,
  coach_name
)
select
  '03300000-0000-4000-a000-000000000202',
  t.id,
  l.id,
  ct.id,
  'Tenant B Isolation Session',
  'Cross-tenant test fixture — AT-001',
  date_trunc('day', now() at time zone 'America/Indiana/Indianapolis')
    + interval '3 days' + interval '12 hours',
  date_trunc('day', now() at time zone 'America/Indiana/Indianapolis')
    + interval '3 days' + interval '13 hours',
  'America/Indiana/Indianapolis',
  10,
  0,
  'published',
  'Isolation Coach'
from public.tenants t
join public.ma5_locations l
  on l.tenant_id = t.id
 and l.slug = 'main'
join public.ma5_class_types ct
  on ct.tenant_id = t.id
 and ct.id = '03300000-0000-4000-a000-000000000201'
where t.slug = 'ma5-staging-isolation'
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  starts_at = excluded.starts_at,
  ends_at = excluded.ends_at,
  status = excluded.status,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Post-apply validation
-- ---------------------------------------------------------------------------

do $$
declare
  ma5_session_count int;
  tenant_b_profile_count int;
begin
  if not exists (
    select 1 from public.tenants where slug = 'ma5-staging-isolation'
  ) then
    raise exception 'Tenant B missing after seed';
  end if;

  select count(*)
  into ma5_session_count
  from public.ma5_sessions s
  join public.tenants t on t.id = s.tenant_id
  where t.slug = 'ma5-performance'
    and s.status = 'published';

  if ma5_session_count < 2 then
    raise exception 'Expected at least 2 published MA5 sessions, got %', ma5_session_count;
  end if;

  select count(*)
  into tenant_b_profile_count
  from public.ma5_profiles p
  join public.tenants t on t.id = p.tenant_id
  where t.slug = 'ma5-staging-isolation';

  if tenant_b_profile_count < 1 then
    raise exception 'Expected Tenant B profile after seed';
  end if;
end
$$;

commit;

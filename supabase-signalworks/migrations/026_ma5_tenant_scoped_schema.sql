-- MA5 → Signal Works destination migration 026 (v4)
-- Full tenant-scoped ma5_* schema (consolidates hobby 001–023 shape + tenant/location model).
--
-- Target: Signal Works shared Supabase only.
-- Prerequisites:
--   024_ma5_tenant_registration (slug ma5-performance)
--   025_ma5_locations_bootstrap (ma5_locations, slug main)
--   public.set_updated_at() from signalworks-platform/core
--
-- Excludes: ma5_facility_settings, ma5_stripe_webhook_events (027), auth.users trigger (030),
--           RLS policies (028–029), storage buckets/policies (032), seed data (033).
--
-- D-10/D-11: direct tenant_id on ma5_messages, ma5_workout_set_logs.
-- D-16: facility_settings never created — use ma5_locations (025).
-- D-24: ma5_profiles.id = auth.users.id; one MA5 profile row per auth user (PK on id).
--
-- v2: greenfield guard, composite same-tenant FKs, tenant-scoped Stripe uniques,
--      unique(tenant_id, id) on tenant-owned tables, inherit-only same-tenant triggers.
-- v3: composite ON DELETE SET NULL names nullable FK columns only; begin before extension;
--      purge retention_days guard; products_sync_active INSERT-safe.
-- v4: PG14+ compatible — composite optional FKs use ON DELETE RESTRICT + parent
--      BEFORE DELETE triggers to null only the reference column (not tenant_id).
--
-- Verify after apply:
--   select count(*) from information_schema.tables
--   where table_schema = 'public' and table_name like 'ma5_%';
--   -- expect 40 (includes ma5_locations from 025)

begin;

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Prerequisites
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regprocedure('public.set_updated_at()') is null then
    raise exception 'public.set_updated_at() is missing — apply signalworks-platform/core migrations first';
  end if;

  if not exists (select 1 from public.tenants where slug = 'ma5-performance') then
    raise exception 'tenant ma5-performance is missing — apply 024 first';
  end if;

  if not exists (
    select 1
    from public.ma5_locations l
    join public.tenants t on t.id = l.tenant_id
    where t.slug = 'ma5-performance'
      and l.slug = 'main'
  ) then
    raise exception 'default ma5_locations row (main) is missing — apply 025 first';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Greenfield guard — fail if any table in this migration already exists
-- ---------------------------------------------------------------------------

do $$
declare
  existing text;
  tables_to_create text[] := array[
    'ma5_profiles',
    'ma5_user_roles',
    'ma5_notifications',
    'ma5_class_types',
    'ma5_products',
    'ma5_prices',
    'ma5_sessions',
    'ma5_bookings',
    'ma5_memberships',
    'ma5_checkout_sessions',
    'ma5_payments',
    'ma5_subscriptions',
    'ma5_invoices',
    'ma5_refunds',
    'ma5_exercises',
    'ma5_workouts',
    'ma5_workout_blocks',
    'ma5_workout_block_sets',
    'ma5_programs',
    'ma5_program_days',
    'ma5_teams',
    'ma5_team_members',
    'ma5_program_assignments',
    'ma5_calendar_entries',
    'ma5_workout_completions',
    'ma5_workout_set_logs',
    'ma5_client_waivers',
    'ma5_message_threads',
    'ma5_messages',
    'ma5_message_thread_reads',
    'ma5_announcements',
    'ma5_announcement_recipients',
    'ma5_push_subscriptions',
    'ma5_visitor_sessions',
    'ma5_leads',
    'ma5_member_goals',
    'ma5_progress_photos',
    'ma5_marketing_gallery',
    'ma5_community_posts'
  ];
begin
  select string_agg(t.table_name, ', ' order by t.table_name)
  into existing
  from information_schema.tables t
  where t.table_schema = 'public'
    and t.table_name = any (tables_to_create);

  if existing is not null then
    raise exception 'greenfield guard: table(s) already exist: %', existing;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- ma5_locations (025) — add composite id unique for same-tenant FK targets
-- ---------------------------------------------------------------------------

alter table public.ma5_locations
  add constraint ma5_locations_tenant_id_key unique (tenant_id, id);

-- ---------------------------------------------------------------------------
-- Domain triggers (not RLS helpers — those land in 028)
-- ---------------------------------------------------------------------------

create or replace function public.ma5_products_sync_active()
returns trigger
language plpgsql
as $$
begin
  new.active := (new.status = 'active');

  if new.status = 'archived' then
    if tg_op = 'INSERT'
      or (tg_op = 'UPDATE' and old.status is distinct from 'archived')
    then
      new.archived_at := coalesce(new.archived_at, now());
    end if;
  else
    new.archived_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.ma5_protect_visitor_first_touch()
returns trigger
language plpgsql
as $$
begin
  if old.landing_page is not null then new.landing_page := old.landing_page; end if;
  if old.referrer is not null then new.referrer := old.referrer; end if;
  if old.utm_source is not null then new.utm_source := old.utm_source; end if;
  if old.utm_medium is not null then new.utm_medium := old.utm_medium; end if;
  if old.utm_campaign is not null then new.utm_campaign := old.utm_campaign; end if;
  if old.utm_term is not null then new.utm_term := old.utm_term; end if;
  if old.utm_content is not null then new.utm_content := old.utm_content; end if;
  if old.first_seen is not null then new.first_seen := old.first_seen; end if;
  return new;
end;
$$;

create or replace function public.ma5_protect_lead_first_touch()
returns trigger
language plpgsql
as $$
begin
  if old.landing_page is not null then new.landing_page := old.landing_page; end if;
  if old.referrer is not null then new.referrer := old.referrer; end if;
  if old.utm_source is not null then new.utm_source := old.utm_source; end if;
  if old.utm_medium is not null then new.utm_medium := old.utm_medium; end if;
  if old.utm_campaign is not null then new.utm_campaign := old.utm_campaign; end if;
  if old.utm_term is not null then new.utm_term := old.utm_term; end if;
  if old.utm_content is not null then new.utm_content := old.utm_content; end if;
  if old.created_at is not null then new.created_at := old.created_at; end if;
  return new;
end;
$$;

create or replace function public.ma5_protect_profile_acquisition()
returns trigger
language plpgsql
as $$
begin
  if old.acquisition_source is not null then new.acquisition_source := old.acquisition_source; end if;
  if old.acquisition_medium is not null then new.acquisition_medium := old.acquisition_medium; end if;
  if old.acquisition_campaign is not null then new.acquisition_campaign := old.acquisition_campaign; end if;
  if old.acquisition_term is not null then new.acquisition_term := old.acquisition_term; end if;
  if old.acquisition_content is not null then new.acquisition_content := old.acquisition_content; end if;
  if old.acquisition_landing_page is not null then new.acquisition_landing_page := old.acquisition_landing_page; end if;
  if old.acquisition_referrer is not null then new.acquisition_referrer := old.acquisition_referrer; end if;
  if old.acquisition_first_seen_at is not null then new.acquisition_first_seen_at := old.acquisition_first_seen_at; end if;
  if old.lead_id is not null
     and new.lead_id is not null
     and new.lead_id is distinct from old.lead_id then
    new.lead_id := old.lead_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profiles + roles
-- ---------------------------------------------------------------------------

create table public.ma5_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  email text not null,
  full_name text,
  preferred_name text,
  phone text,
  avatar_url text,
  active boolean not null default true,
  stripe_customer_id text,
  emergency_name text,
  emergency_relationship text,
  emergency_phone text,
  emergency_notes text,
  notify_coach_messages boolean not null default true,
  notify_session_reminders boolean not null default true,
  notify_program_updates boolean not null default true,
  notify_billing_alerts boolean not null default true,
  invitation_status text not null default 'none'
    check (invitation_status in (
      'none', 'pending', 'sent', 'accepted', 'expired', 'revoked', 'failed'
    )),
  invited_at timestamptz,
  invitation_accepted_at timestamptz,
  last_login_at timestamptz,
  access_revoked_at timestamptz,
  admin_notes text,
  lead_id uuid,
  acquisition_source text,
  acquisition_medium text,
  acquisition_campaign text,
  acquisition_term text,
  acquisition_content text,
  acquisition_landing_page text,
  acquisition_referrer text,
  acquisition_first_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create index ma5_profiles_tenant_idx
  on public.ma5_profiles (tenant_id);

create index ma5_profiles_invitation_status_idx
  on public.ma5_profiles (tenant_id, invitation_status);

create index ma5_profiles_email_lower_idx
  on public.ma5_profiles (tenant_id, lower(email));

create unique index ma5_profiles_tenant_stripe_customer_uidx
  on public.ma5_profiles (tenant_id, stripe_customer_id)
  where stripe_customer_id is not null;

create table public.ma5_user_roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null,
  role text not null
    check (role in ('owner', 'admin', 'staff', 'coach', 'client')),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, user_id, role),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete cascade
);

create index ma5_user_roles_tenant_idx
  on public.ma5_user_roles (tenant_id);

create index ma5_user_roles_user_idx
  on public.ma5_user_roles (user_id);

create index ma5_user_roles_role_idx
  on public.ma5_user_roles (tenant_id, role);

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------

create table public.ma5_notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null,
  title text not null,
  body text not null,
  href text,
  type text not null default 'system'
    check (type in (
      'direct_message',
      'announcement',
      'program_update',
      'booking_reminder',
      'billing',
      'system'
    )),
  entity_type text,
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete cascade
);

create index ma5_notifications_tenant_idx
  on public.ma5_notifications (tenant_id);

create index ma5_notifications_user_idx
  on public.ma5_notifications (tenant_id, user_id, created_at desc);

create index ma5_notifications_user_unread_idx
  on public.ma5_notifications (tenant_id, user_id, created_at desc)
  where read_at is null;

create index ma5_notifications_type_idx
  on public.ma5_notifications (tenant_id, type);

-- ---------------------------------------------------------------------------
-- Catalog + scheduling
-- ---------------------------------------------------------------------------

create table public.ma5_class_types (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  slug text not null,
  name text not null,
  description text,
  default_duration_minutes int not null default 60 check (default_duration_minutes > 0),
  default_capacity int not null default 10 check (default_capacity > 0),
  default_price_cents int not null default 0 check (default_price_cents >= 0),
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, slug)
);

create index ma5_class_types_tenant_idx
  on public.ma5_class_types (tenant_id);

create table public.ma5_products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  slug text not null,
  name text not null,
  description text,
  product_type text not null
    check (product_type in ('membership', 'package', 'drop_in', 'addon')),
  category text,
  payment_type text not null default 'subscription'
    check (payment_type in ('one_time', 'subscription')),
  status text not null default 'draft'
    check (status in ('draft', 'active', 'inactive', 'archived')),
  price_cents int not null check (price_cents >= 0),
  currency text not null default 'usd',
  billing_interval text
    check (billing_interval is null or billing_interval in ('month', 'one_time')),
  session_credits int,
  stripe_product_id text,
  current_stripe_price_id text,
  active boolean not null default true,
  archived_at timestamptz,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, slug),
  constraint ma5_products_payment_billing_chk check (
    (payment_type = 'subscription' and billing_interval = 'month')
    or (payment_type = 'one_time' and (billing_interval is null or billing_interval = 'one_time'))
  )
);

create index ma5_products_tenant_idx
  on public.ma5_products (tenant_id);

comment on column public.ma5_products.archived_at is
  'Set when status becomes archived. Cleared when reactivated. Row is never deleted.';

create table public.ma5_prices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  product_id uuid not null,
  stripe_price_id text,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'usd',
  billing_interval text
    check (billing_interval is null or billing_interval in ('month', 'one_time')),
  active boolean not null default true,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, product_id) references public.ma5_products (tenant_id, id) on delete cascade
);

create index ma5_prices_tenant_idx
  on public.ma5_prices (tenant_id);

create index ma5_prices_product_idx
  on public.ma5_prices (product_id, effective_at desc);

create table public.ma5_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  location_id uuid not null,
  class_type_id uuid,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Indiana/Indianapolis',
  capacity int not null check (capacity > 0),
  price_cents int not null default 0 check (price_cents >= 0),
  status text not null default 'published'
    check (status in ('draft', 'published', 'full', 'cancelled', 'completed')),
  coach_name text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  constraint ma5_sessions_ends_after_starts_chk check (ends_at > starts_at),
  foreign key (tenant_id, location_id) references public.ma5_locations (tenant_id, id) on delete restrict,
  foreign key (tenant_id, class_type_id) references public.ma5_class_types (tenant_id, id) on delete restrict
);

create index ma5_sessions_tenant_idx
  on public.ma5_sessions (tenant_id);

create index ma5_sessions_location_idx
  on public.ma5_sessions (tenant_id, location_id);

create index ma5_sessions_starts_idx
  on public.ma5_sessions (tenant_id, starts_at);

create index ma5_sessions_public_idx
  on public.ma5_sessions (tenant_id, status, starts_at)
  where status = 'published';

create table public.ma5_bookings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  session_id uuid not null,
  user_id uuid not null,
  confirmation_number text not null,
  status text not null default 'confirmed'
    check (status in (
      'pending', 'confirmed', 'cancelled', 'waitlisted',
      'attended', 'no_show', 'refunded'
    )),
  payment_status text not null default 'not_required'
    check (payment_status in (
      'not_required', 'pending', 'paid', 'refunded', 'pay_at_facility'
    )),
  amount_cents int not null default 0 check (amount_cents >= 0),
  stripe_checkout_session_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (session_id, user_id),
  unique (tenant_id, confirmation_number),
  constraint ma5_bookings_session_fkey
    foreign key (tenant_id, session_id) references public.ma5_sessions (tenant_id, id) on delete cascade,
  constraint ma5_bookings_user_fkey
    foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete cascade
);

create index ma5_bookings_tenant_idx
  on public.ma5_bookings (tenant_id);

create index ma5_bookings_user_idx
  on public.ma5_bookings (tenant_id, user_id, created_at desc);

create index ma5_bookings_session_idx
  on public.ma5_bookings (session_id);

create table public.ma5_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null,
  product_id uuid not null,
  status text not null default 'inactive'
    check (status in (
      'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'inactive'
    )),
  stripe_subscription_id text,
  stripe_price_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete cascade,
  foreign key (tenant_id, product_id) references public.ma5_products (tenant_id, id) on delete restrict
);

create unique index ma5_memberships_tenant_stripe_subscription_uidx
  on public.ma5_memberships (tenant_id, stripe_subscription_id)
  where stripe_subscription_id is not null;

create index ma5_memberships_tenant_idx
  on public.ma5_memberships (tenant_id);

create index ma5_memberships_user_idx
  on public.ma5_memberships (tenant_id, user_id);

-- ---------------------------------------------------------------------------
-- Stripe ledger
-- ---------------------------------------------------------------------------

create table public.ma5_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  stripe_checkout_session_id text not null,
  user_id uuid,
  product_id uuid,
  mode text not null check (mode in ('payment', 'subscription')),
  status text not null default 'open'
    check (status in ('open', 'complete', 'expired')),
  amount_total_cents int,
  currency text default 'usd',
  stripe_customer_id text,
  stripe_payment_intent_id text,
  stripe_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, stripe_checkout_session_id),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete restrict,
  foreign key (tenant_id, product_id) references public.ma5_products (tenant_id, id) on delete restrict
);

create index ma5_checkout_sessions_tenant_idx
  on public.ma5_checkout_sessions (tenant_id);

create index ma5_checkout_sessions_user_idx
  on public.ma5_checkout_sessions (tenant_id, user_id, created_at desc);

create table public.ma5_payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid,
  product_id uuid,
  checkout_session_id uuid,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  stripe_invoice_id text,
  amount_cents int not null default 0 check (amount_cents >= 0),
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  processing_fee_cents int not null default 0 check (processing_fee_cents >= 0),
  net_amount_cents int,
  payment_method_type text,
  import_source text
    check (import_source is null or import_source in ('stripe', 'mindbody')),
  external_payment_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete restrict,
  foreign key (tenant_id, product_id) references public.ma5_products (tenant_id, id) on delete restrict,
  foreign key (tenant_id, checkout_session_id) references public.ma5_checkout_sessions (tenant_id, id) on delete restrict
);

create unique index ma5_payments_tenant_stripe_payment_intent_uidx
  on public.ma5_payments (tenant_id, stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index ma5_payments_tenant_external_payment_id_uidx
  on public.ma5_payments (tenant_id, external_payment_id)
  where external_payment_id is not null;

create index ma5_payments_tenant_idx
  on public.ma5_payments (tenant_id);

create index ma5_payments_user_idx
  on public.ma5_payments (tenant_id, user_id, created_at desc);

create index ma5_payments_import_source_idx
  on public.ma5_payments (tenant_id, import_source, created_at desc);

create index ma5_payments_method_type_idx
  on public.ma5_payments (tenant_id, payment_method_type)
  where payment_method_type is not null;

create table public.ma5_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null,
  product_id uuid,
  price_id uuid,
  stripe_subscription_id text not null,
  stripe_price_id text,
  status text not null default 'incomplete'
    check (status in (
      'trialing', 'active', 'past_due', 'canceled', 'incomplete',
      'incomplete_expired', 'unpaid', 'paused', 'inactive'
    )),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, stripe_subscription_id),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete cascade,
  foreign key (tenant_id, product_id) references public.ma5_products (tenant_id, id) on delete restrict,
  foreign key (tenant_id, price_id) references public.ma5_prices (tenant_id, id) on delete restrict
);

create index ma5_subscriptions_tenant_idx
  on public.ma5_subscriptions (tenant_id);

create index ma5_subscriptions_user_idx
  on public.ma5_subscriptions (tenant_id, user_id, created_at desc);

create table public.ma5_invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid,
  subscription_id uuid,
  stripe_invoice_id text not null,
  stripe_subscription_id text,
  amount_due_cents int not null default 0,
  amount_paid_cents int not null default 0,
  currency text not null default 'usd',
  status text not null default 'open'
    check (status in (
      'draft', 'open', 'paid', 'uncollectible', 'void', 'payment_failed'
    )),
  hosted_invoice_url text,
  invoice_pdf text,
  period_start timestamptz,
  period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, stripe_invoice_id),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete restrict,
  foreign key (tenant_id, subscription_id) references public.ma5_subscriptions (tenant_id, id) on delete restrict
);

create index ma5_invoices_tenant_idx
  on public.ma5_invoices (tenant_id);

create table public.ma5_refunds (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  payment_id uuid,
  stripe_refund_id text not null,
  stripe_charge_id text,
  amount_cents int not null default 0,
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'canceled')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, stripe_refund_id),
  foreign key (tenant_id, payment_id) references public.ma5_payments (tenant_id, id) on delete restrict
);

create index ma5_refunds_tenant_idx
  on public.ma5_refunds (tenant_id);

-- ---------------------------------------------------------------------------
-- Programs / workouts
-- ---------------------------------------------------------------------------

create table public.ma5_exercises (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  title text not null,
  category text not null default 'Legs'
    check (category in (
      'Chest', 'Back', 'Shoulders', 'Legs', 'Hamstrings / Glutes', 'Arms',
      'Core', 'Plyometrics', 'Speed & Agility', 'Olympic Lifts',
      'Conditioning', 'Mobility', 'Recovery'
    )),
  points_of_performance text not null default '',
  video_source text not null default 'none'
    check (video_source in ('upload', 'youtube', 'vimeo', 'none')),
  video_url text,
  video_storage_path text,
  video_poster_path text,
  default_param_1 text not null default 'reps'
    check (default_param_1 in ('reps', 'weight_lb')),
  default_param_2 text not null default 'weight_lb'
    check (default_param_2 in ('reps', 'weight_lb')),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, created_by) references public.ma5_profiles (tenant_id, id) on delete restrict
);

create index ma5_exercises_tenant_idx
  on public.ma5_exercises (tenant_id);

create index ma5_exercises_title_idx
  on public.ma5_exercises (tenant_id, title);

create index ma5_exercises_category_idx
  on public.ma5_exercises (tenant_id, category);

create table public.ma5_workouts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  title text not null,
  coach_instructions text not null default '',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, created_by) references public.ma5_profiles (tenant_id, id) on delete restrict
);

create index ma5_workouts_tenant_idx
  on public.ma5_workouts (tenant_id);

create table public.ma5_workout_blocks (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.ma5_workouts (id) on delete cascade,
  sort_order int not null default 0,
  label text not null default 'A',
  section_title text,
  exercise_id uuid not null references public.ma5_exercises (id) on delete restrict,
  session_cues text not null default '',
  created_at timestamptz not null default now()
);

create index ma5_workout_blocks_workout_idx
  on public.ma5_workout_blocks (workout_id, sort_order);

create table public.ma5_workout_block_sets (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.ma5_workout_blocks (id) on delete cascade,
  set_number int not null,
  reps int,
  weight_lb numeric(8, 2),
  unique (block_id, set_number)
);

create table public.ma5_programs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  title text not null,
  weeks int not null check (weeks >= 1 and weeks <= 52),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, created_by) references public.ma5_profiles (tenant_id, id) on delete restrict
);

create index ma5_programs_tenant_idx
  on public.ma5_programs (tenant_id);

create table public.ma5_program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.ma5_programs (id) on delete cascade,
  week_index int not null check (week_index >= 1),
  day_index int not null check (day_index >= 1 and day_index <= 7),
  workout_id uuid references public.ma5_workouts (id) on delete set null,
  unique (program_id, week_index, day_index)
);

create index ma5_program_days_program_idx
  on public.ma5_program_days (program_id);

create table public.ma5_teams (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  name text not null check (char_length(name) <= 75),
  difficulty text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, created_by) references public.ma5_profiles (tenant_id, id) on delete restrict
);

create index ma5_teams_tenant_idx
  on public.ma5_teams (tenant_id);

create table public.ma5_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.ma5_teams (id) on delete cascade,
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  role text not null default 'athlete'
    check (role in ('athlete')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index ma5_team_members_user_idx
  on public.ma5_team_members (user_id);

create table public.ma5_program_assignments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  program_id uuid,
  client_user_id uuid,
  team_id uuid,
  start_date date not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  constraint ma5_program_assignments_target_chk check (
    (client_user_id is not null and team_id is null)
    or (client_user_id is null and team_id is not null)
  ),
  foreign key (tenant_id, program_id) references public.ma5_programs (tenant_id, id) on delete restrict,
  foreign key (tenant_id, client_user_id) references public.ma5_profiles (tenant_id, id) on delete cascade,
  foreign key (tenant_id, team_id) references public.ma5_teams (tenant_id, id) on delete cascade
);

create index ma5_program_assignments_tenant_idx
  on public.ma5_program_assignments (tenant_id);

create table public.ma5_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  entry_date date not null,
  workout_id uuid,
  title text not null default '',
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published')),
  source text not null default 'adhoc'
    check (source in ('program', 'library', 'adhoc')),
  client_user_id uuid,
  team_id uuid,
  program_assignment_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  constraint ma5_calendar_entries_target_chk check (
    (client_user_id is not null and team_id is null)
    or (client_user_id is null and team_id is not null)
  ),
  foreign key (tenant_id, workout_id) references public.ma5_workouts (tenant_id, id) on delete restrict,
  foreign key (tenant_id, client_user_id) references public.ma5_profiles (tenant_id, id) on delete cascade,
  foreign key (tenant_id, team_id) references public.ma5_teams (tenant_id, id) on delete cascade,
  foreign key (tenant_id, program_assignment_id) references public.ma5_program_assignments (tenant_id, id) on delete restrict
);

create index ma5_calendar_entries_tenant_idx
  on public.ma5_calendar_entries (tenant_id);

create index ma5_calendar_entries_client_date_idx
  on public.ma5_calendar_entries (tenant_id, client_user_id, entry_date);

create index ma5_calendar_entries_team_date_idx
  on public.ma5_calendar_entries (tenant_id, team_id, entry_date);

create table public.ma5_workout_completions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  calendar_entry_id uuid not null,
  client_user_id uuid not null,
  completed_at timestamptz not null default now(),
  client_note text not null default '',
  unique (tenant_id, id),
  unique (calendar_entry_id, client_user_id),
  foreign key (tenant_id, calendar_entry_id) references public.ma5_calendar_entries (tenant_id, id) on delete cascade,
  foreign key (tenant_id, client_user_id) references public.ma5_profiles (tenant_id, id) on delete cascade
);

create index ma5_workout_completions_tenant_idx
  on public.ma5_workout_completions (tenant_id);

create table public.ma5_workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  calendar_entry_id uuid not null,
  client_user_id uuid not null,
  workout_block_id uuid not null references public.ma5_workout_blocks (id) on delete cascade,
  exercise_id uuid not null,
  set_number int not null check (set_number >= 1),
  target_reps int,
  reps int,
  weight_lb numeric(8, 2),
  logged_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (calendar_entry_id, client_user_id, workout_block_id, set_number),
  foreign key (tenant_id, calendar_entry_id) references public.ma5_calendar_entries (tenant_id, id) on delete cascade,
  foreign key (tenant_id, client_user_id) references public.ma5_profiles (tenant_id, id) on delete cascade,
  foreign key (tenant_id, exercise_id) references public.ma5_exercises (tenant_id, id) on delete restrict
);

create index ma5_workout_set_logs_tenant_idx
  on public.ma5_workout_set_logs (tenant_id);

create index ma5_workout_set_logs_session_idx
  on public.ma5_workout_set_logs (calendar_entry_id, client_user_id);

create index ma5_workout_set_logs_history_idx
  on public.ma5_workout_set_logs (tenant_id, client_user_id, exercise_id, target_reps, logged_at desc);

-- ---------------------------------------------------------------------------
-- Waivers
-- ---------------------------------------------------------------------------

create table public.ma5_client_waivers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null,
  waiver_key text not null
    check (waiver_key in ('liability', 'facility_rules', 'media_release')),
  status text not null default 'pending'
    check (status in ('signed', 'pending', 'declined')),
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, user_id, waiver_key),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete cascade
);

create index ma5_client_waivers_tenant_idx
  on public.ma5_client_waivers (tenant_id);

create index ma5_client_waivers_user_idx
  on public.ma5_client_waivers (tenant_id, user_id);

-- ---------------------------------------------------------------------------
-- Communication
-- ---------------------------------------------------------------------------

create table public.ma5_message_threads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  client_id uuid not null,
  created_by uuid not null,
  subject text,
  status text not null default 'open'
    check (status in ('open', 'archived')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, client_id) references public.ma5_profiles (tenant_id, id) on delete cascade,
  foreign key (tenant_id, created_by) references public.ma5_profiles (tenant_id, id) on delete restrict
);

create unique index ma5_message_threads_one_open_per_client
  on public.ma5_message_threads (tenant_id, client_id)
  where status = 'open';

create index ma5_message_threads_tenant_idx
  on public.ma5_message_threads (tenant_id);

create index ma5_message_threads_client_idx
  on public.ma5_message_threads (tenant_id, client_id);

create index ma5_message_threads_last_message_idx
  on public.ma5_message_threads (tenant_id, last_message_at desc nulls last);

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

create table public.ma5_messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  thread_id uuid not null,
  sender_user_id uuid not null,
  sender_role text not null
    check (sender_role in ('coach', 'client', 'admin')),
  body text not null,
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  unique (tenant_id, id),
  foreign key (tenant_id, thread_id) references public.ma5_message_threads (tenant_id, id) on delete cascade,
  foreign key (tenant_id, sender_user_id) references public.ma5_profiles (tenant_id, id) on delete restrict
);

create index ma5_messages_tenant_idx
  on public.ma5_messages (tenant_id);

create index ma5_messages_thread_created_idx
  on public.ma5_messages (thread_id, created_at);

create index ma5_messages_sender_idx
  on public.ma5_messages (tenant_id, sender_user_id);

create table public.ma5_message_thread_reads (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.ma5_message_threads (id) on delete cascade,
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  unique (thread_id, user_id)
);

create index ma5_message_thread_reads_user_idx
  on public.ma5_message_thread_reads (user_id);

create table public.ma5_announcements (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  created_by uuid not null,
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
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, created_by) references public.ma5_profiles (tenant_id, id) on delete restrict
);

create index ma5_announcements_tenant_idx
  on public.ma5_announcements (tenant_id);

create index ma5_announcements_status_idx
  on public.ma5_announcements (tenant_id, status, publish_at desc nulls last);

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

create table public.ma5_announcement_recipients (
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

create index ma5_announcement_recipients_client_idx
  on public.ma5_announcement_recipients (client_id, read_at);

create index ma5_announcement_recipients_announcement_idx
  on public.ma5_announcement_recipients (announcement_id);

-- ---------------------------------------------------------------------------
-- Push subscriptions
-- ---------------------------------------------------------------------------

create table public.ma5_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (tenant_id, user_id, endpoint),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete cascade
);

create index ma5_push_subscriptions_tenant_idx
  on public.ma5_push_subscriptions (tenant_id);

create index ma5_push_subscriptions_user_idx
  on public.ma5_push_subscriptions (tenant_id, user_id);

-- ---------------------------------------------------------------------------
-- Marketing attribution
-- ---------------------------------------------------------------------------

create table public.ma5_visitor_sessions (
  visitor_id uuid primary key,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  landing_page text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  last_landing_page text,
  last_referrer text,
  last_utm_source text,
  last_utm_medium text,
  last_utm_campaign text,
  last_utm_term text,
  last_utm_content text,
  page_views integer not null default 1 check (page_views >= 0),
  is_bot boolean not null default false,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, visitor_id)
);

create index ma5_visitor_sessions_tenant_idx
  on public.ma5_visitor_sessions (tenant_id);

create index ma5_visitor_sessions_first_seen_idx
  on public.ma5_visitor_sessions (tenant_id, first_seen desc);

create index ma5_visitor_sessions_utm_campaign_idx
  on public.ma5_visitor_sessions (tenant_id, utm_campaign)
  where utm_campaign is not null;

create index ma5_visitor_sessions_utm_source_idx
  on public.ma5_visitor_sessions (tenant_id, utm_source)
  where utm_source is not null;

create index ma5_visitor_sessions_is_bot_idx
  on public.ma5_visitor_sessions (tenant_id, is_bot)
  where is_bot = false;

create table public.ma5_leads (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  visitor_id uuid,
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
  converted_profile_id uuid,
  converted_at timestamptz,
  invited_at timestamptz,
  source_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create index ma5_leads_tenant_idx
  on public.ma5_leads (tenant_id);

create index ma5_leads_email_idx
  on public.ma5_leads (tenant_id, lower(email));

create index ma5_leads_status_idx
  on public.ma5_leads (tenant_id, status);

create index ma5_leads_created_at_idx
  on public.ma5_leads (tenant_id, created_at desc);

create index ma5_leads_utm_campaign_idx
  on public.ma5_leads (tenant_id, utm_campaign)
  where utm_campaign is not null;

create index ma5_leads_visitor_id_idx
  on public.ma5_leads (visitor_id)
  where visitor_id is not null;

-- Circular FKs: profiles ↔ leads, leads → visitor_sessions
alter table public.ma5_profiles
  add constraint ma5_profiles_lead_id_fkey
  foreign key (tenant_id, lead_id) references public.ma5_leads (tenant_id, id) on delete restrict;

alter table public.ma5_leads
  add constraint ma5_leads_converted_profile_id_fkey
  foreign key (tenant_id, converted_profile_id) references public.ma5_profiles (tenant_id, id) on delete restrict;

alter table public.ma5_leads
  add constraint ma5_leads_visitor_id_fkey
  foreign key (tenant_id, visitor_id) references public.ma5_visitor_sessions (tenant_id, visitor_id) on delete restrict;

create index ma5_profiles_lead_id_idx
  on public.ma5_profiles (lead_id)
  where lead_id is not null;

create index ma5_profiles_acquisition_campaign_idx
  on public.ma5_profiles (tenant_id, acquisition_campaign)
  where acquisition_campaign is not null;

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
  if retention_days < 1 then
    raise exception 'retention_days must be >= 1, got %', retention_days;
  end if;

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

-- ---------------------------------------------------------------------------
-- Member journey + marketing gallery + community
-- ---------------------------------------------------------------------------

create table public.ma5_member_goals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null,
  title text not null check (char_length(trim(title)) > 0),
  target_date date,
  status text not null default 'active'
    check (status in ('active', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete cascade
);

create index ma5_member_goals_tenant_idx
  on public.ma5_member_goals (tenant_id);

create index ma5_member_goals_user_idx
  on public.ma5_member_goals (tenant_id, user_id, created_at desc);

create table public.ma5_progress_photos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  user_id uuid not null,
  storage_path text not null,
  caption text,
  taken_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, user_id) references public.ma5_profiles (tenant_id, id) on delete cascade
);

create index ma5_progress_photos_tenant_idx
  on public.ma5_progress_photos (tenant_id);

create index ma5_progress_photos_user_idx
  on public.ma5_progress_photos (tenant_id, user_id, taken_at desc);

create table public.ma5_marketing_gallery (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  section text not null check (section in ('transformations', 'community')),
  storage_path text not null,
  alt_text text not null default '',
  client_name text,
  sort_order integer not null default 0,
  featured boolean not null default false,
  placement text
    check (
      placement is null
      or placement in (
        'hero',
        'fathers-heart',
        'gatlinburg',
        'breakfast-barbells',
        'blended-church',
        'pinheads-bowling'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id)
);

create index ma5_marketing_gallery_tenant_idx
  on public.ma5_marketing_gallery (tenant_id);

create index ma5_marketing_gallery_section_idx
  on public.ma5_marketing_gallery (tenant_id, section, sort_order asc, created_at desc);

create index ma5_marketing_gallery_placement_idx
  on public.ma5_marketing_gallery (tenant_id, section, placement)
  where placement is not null;

comment on column public.ma5_marketing_gallery.placement is
  'Our Community page slot: hero or named event section. Null for transformations or unassigned community photos.';

create table public.ma5_community_posts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  author_user_id uuid not null,
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  parent_id uuid,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, author_user_id) references public.ma5_profiles (tenant_id, id) on delete cascade,
  foreign key (tenant_id, parent_id) references public.ma5_community_posts (tenant_id, id) on delete cascade
);

create index ma5_community_posts_tenant_idx
  on public.ma5_community_posts (tenant_id);

create index ma5_community_posts_created_idx
  on public.ma5_community_posts (tenant_id, created_at desc);

create index ma5_community_posts_parent_idx
  on public.ma5_community_posts (parent_id, created_at asc)
  where parent_id is not null;

-- Inherit-only children: same-tenant enforcement via parent chain
create or replace function public.ma5_team_members_enforce_same_tenant()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.ma5_teams tm
    join public.ma5_profiles p on p.id = new.user_id
    where tm.id = new.team_id
      and tm.tenant_id = p.tenant_id
  ) then
    raise exception 'ma5_team_members: team and profile must belong to the same tenant';
  end if;
  return new;
end;
$$;

create or replace function public.ma5_message_thread_reads_enforce_same_tenant()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.ma5_message_threads mt
    join public.ma5_profiles p on p.id = new.user_id
    where mt.id = new.thread_id
      and mt.tenant_id = p.tenant_id
  ) then
    raise exception 'ma5_message_thread_reads: thread and profile must belong to the same tenant';
  end if;
  return new;
end;
$$;

create or replace function public.ma5_announcement_recipients_enforce_same_tenant()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.ma5_announcements a
    join public.ma5_profiles p on p.id = new.client_id
    where a.id = new.announcement_id
      and a.tenant_id = p.tenant_id
  ) then
    raise exception 'ma5_announcement_recipients: announcement and client must belong to the same tenant';
  end if;

  if new.user_id is not null
     and not exists (
       select 1
       from public.ma5_announcements a
       join public.ma5_profiles p on p.id = new.user_id
       where a.id = new.announcement_id
         and a.tenant_id = p.tenant_id
     )
  then
    raise exception 'ma5_announcement_recipients: announcement and user must belong to the same tenant';
  end if;

  return new;
end;
$$;

create or replace function public.ma5_workout_blocks_enforce_same_tenant()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.ma5_workouts w
    join public.ma5_exercises e on e.id = new.exercise_id
    where w.id = new.workout_id
      and w.tenant_id = e.tenant_id
  ) then
    raise exception 'ma5_workout_blocks: workout and exercise must belong to the same tenant';
  end if;
  return new;
end;
$$;

create or replace function public.ma5_program_days_enforce_same_tenant()
returns trigger
language plpgsql
as $$
begin
  if new.workout_id is not null
     and not exists (
       select 1
       from public.ma5_programs p
       join public.ma5_workouts w on w.id = new.workout_id
       where p.id = new.program_id
         and p.tenant_id = w.tenant_id
     )
  then
    raise exception 'ma5_program_days: program and workout must belong to the same tenant';
  end if;
  return new;
end;
$$;

create or replace function public.ma5_workout_set_logs_enforce_workout_block_tenant()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.ma5_workout_blocks wb
    join public.ma5_workouts w on w.id = wb.workout_id
    where wb.id = new.workout_block_id
      and w.tenant_id = new.tenant_id
  ) then
    raise exception 'ma5_workout_set_logs: workout block must belong to the same tenant';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Security definer function grants
-- ---------------------------------------------------------------------------

revoke all on function public.ma5_touch_thread_on_message() from public;
grant execute on function public.ma5_touch_thread_on_message() to service_role;

revoke all on function public.ma5_expire_announcements() from public;
grant execute on function public.ma5_expire_announcements() to service_role;

revoke all on function public.ma5_purge_expired_anonymous_visitors(integer) from public;
grant execute on function public.ma5_purge_expired_anonymous_visitors(integer) to service_role;

-- ---------------------------------------------------------------------------
-- updated_at + domain triggers
-- ---------------------------------------------------------------------------

create trigger ma5_profiles_set_updated_at
before update on public.ma5_profiles
for each row execute function public.set_updated_at();

create trigger ma5_class_types_set_updated_at
before update on public.ma5_class_types
for each row execute function public.set_updated_at();

create trigger ma5_products_sync_active
before insert or update on public.ma5_products
for each row execute function public.ma5_products_sync_active();

create trigger ma5_sessions_set_updated_at
before update on public.ma5_sessions
for each row execute function public.set_updated_at();

create trigger ma5_bookings_set_updated_at
before update on public.ma5_bookings
for each row execute function public.set_updated_at();

create trigger ma5_memberships_set_updated_at
before update on public.ma5_memberships
for each row execute function public.set_updated_at();

create trigger ma5_checkout_sessions_set_updated_at
before update on public.ma5_checkout_sessions
for each row execute function public.set_updated_at();

create trigger ma5_payments_set_updated_at
before update on public.ma5_payments
for each row execute function public.set_updated_at();

create trigger ma5_subscriptions_set_updated_at
before update on public.ma5_subscriptions
for each row execute function public.set_updated_at();

create trigger ma5_invoices_set_updated_at
before update on public.ma5_invoices
for each row execute function public.set_updated_at();

create trigger ma5_refunds_set_updated_at
before update on public.ma5_refunds
for each row execute function public.set_updated_at();

create trigger ma5_exercises_set_updated_at
before update on public.ma5_exercises
for each row execute function public.set_updated_at();

create trigger ma5_workouts_set_updated_at
before update on public.ma5_workouts
for each row execute function public.set_updated_at();

create trigger ma5_programs_set_updated_at
before update on public.ma5_programs
for each row execute function public.set_updated_at();

create trigger ma5_teams_set_updated_at
before update on public.ma5_teams
for each row execute function public.set_updated_at();

create trigger ma5_program_assignments_set_updated_at
before update on public.ma5_program_assignments
for each row execute function public.set_updated_at();

create trigger ma5_calendar_entries_set_updated_at
before update on public.ma5_calendar_entries
for each row execute function public.set_updated_at();

create trigger ma5_client_waivers_set_updated_at
before update on public.ma5_client_waivers
for each row execute function public.set_updated_at();

create trigger ma5_message_threads_set_updated_at
before update on public.ma5_message_threads
for each row execute function public.set_updated_at();

create trigger ma5_messages_touch_thread
after insert on public.ma5_messages
for each row execute function public.ma5_touch_thread_on_message();

create trigger ma5_announcements_set_updated_at
before update on public.ma5_announcements
for each row execute function public.set_updated_at();

create trigger ma5_push_subscriptions_set_updated_at
before update on public.ma5_push_subscriptions
for each row execute function public.set_updated_at();

create trigger ma5_visitor_sessions_set_updated_at
before update on public.ma5_visitor_sessions
for each row execute function public.set_updated_at();

create trigger ma5_visitor_sessions_protect_first_touch
before update on public.ma5_visitor_sessions
for each row execute function public.ma5_protect_visitor_first_touch();

create trigger ma5_leads_set_updated_at
before update on public.ma5_leads
for each row execute function public.set_updated_at();

create trigger ma5_leads_protect_first_touch
before update on public.ma5_leads
for each row execute function public.ma5_protect_lead_first_touch();

create trigger ma5_profiles_protect_acquisition
before update on public.ma5_profiles
for each row execute function public.ma5_protect_profile_acquisition();

create trigger ma5_member_goals_set_updated_at
before update on public.ma5_member_goals
for each row execute function public.set_updated_at();

create trigger ma5_progress_photos_set_updated_at
before update on public.ma5_progress_photos
for each row execute function public.set_updated_at();

create trigger ma5_marketing_gallery_set_updated_at
before update on public.ma5_marketing_gallery
for each row execute function public.set_updated_at();

create trigger ma5_team_members_enforce_same_tenant
before insert or update on public.ma5_team_members
for each row execute function public.ma5_team_members_enforce_same_tenant();

create trigger ma5_message_thread_reads_enforce_same_tenant
before insert or update on public.ma5_message_thread_reads
for each row execute function public.ma5_message_thread_reads_enforce_same_tenant();

create trigger ma5_announcement_recipients_enforce_same_tenant
before insert or update on public.ma5_announcement_recipients
for each row execute function public.ma5_announcement_recipients_enforce_same_tenant();

create trigger ma5_workout_blocks_enforce_same_tenant
before insert or update on public.ma5_workout_blocks
for each row execute function public.ma5_workout_blocks_enforce_same_tenant();

create trigger ma5_program_days_enforce_same_tenant
before insert or update on public.ma5_program_days
for each row execute function public.ma5_program_days_enforce_same_tenant();

create trigger ma5_workout_set_logs_enforce_workout_block_tenant
before insert or update on public.ma5_workout_set_logs
for each row execute function public.ma5_workout_set_logs_enforce_workout_block_tenant();

-- ---------------------------------------------------------------------------
-- RLS enabled (policies deferred to 029)
-- ---------------------------------------------------------------------------

alter table public.ma5_profiles enable row level security;
alter table public.ma5_user_roles enable row level security;
alter table public.ma5_notifications enable row level security;
alter table public.ma5_class_types enable row level security;
alter table public.ma5_products enable row level security;
alter table public.ma5_prices enable row level security;
alter table public.ma5_sessions enable row level security;
alter table public.ma5_bookings enable row level security;
alter table public.ma5_memberships enable row level security;
alter table public.ma5_checkout_sessions enable row level security;
alter table public.ma5_payments enable row level security;
alter table public.ma5_subscriptions enable row level security;
alter table public.ma5_invoices enable row level security;
alter table public.ma5_refunds enable row level security;
alter table public.ma5_exercises enable row level security;
alter table public.ma5_workouts enable row level security;
alter table public.ma5_workout_blocks enable row level security;
alter table public.ma5_workout_block_sets enable row level security;
alter table public.ma5_programs enable row level security;
alter table public.ma5_program_days enable row level security;
alter table public.ma5_teams enable row level security;
alter table public.ma5_team_members enable row level security;
alter table public.ma5_program_assignments enable row level security;
alter table public.ma5_calendar_entries enable row level security;
alter table public.ma5_workout_completions enable row level security;
alter table public.ma5_workout_set_logs enable row level security;
alter table public.ma5_client_waivers enable row level security;
alter table public.ma5_message_threads enable row level security;
alter table public.ma5_messages enable row level security;
alter table public.ma5_message_thread_reads enable row level security;
alter table public.ma5_announcements enable row level security;
alter table public.ma5_announcement_recipients enable row level security;
alter table public.ma5_push_subscriptions enable row level security;
alter table public.ma5_visitor_sessions enable row level security;
alter table public.ma5_leads enable row level security;
alter table public.ma5_member_goals enable row level security;
alter table public.ma5_progress_photos enable row level security;
alter table public.ma5_marketing_gallery enable row level security;
alter table public.ma5_community_posts enable row level security;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'ma5_profiles',
    'ma5_user_roles',
    'ma5_notifications',
    'ma5_class_types',
    'ma5_products',
    'ma5_prices',
    'ma5_sessions',
    'ma5_bookings',
    'ma5_memberships',
    'ma5_checkout_sessions',
    'ma5_payments',
    'ma5_subscriptions',
    'ma5_invoices',
    'ma5_refunds',
    'ma5_exercises',
    'ma5_workouts',
    'ma5_workout_blocks',
    'ma5_workout_block_sets',
    'ma5_programs',
    'ma5_program_days',
    'ma5_teams',
    'ma5_team_members',
    'ma5_program_assignments',
    'ma5_calendar_entries',
    'ma5_workout_completions',
    'ma5_workout_set_logs',
    'ma5_client_waivers',
    'ma5_message_threads',
    'ma5_messages',
    'ma5_message_thread_reads',
    'ma5_announcements',
    'ma5_announcement_recipients',
    'ma5_push_subscriptions',
    'ma5_visitor_sessions',
    'ma5_leads',
    'ma5_member_goals',
    'ma5_progress_photos',
    'ma5_marketing_gallery',
    'ma5_community_posts'
  ]
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end
$$;


-- ---------------------------------------------------------------------------
-- Optional FK nullification on parent DELETE (v4)
-- PostgreSQL 15+ supports ON DELETE SET NULL (column) on composite FKs; use
-- RESTRICT + BEFORE DELETE triggers for PG14+ / broader Supabase compatibility.
-- Only nullable reference columns are cleared; tenant_id is never nulled.
-- ---------------------------------------------------------------------------

create or replace function public.ma5_class_types_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_sessions
  set class_type_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and class_type_id = OLD.id;
  return OLD;
end;
$$;

create or replace function public.ma5_products_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_checkout_sessions
  set product_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and product_id = OLD.id;

  update public.ma5_payments
  set product_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and product_id = OLD.id;

  update public.ma5_subscriptions
  set product_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and product_id = OLD.id;

  return OLD;
end;
$$;

create or replace function public.ma5_profiles_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_checkout_sessions
  set user_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and user_id = OLD.id;

  update public.ma5_payments
  set user_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and user_id = OLD.id;

  update public.ma5_invoices
  set user_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and user_id = OLD.id;

  update public.ma5_exercises
  set created_by = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and created_by = OLD.id;

  update public.ma5_workouts
  set created_by = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and created_by = OLD.id;

  update public.ma5_programs
  set created_by = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and created_by = OLD.id;

  update public.ma5_teams
  set created_by = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and created_by = OLD.id;

  update public.ma5_leads
  set converted_profile_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and converted_profile_id = OLD.id;

  return OLD;
end;
$$;

create or replace function public.ma5_checkout_sessions_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_payments
  set checkout_session_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and checkout_session_id = OLD.id;
  return OLD;
end;
$$;

create or replace function public.ma5_prices_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_subscriptions
  set price_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and price_id = OLD.id;
  return OLD;
end;
$$;

create or replace function public.ma5_subscriptions_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_invoices
  set subscription_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and subscription_id = OLD.id;
  return OLD;
end;
$$;

create or replace function public.ma5_payments_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_refunds
  set payment_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and payment_id = OLD.id;
  return OLD;
end;
$$;

create or replace function public.ma5_programs_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_program_assignments
  set program_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and program_id = OLD.id;
  return OLD;
end;
$$;

create or replace function public.ma5_workouts_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_program_days
  set workout_id = null
  where workout_id = OLD.id;

  update public.ma5_calendar_entries
  set workout_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and workout_id = OLD.id;
  return OLD;
end;
$$;

create or replace function public.ma5_program_assignments_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_calendar_entries
  set program_assignment_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and program_assignment_id = OLD.id;
  return OLD;
end;
$$;

create or replace function public.ma5_leads_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_profiles
  set lead_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and lead_id = OLD.id;
  return OLD;
end;
$$;

create or replace function public.ma5_visitor_sessions_nullify_optional_refs()
returns trigger
language plpgsql
as $$
begin
  update public.ma5_leads
  set visitor_id = null,
      updated_at = now()
  where tenant_id = OLD.tenant_id
    and visitor_id = OLD.visitor_id;
  return OLD;
end;
$$;

drop trigger if exists ma5_class_types_before_delete_nullify_refs on public.ma5_class_types;
create trigger ma5_class_types_before_delete_nullify_refs
before delete on public.ma5_class_types
for each row execute function public.ma5_class_types_nullify_optional_refs();

drop trigger if exists ma5_products_before_delete_nullify_refs on public.ma5_products;
create trigger ma5_products_before_delete_nullify_refs
before delete on public.ma5_products
for each row execute function public.ma5_products_nullify_optional_refs();

drop trigger if exists ma5_profiles_before_delete_nullify_refs on public.ma5_profiles;
create trigger ma5_profiles_before_delete_nullify_refs
before delete on public.ma5_profiles
for each row execute function public.ma5_profiles_nullify_optional_refs();

drop trigger if exists ma5_checkout_sessions_before_delete_nullify_refs on public.ma5_checkout_sessions;
create trigger ma5_checkout_sessions_before_delete_nullify_refs
before delete on public.ma5_checkout_sessions
for each row execute function public.ma5_checkout_sessions_nullify_optional_refs();

drop trigger if exists ma5_prices_before_delete_nullify_refs on public.ma5_prices;
create trigger ma5_prices_before_delete_nullify_refs
before delete on public.ma5_prices
for each row execute function public.ma5_prices_nullify_optional_refs();

drop trigger if exists ma5_subscriptions_before_delete_nullify_refs on public.ma5_subscriptions;
create trigger ma5_subscriptions_before_delete_nullify_refs
before delete on public.ma5_subscriptions
for each row execute function public.ma5_subscriptions_nullify_optional_refs();

drop trigger if exists ma5_payments_before_delete_nullify_refs on public.ma5_payments;
create trigger ma5_payments_before_delete_nullify_refs
before delete on public.ma5_payments
for each row execute function public.ma5_payments_nullify_optional_refs();

drop trigger if exists ma5_programs_before_delete_nullify_refs on public.ma5_programs;
create trigger ma5_programs_before_delete_nullify_refs
before delete on public.ma5_programs
for each row execute function public.ma5_programs_nullify_optional_refs();

drop trigger if exists ma5_workouts_before_delete_nullify_refs on public.ma5_workouts;
create trigger ma5_workouts_before_delete_nullify_refs
before delete on public.ma5_workouts
for each row execute function public.ma5_workouts_nullify_optional_refs();

drop trigger if exists ma5_program_assignments_before_delete_nullify_refs on public.ma5_program_assignments;
create trigger ma5_program_assignments_before_delete_nullify_refs
before delete on public.ma5_program_assignments
for each row execute function public.ma5_program_assignments_nullify_optional_refs();

drop trigger if exists ma5_leads_before_delete_nullify_refs on public.ma5_leads;
create trigger ma5_leads_before_delete_nullify_refs
before delete on public.ma5_leads
for each row execute function public.ma5_leads_nullify_optional_refs();

drop trigger if exists ma5_visitor_sessions_before_delete_nullify_refs on public.ma5_visitor_sessions;
create trigger ma5_visitor_sessions_before_delete_nullify_refs
before delete on public.ma5_visitor_sessions
for each row execute function public.ma5_visitor_sessions_nullify_optional_refs();

-- ---------------------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------------------

do $$
declare
  table_count int;
  expected_tables text[] := array[
    'ma5_locations',
    'ma5_profiles',
    'ma5_user_roles',
    'ma5_notifications',
    'ma5_class_types',
    'ma5_products',
    'ma5_prices',
    'ma5_sessions',
    'ma5_bookings',
    'ma5_memberships',
    'ma5_checkout_sessions',
    'ma5_payments',
    'ma5_subscriptions',
    'ma5_invoices',
    'ma5_refunds',
    'ma5_exercises',
    'ma5_workouts',
    'ma5_workout_blocks',
    'ma5_workout_block_sets',
    'ma5_programs',
    'ma5_program_days',
    'ma5_teams',
    'ma5_team_members',
    'ma5_program_assignments',
    'ma5_calendar_entries',
    'ma5_workout_completions',
    'ma5_workout_set_logs',
    'ma5_client_waivers',
    'ma5_message_threads',
    'ma5_messages',
    'ma5_message_thread_reads',
    'ma5_announcements',
    'ma5_announcement_recipients',
    'ma5_push_subscriptions',
    'ma5_visitor_sessions',
    'ma5_leads',
    'ma5_member_goals',
    'ma5_progress_photos',
    'ma5_marketing_gallery',
    'ma5_community_posts'
  ];
  missing text;
  sessions_tenant_id_nullable text;
  sessions_location_id_nullable text;
  bookings_session_fk_exists boolean;
  payments_stripe_uidx_exists boolean;
  profiles_tenant_id_uidx_exists boolean;
  sessions_tenant_id_uidx_exists boolean;
begin
  select count(*) into table_count
  from information_schema.tables
  where table_schema = 'public'
    and table_name = any (expected_tables);

  if table_count <> array_length(expected_tables, 1) then
    select string_agg(e, ', ')
    into missing
    from unnest(expected_tables) e
    where not exists (
      select 1
      from information_schema.tables t
      where t.table_schema = 'public'
        and t.table_name = e
    );

    raise exception 'expected % ma5_* tables, found %. Missing: %',
      array_length(expected_tables, 1), table_count, coalesce(missing, '(none)');
  end if;

  select c.is_nullable into sessions_tenant_id_nullable
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'ma5_sessions'
    and c.column_name = 'tenant_id';

  if sessions_tenant_id_nullable <> 'NO' then
    raise exception 'ma5_sessions.tenant_id must be NOT NULL';
  end if;

  select c.is_nullable into sessions_location_id_nullable
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'ma5_sessions'
    and c.column_name = 'location_id';

  if sessions_location_id_nullable <> 'NO' then
    raise exception 'ma5_sessions.location_id must be NOT NULL';
  end if;

  select exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'ma5_bookings'
      and c.contype = 'f'
      and c.conname = 'ma5_bookings_session_fkey'
  ) into bookings_session_fk_exists;

  if not bookings_session_fk_exists then
    raise exception 'composite FK ma5_bookings_session_fkey is missing on ma5_bookings';
  end if;

  select exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'ma5_payments'
      and indexname = 'ma5_payments_tenant_stripe_payment_intent_uidx'
  ) into payments_stripe_uidx_exists;

  if not payments_stripe_uidx_exists then
    raise exception 'tenant-scoped stripe unique index missing on ma5_payments';
  end if;

  select exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'ma5_profiles'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) like '%tenant_id%'
      and pg_get_constraintdef(c.oid) like '%id%'
  ) into profiles_tenant_id_uidx_exists;

  if not profiles_tenant_id_uidx_exists then
    raise exception 'unique(tenant_id, id) missing on ma5_profiles';
  end if;

  select exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'ma5_sessions'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) like '%tenant_id%'
      and pg_get_constraintdef(c.oid) like '%id%'
  ) into sessions_tenant_id_uidx_exists;

  if not sessions_tenant_id_uidx_exists then
    raise exception 'unique(tenant_id, id) missing on ma5_sessions';
  end if;
end
$$;

commit;

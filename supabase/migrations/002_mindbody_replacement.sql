-- MA5 Mindbody-replacement demo schema.
-- Creates ONLY ma5_* scheduling, booking, product, and membership tables.

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
-- Catalog: class types + sellable products / memberships
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_class_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  default_duration_minutes int not null default 60,
  default_capacity int not null default 10,
  default_price_cents int not null default 0,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ma5_products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  product_type text not null
    check (product_type in ('membership', 'package', 'drop_in', 'addon')),
  price_cents int not null,
  currency text not null default 'usd',
  billing_interval text
    check (billing_interval is null or billing_interval in ('month', 'one_time')),
  session_credits int,
  stripe_price_id text,
  active boolean not null default true,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Schedule
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_sessions (
  id uuid primary key default gen_random_uuid(),
  class_type_id uuid references public.ma5_class_types (id) on delete set null,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Indiana/Indianapolis',
  capacity int not null check (capacity > 0),
  price_cents int not null default 0,
  location_name text not null default 'MA5 Performance',
  status text not null default 'published'
    check (status in ('draft', 'published', 'full', 'cancelled', 'completed')),
  coach_name text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ma5_sessions_starts_idx
  on public.ma5_sessions (starts_at);
create index if not exists ma5_sessions_public_idx
  on public.ma5_sessions (status, starts_at)
  where status = 'published';

-- ---------------------------------------------------------------------------
-- Bookings + memberships
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_bookings (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ma5_sessions (id) on delete cascade,
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  confirmation_number text not null unique,
  status text not null default 'confirmed'
    check (status in (
      'pending', 'confirmed', 'cancelled', 'waitlisted',
      'attended', 'no_show', 'refunded'
    )),
  payment_status text not null default 'not_required'
    check (payment_status in (
      'not_required', 'pending', 'paid', 'refunded', 'pay_at_facility'
    )),
  amount_cents int not null default 0,
  stripe_checkout_session_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index if not exists ma5_bookings_user_idx
  on public.ma5_bookings (user_id, created_at desc);
create index if not exists ma5_bookings_session_idx
  on public.ma5_bookings (session_id);

create table if not exists public.ma5_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  product_id uuid not null references public.ma5_products (id) on delete restrict,
  status text not null default 'inactive'
    check (status in (
      'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'inactive'
    )),
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ma5_memberships_user_idx
  on public.ma5_memberships (user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists ma5_class_types_set_updated_at on public.ma5_class_types;
create trigger ma5_class_types_set_updated_at
before update on public.ma5_class_types
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_products_set_updated_at on public.ma5_products;
create trigger ma5_products_set_updated_at
before update on public.ma5_products
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_sessions_set_updated_at on public.ma5_sessions;
create trigger ma5_sessions_set_updated_at
before update on public.ma5_sessions
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_bookings_set_updated_at on public.ma5_bookings;
create trigger ma5_bookings_set_updated_at
before update on public.ma5_bookings
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_memberships_set_updated_at on public.ma5_memberships;
create trigger ma5_memberships_set_updated_at
before update on public.ma5_memberships
for each row execute function public.ma5_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ma5_class_types enable row level security;
alter table public.ma5_products enable row level security;
alter table public.ma5_sessions enable row level security;
alter table public.ma5_bookings enable row level security;
alter table public.ma5_memberships enable row level security;

drop policy if exists ma5_class_types_public_read on public.ma5_class_types;
create policy ma5_class_types_public_read
on public.ma5_class_types for select
to anon, authenticated
using (active = true or public.ma5_is_staff());

drop policy if exists ma5_class_types_staff_write on public.ma5_class_types;
create policy ma5_class_types_staff_write
on public.ma5_class_types for all
to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_products_public_read on public.ma5_products;
create policy ma5_products_public_read
on public.ma5_products for select
to anon, authenticated
using (active = true or public.ma5_is_staff());

drop policy if exists ma5_products_staff_write on public.ma5_products;
create policy ma5_products_staff_write
on public.ma5_products for all
to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_sessions_public_read on public.ma5_sessions;
create policy ma5_sessions_public_read
on public.ma5_sessions for select
to anon, authenticated
using (status = 'published' or public.ma5_is_staff());

drop policy if exists ma5_sessions_staff_write on public.ma5_sessions;
create policy ma5_sessions_staff_write
on public.ma5_sessions for all
to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_bookings_select_own_or_staff on public.ma5_bookings;
create policy ma5_bookings_select_own_or_staff
on public.ma5_bookings for select
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_bookings_insert_own on public.ma5_bookings;
create policy ma5_bookings_insert_own
on public.ma5_bookings for insert
to authenticated
with check (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_bookings_update_own_or_staff on public.ma5_bookings;
create policy ma5_bookings_update_own_or_staff
on public.ma5_bookings for update
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff())
with check (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_memberships_select_own_or_staff on public.ma5_memberships;
create policy ma5_memberships_select_own_or_staff
on public.ma5_memberships for select
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_memberships_staff_write on public.ma5_memberships;
create policy ma5_memberships_staff_write
on public.ma5_memberships for all
to authenticated
using (public.ma5_is_staff() or public.ma5_has_role(array['owner', 'admin']))
with check (public.ma5_is_staff() or public.ma5_has_role(array['owner', 'admin']));

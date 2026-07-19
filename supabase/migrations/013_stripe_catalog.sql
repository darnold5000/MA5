-- Authoritative Stripe catalog + payment ledger.
-- Offerings are managed in MA5 admin; Stripe Product/Price IDs live on rows.

-- ---------------------------------------------------------------------------
-- Evolve ma5_products
-- ---------------------------------------------------------------------------

alter table public.ma5_products
  add column if not exists category text;

alter table public.ma5_products
  add column if not exists payment_type text;

alter table public.ma5_products
  add column if not exists status text;

alter table public.ma5_products
  add column if not exists stripe_product_id text;

alter table public.ma5_products
  add column if not exists current_stripe_price_id text;

update public.ma5_products
set
  payment_type = coalesce(
    payment_type,
    case
      when billing_interval = 'one_time' then 'one_time'
      else 'subscription'
    end
  ),
  status = coalesce(
    status,
    case when active then 'active' else 'inactive' end
  ),
  category = coalesce(
    category,
    case product_type
      when 'addon' then 'open_gym'
      when 'drop_in' then 'small_group'
      else 'small_group'
    end
  ),
  current_stripe_price_id = coalesce(current_stripe_price_id, stripe_price_id)
where true;

alter table public.ma5_products
  alter column payment_type set default 'subscription';

alter table public.ma5_products
  alter column status set default 'draft';

alter table public.ma5_products
  alter column payment_type set not null;

alter table public.ma5_products
  alter column status set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ma5_products_payment_type_check'
  ) then
    alter table public.ma5_products
      add constraint ma5_products_payment_type_check
      check (payment_type in ('one_time', 'subscription'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ma5_products_status_check'
  ) then
    alter table public.ma5_products
      add constraint ma5_products_status_check
      check (status in ('draft', 'active', 'inactive', 'archived'));
  end if;
end $$;

-- Keep active boolean aligned with status for legacy readers.
-- Note: ma5_products.stripe_price_id is dropped in 014; do not mirror onto it.
create or replace function public.ma5_products_sync_active()
returns trigger
language plpgsql
as $$
begin
  new.active := (new.status = 'active');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists ma5_products_sync_active on public.ma5_products;
create trigger ma5_products_sync_active
before insert or update on public.ma5_products
for each row execute function public.ma5_products_sync_active();

drop policy if exists ma5_products_public_read on public.ma5_products;
create policy ma5_products_public_read
on public.ma5_products for select
to anon, authenticated
using (status = 'active' or public.ma5_is_staff());

-- ---------------------------------------------------------------------------
-- Price history (never mutate Stripe Price objects)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.ma5_products (id) on delete cascade,
  stripe_price_id text,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'usd',
  billing_interval text
    check (billing_interval is null or billing_interval in ('month', 'one_time')),
  active boolean not null default true,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists ma5_prices_product_idx
  on public.ma5_prices (product_id, effective_at desc);

alter table public.ma5_prices enable row level security;

drop policy if exists ma5_prices_public_read on public.ma5_prices;
create policy ma5_prices_public_read
on public.ma5_prices for select
to anon, authenticated
using (
  exists (
    select 1 from public.ma5_products p
    where p.id = product_id
      and (p.status = 'active' or public.ma5_is_staff())
  )
);

drop policy if exists ma5_prices_staff_write on public.ma5_prices;
create policy ma5_prices_staff_write
on public.ma5_prices for all
to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

-- ---------------------------------------------------------------------------
-- Ledger (webhook-owned; service role writes)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null unique,
  user_id uuid references public.ma5_profiles (id) on delete set null,
  product_id uuid references public.ma5_products (id) on delete set null,
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
  updated_at timestamptz not null default now()
);

create index if not exists ma5_checkout_sessions_user_idx
  on public.ma5_checkout_sessions (user_id, created_at desc);

create table if not exists public.ma5_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.ma5_profiles (id) on delete set null,
  product_id uuid references public.ma5_products (id) on delete set null,
  checkout_session_id uuid references public.ma5_checkout_sessions (id) on delete set null,
  stripe_payment_intent_id text unique,
  stripe_charge_id text,
  stripe_invoice_id text,
  amount_cents int not null default 0,
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'refunded', 'partially_refunded')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ma5_payments_user_idx
  on public.ma5_payments (user_id, created_at desc);

create table if not exists public.ma5_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  product_id uuid references public.ma5_products (id) on delete set null,
  price_id uuid references public.ma5_prices (id) on delete set null,
  stripe_subscription_id text not null unique,
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
  updated_at timestamptz not null default now()
);

create index if not exists ma5_subscriptions_user_idx
  on public.ma5_subscriptions (user_id, created_at desc);

create table if not exists public.ma5_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.ma5_profiles (id) on delete set null,
  subscription_id uuid references public.ma5_subscriptions (id) on delete set null,
  stripe_invoice_id text not null unique,
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
  updated_at timestamptz not null default now()
);

create table if not exists public.ma5_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.ma5_payments (id) on delete set null,
  stripe_refund_id text not null unique,
  stripe_charge_id text,
  amount_cents int not null default 0,
  currency text not null default 'usd',
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'canceled')),
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists ma5_checkout_sessions_set_updated_at on public.ma5_checkout_sessions;
create trigger ma5_checkout_sessions_set_updated_at
before update on public.ma5_checkout_sessions
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_payments_set_updated_at on public.ma5_payments;
create trigger ma5_payments_set_updated_at
before update on public.ma5_payments
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_subscriptions_set_updated_at on public.ma5_subscriptions;
create trigger ma5_subscriptions_set_updated_at
before update on public.ma5_subscriptions
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_invoices_set_updated_at on public.ma5_invoices;
create trigger ma5_invoices_set_updated_at
before update on public.ma5_invoices
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_refunds_set_updated_at on public.ma5_refunds;
create trigger ma5_refunds_set_updated_at
before update on public.ma5_refunds
for each row execute function public.ma5_set_updated_at();

alter table public.ma5_checkout_sessions enable row level security;
alter table public.ma5_payments enable row level security;
alter table public.ma5_subscriptions enable row level security;
alter table public.ma5_invoices enable row level security;
alter table public.ma5_refunds enable row level security;

-- Clients can read their own ledger rows; staff can read all. Writes via service role.
drop policy if exists ma5_checkout_sessions_select on public.ma5_checkout_sessions;
create policy ma5_checkout_sessions_select
on public.ma5_checkout_sessions for select
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_payments_select on public.ma5_payments;
create policy ma5_payments_select
on public.ma5_payments for select
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_subscriptions_select on public.ma5_subscriptions;
create policy ma5_subscriptions_select
on public.ma5_subscriptions for select
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_invoices_select on public.ma5_invoices;
create policy ma5_invoices_select
on public.ma5_invoices for select
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_refunds_select on public.ma5_refunds;
create policy ma5_refunds_select
on public.ma5_refunds for select
to authenticated
using (
  public.ma5_is_staff()
  or exists (
    select 1 from public.ma5_payments p
    where p.id = payment_id and p.user_id = auth.uid()
  )
);

-- ---------------------------------------------------------------------------
-- Seed Mindbody catalog (no Stripe IDs — admin sync creates them)
-- ---------------------------------------------------------------------------

insert into public.ma5_products (
  slug, name, description, product_type, category, payment_type,
  price_cents, currency, billing_interval, session_credits,
  status, active, display_order
)
values
  ('sg-14', '14x a month', 'Month-to-month packages with recurring billing.', 'membership', 'small_group', 'subscription', 22000, 'usd', 'month', 14, 'active', true, 10),
  ('sg-12', '12x a month', 'Month-to-month packages with recurring billing.', 'membership', 'small_group', 'subscription', 19000, 'usd', 'month', 12, 'active', true, 20),
  ('sg-8', '8x a month', 'Month-to-month packages with recurring billing.', 'membership', 'small_group', 'subscription', 15000, 'usd', 'month', 8, 'active', true, 30),
  ('sg-4', '4x a month', 'Month-to-month packages with recurring billing.', 'membership', 'small_group', 'subscription', 10000, 'usd', 'month', 4, 'active', true, 40),
  ('sg-drop-in', 'HIIT Drop-in', 'Single-session small group drop-in.', 'drop_in', 'small_group', 'one_time', 3000, 'usd', 'one_time', 1, 'active', true, 50),
  ('sg-couples', 'Couples — 2x a week (6 month)', 'Couples discount package billed monthly.', 'membership', 'small_group', 'subscription', 35000, 'usd', 'month', null, 'active', true, 60),
  ('og-standard', 'Open Gym', 'Open gym memberships are month-to-month.', 'membership', 'open_gym', 'subscription', 6500, 'usd', 'month', null, 'active', true, 70),
  ('og-household', 'Same household (non-member)', 'Open gym household rate.', 'membership', 'open_gym', 'subscription', 5000, 'usd', 'month', null, 'active', true, 80),
  ('og-small-group', 'Small group member add-on', 'Open gym add-on for small group members.', 'addon', 'open_gym', 'subscription', 4500, 'usd', 'month', null, 'active', true, 90),
  ('og-semi-private', 'Semi-private member add-on', 'Open gym add-on for semi-private members.', 'addon', 'open_gym', 'subscription', 2500, 'usd', 'month', null, 'active', true, 100)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  product_type = excluded.product_type,
  category = excluded.category,
  payment_type = excluded.payment_type,
  price_cents = excluded.price_cents,
  billing_interval = excluded.billing_interval,
  session_credits = excluded.session_credits,
  display_order = excluded.display_order,
  status = coalesce(public.ma5_products.status, excluded.status),
  updated_at = now();

insert into public.ma5_prices (
  product_id, stripe_price_id, amount_cents, currency, billing_interval, active, effective_at
)
select
  p.id,
  p.current_stripe_price_id,
  p.price_cents,
  p.currency,
  p.billing_interval,
  true,
  now()
from public.ma5_products p
where not exists (
  select 1 from public.ma5_prices pr where pr.product_id = p.id and pr.active = true
);

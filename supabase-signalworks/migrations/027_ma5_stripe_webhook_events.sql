-- MA5 → Signal Works destination migration 027
-- Stripe webhook idempotency ledger (empty at bootstrap).
--
-- Target: Signal Works shared Supabase only.
-- Prerequisites:
--   024_ma5_tenant_registration
--   025_ma5_locations_bootstrap
--   026_ma5_tenant_scoped_schema (+ 026b hygiene recommended)
--
-- D-15: dedup unique(stripe_account_id, stripe_event_id)
-- D-19: tenant_id set from deployment config at insert (service_role webhook handler)
-- RLS: enabled with no policies here; service_role only until 029
--
-- Verify after apply:
--   select count(*) from information_schema.tables
--   where table_schema = 'public' and table_name = 'ma5_stripe_webhook_events';
--   -- expect 1

begin;

-- ---------------------------------------------------------------------------
-- Prerequisites
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from public.tenants where slug = 'ma5-performance') then
    raise exception 'tenant ma5-performance is missing — apply 024 first';
  end if;

  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ma5_profiles'
  ) then
    raise exception 'ma5_profiles is missing — apply 026 before 027';
  end if;

  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ma5_stripe_webhook_events'
  ) then
    raise exception 'ma5_stripe_webhook_events already exists — 027 is greenfield only';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- ma5_stripe_webhook_events
-- ---------------------------------------------------------------------------

create table public.ma5_stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  stripe_account_id text not null,
  stripe_event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload_hash text,
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  unique (stripe_account_id, stripe_event_id),
  constraint ma5_stripe_webhook_events_stripe_account_id_check
    check (stripe_account_id ~ '^acct_'),
  constraint ma5_stripe_webhook_events_stripe_event_id_check
    check (stripe_event_id ~ '^evt_')
);

create index ma5_stripe_webhook_events_tenant_idx
  on public.ma5_stripe_webhook_events (tenant_id);

create index ma5_stripe_webhook_events_tenant_processed_idx
  on public.ma5_stripe_webhook_events (tenant_id, processed_at desc);

create index ma5_stripe_webhook_events_event_type_idx
  on public.ma5_stripe_webhook_events (tenant_id, event_type, processed_at desc);

comment on table public.ma5_stripe_webhook_events is
  'Idempotent Stripe webhook processing log. tenant_id from MA5 deployment config at insert; dedup on (stripe_account_id, stripe_event_id).';

comment on column public.ma5_stripe_webhook_events.payload_hash is
  'Optional SHA-256 of raw event JSON for replay/audit without storing full payload.';

-- ---------------------------------------------------------------------------
-- RLS (policies deferred to 029 — service_role bypasses)
-- ---------------------------------------------------------------------------

alter table public.ma5_stripe_webhook_events enable row level security;

grant select, insert, update, delete on public.ma5_stripe_webhook_events to authenticated;
grant all on public.ma5_stripe_webhook_events to service_role;

-- ---------------------------------------------------------------------------
-- Validation
-- ---------------------------------------------------------------------------

do $$
declare
  tenant_id_nullable text;
  dedup_exists boolean;
  tenant_id_uidx_exists boolean;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ma5_stripe_webhook_events'
  ) then
    raise exception 'ma5_stripe_webhook_events was not created';
  end if;

  select c.is_nullable into tenant_id_nullable
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'ma5_stripe_webhook_events'
    and c.column_name = 'tenant_id';

  if tenant_id_nullable <> 'NO' then
    raise exception 'ma5_stripe_webhook_events.tenant_id must be NOT NULL';
  end if;

  select exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'ma5_stripe_webhook_events'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) like '%stripe_account_id%'
      and pg_get_constraintdef(c.oid) like '%stripe_event_id%'
  ) into dedup_exists;

  if not dedup_exists then
    raise exception 'unique(stripe_account_id, stripe_event_id) is missing';
  end if;

  select exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'ma5_stripe_webhook_events'
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) like '%tenant_id%'
      and pg_get_constraintdef(c.oid) like '%id%'
  ) into tenant_id_uidx_exists;

  if not tenant_id_uidx_exists then
    raise exception 'unique(tenant_id, id) is missing on ma5_stripe_webhook_events';
  end if;
end
$$;

commit;

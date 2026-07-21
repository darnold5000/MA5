-- Historical payment imports (Mindbody) + processing fee tracking.

alter table public.ma5_payments
  add column if not exists processing_fee_cents int not null default 0,
  add column if not exists net_amount_cents int,
  add column if not exists payment_method_type text,
  add column if not exists import_source text
    check (import_source is null or import_source in ('stripe', 'mindbody')),
  add column if not exists external_payment_id text;

-- Non-partial index required for PostgREST upsert / ON CONFLICT (external_payment_id).
create unique index if not exists ma5_payments_external_payment_id_uidx
  on public.ma5_payments (external_payment_id);

create index if not exists ma5_payments_import_source_idx
  on public.ma5_payments (import_source, created_at desc);

create index if not exists ma5_payments_method_type_idx
  on public.ma5_payments (payment_method_type)
  where payment_method_type is not null;

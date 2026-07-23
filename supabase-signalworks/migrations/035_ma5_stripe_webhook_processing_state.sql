-- MA5 → Signal Works migration 035
-- Webhook ledger processing state (retry-safe dedup).
--
-- Prerequisite: 027_ma5_stripe_webhook_events
--
-- Problem: processed_at defaulted on insert, so failed handlers looked complete
-- on Stripe retry. This adds explicit processing_status and nullable processed_at.
--
-- Verify:
--   select column_name, is_nullable, column_default
--   from information_schema.columns
--   where table_name = 'ma5_stripe_webhook_events'
--     and column_name in ('processing_status', 'processed_at', 'claimed_at');
--   select conname from pg_constraint
--   where conrelid = 'public.ma5_stripe_webhook_events'::regclass
--     and conname like '%processing%';

begin;

do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ma5_stripe_webhook_events'
  ) then
    raise exception 'ma5_stripe_webhook_events is missing — apply 027 first';
  end if;
end
$$;

alter table public.ma5_stripe_webhook_events
  add column if not exists processing_status text,
  add column if not exists claimed_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists last_error text;

-- Backfill rows created under 027 (processed_at set at insert time).
update public.ma5_stripe_webhook_events
set processing_status = 'completed'
where processing_status is null
  and processed_at is not null;

update public.ma5_stripe_webhook_events
set processing_status = 'failed',
    failed_at = coalesce(failed_at, processed_at, created_at)
where processing_status is null;

alter table public.ma5_stripe_webhook_events
  alter column processed_at drop default;

alter table public.ma5_stripe_webhook_events
  alter column processed_at drop not null;

alter table public.ma5_stripe_webhook_events
  alter column processing_status set not null;

alter table public.ma5_stripe_webhook_events
  alter column processing_status set default 'processing';

alter table public.ma5_stripe_webhook_events
  drop constraint if exists ma5_stripe_webhook_events_processing_status_check;

alter table public.ma5_stripe_webhook_events
  add constraint ma5_stripe_webhook_events_processing_status_check
  check (processing_status in ('processing', 'completed', 'failed'));

alter table public.ma5_stripe_webhook_events
  drop constraint if exists ma5_stripe_webhook_events_processing_timestamps_check;

alter table public.ma5_stripe_webhook_events
  add constraint ma5_stripe_webhook_events_processing_timestamps_check
  check (
    (processing_status = 'processing'
      and claimed_at is not null
      and processed_at is null
      and failed_at is null)
    or
    (processing_status = 'completed'
      and processed_at is not null)
    or
    (processing_status = 'failed'
      and failed_at is not null
      and processed_at is null)
  );

create index if not exists ma5_stripe_webhook_events_status_idx
  on public.ma5_stripe_webhook_events (tenant_id, processing_status, claimed_at desc);

comment on column public.ma5_stripe_webhook_events.processing_status is
  'processing = claim held; completed = handler succeeded; failed = handler error (retryable).';

comment on column public.ma5_stripe_webhook_events.processed_at is
  'Set only when processing_status = completed.';

comment on column public.ma5_stripe_webhook_events.claimed_at is
  'When the current processing claim started; used to detect stale claims.';

commit;

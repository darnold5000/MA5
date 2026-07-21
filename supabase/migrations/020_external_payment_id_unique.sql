-- Partial unique indexes cannot be used by PostgREST upsert (ON CONFLICT column list).
-- Replace with a standard unique index; PostgreSQL allows multiple NULL values.

drop index if exists public.ma5_payments_external_payment_id_uidx;

create unique index ma5_payments_external_payment_id_uidx
  on public.ma5_payments (external_payment_id);

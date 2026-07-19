-- Archive offerings in place (never delete rows). Preserve Stripe objects for
-- existing subscribers; archiving only hides from storefront / new checkout.

alter table public.ma5_products
  add column if not exists archived_at timestamptz;

comment on column public.ma5_products.archived_at is
  'Set when status becomes archived. Cleared when reactivated. Row is never deleted.';

create or replace function public.ma5_products_sync_active()
returns trigger
language plpgsql
as $$
begin
  new.active := (new.status = 'active');

  if new.status = 'archived'
    and (tg_op = 'INSERT' or old.status is distinct from 'archived')
  then
    new.archived_at := coalesce(new.archived_at, now());
  elsif new.status <> 'archived' then
    new.archived_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

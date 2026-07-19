-- ma5_products.stripe_price_id is legacy from 002.
-- Authoritative current price pointer is current_stripe_price_id;
-- historical Stripe Price IDs live in ma5_prices.

update public.ma5_products
set current_stripe_price_id = coalesce(current_stripe_price_id, stripe_price_id)
where current_stripe_price_id is null
  and stripe_price_id is not null;

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

alter table public.ma5_products
  drop column if exists stripe_price_id;

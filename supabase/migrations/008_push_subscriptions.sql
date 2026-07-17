-- MA5 Web Push subscriptions (PWA Phase 1).
-- Standards-based Push API only — no FCM / OneSignal / SMS.
-- Still single-facility / not multi-tenant (no facility_id).

create table if not exists public.ma5_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists ma5_push_subscriptions_user_idx
  on public.ma5_push_subscriptions (user_id);

drop trigger if exists ma5_push_subscriptions_set_updated_at on public.ma5_push_subscriptions;
create trigger ma5_push_subscriptions_set_updated_at
before update on public.ma5_push_subscriptions
for each row execute function public.ma5_set_updated_at();

alter table public.ma5_push_subscriptions enable row level security;

-- Users manage only their own subscriptions
drop policy if exists ma5_push_subscriptions_select_own on public.ma5_push_subscriptions;
create policy ma5_push_subscriptions_select_own
on public.ma5_push_subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists ma5_push_subscriptions_insert_own on public.ma5_push_subscriptions;
create policy ma5_push_subscriptions_insert_own
on public.ma5_push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists ma5_push_subscriptions_update_own on public.ma5_push_subscriptions;
create policy ma5_push_subscriptions_update_own
on public.ma5_push_subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ma5_push_subscriptions_delete_own on public.ma5_push_subscriptions;
create policy ma5_push_subscriptions_delete_own
on public.ma5_push_subscriptions
for delete
to authenticated
using (user_id = auth.uid());

-- Staff may read (ops / debugging) but not mutate others' endpoints
drop policy if exists ma5_push_subscriptions_select_staff on public.ma5_push_subscriptions;
create policy ma5_push_subscriptions_select_staff
on public.ma5_push_subscriptions
for select
to authenticated
using (public.ma5_is_staff());

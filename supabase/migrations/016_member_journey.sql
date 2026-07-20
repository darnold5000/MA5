-- MA5 member journey: fitness goals and progress photos (MVP).

create table if not exists public.ma5_member_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  target_date date,
  status text not null default 'active'
    check (status in ('active', 'completed')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ma5_member_goals_user_idx
  on public.ma5_member_goals (user_id, created_at desc);

create table if not exists public.ma5_progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  storage_path text not null,
  caption text,
  taken_at timestamptz not null default now(),
  -- Reserved for before/after pairs and comparison viewer.
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ma5_progress_photos_user_idx
  on public.ma5_progress_photos (user_id, taken_at desc);

drop trigger if exists ma5_member_goals_set_updated_at on public.ma5_member_goals;
create trigger ma5_member_goals_set_updated_at
before update on public.ma5_member_goals
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_progress_photos_set_updated_at on public.ma5_progress_photos;
create trigger ma5_progress_photos_set_updated_at
before update on public.ma5_progress_photos
for each row execute function public.ma5_set_updated_at();

alter table public.ma5_member_goals enable row level security;
alter table public.ma5_progress_photos enable row level security;

drop policy if exists ma5_member_goals_select on public.ma5_member_goals;
create policy ma5_member_goals_select
on public.ma5_member_goals for select
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_member_goals_insert on public.ma5_member_goals;
create policy ma5_member_goals_insert
on public.ma5_member_goals for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists ma5_member_goals_update on public.ma5_member_goals;
create policy ma5_member_goals_update
on public.ma5_member_goals for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ma5_member_goals_delete on public.ma5_member_goals;
create policy ma5_member_goals_delete
on public.ma5_member_goals for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists ma5_progress_photos_select on public.ma5_progress_photos;
create policy ma5_progress_photos_select
on public.ma5_progress_photos for select
to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_progress_photos_insert on public.ma5_progress_photos;
create policy ma5_progress_photos_insert
on public.ma5_progress_photos for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists ma5_progress_photos_update on public.ma5_progress_photos;
create policy ma5_progress_photos_update
on public.ma5_progress_photos for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists ma5_progress_photos_delete on public.ma5_progress_photos;
create policy ma5_progress_photos_delete
on public.ma5_progress_photos for delete
to authenticated
using (user_id = auth.uid());

-- Private storage for progress photos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ma5-member-journey',
  'ma5-member-journey',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists ma5_journey_photos_insert on storage.objects;
create policy ma5_journey_photos_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'ma5-member-journey'
  and (storage.foldername(name))[1] = 'journey'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists ma5_journey_photos_select on storage.objects;
create policy ma5_journey_photos_select
on storage.objects for select to authenticated
using (
  bucket_id = 'ma5-member-journey'
  and (storage.foldername(name))[1] = 'journey'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists ma5_journey_photos_update on storage.objects;
create policy ma5_journey_photos_update
on storage.objects for update to authenticated
using (
  bucket_id = 'ma5-member-journey'
  and (storage.foldername(name))[1] = 'journey'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'ma5-member-journey'
  and (storage.foldername(name))[1] = 'journey'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists ma5_journey_photos_delete on storage.objects;
create policy ma5_journey_photos_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'ma5-member-journey'
  and (storage.foldername(name))[1] = 'journey'
  and (storage.foldername(name))[2] = auth.uid()::text
);

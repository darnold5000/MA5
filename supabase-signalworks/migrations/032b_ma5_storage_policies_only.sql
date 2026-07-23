-- MA5 → Signal Works destination migration 032b
-- RECOVERY ONLY: use when 032 failed or rolled back before policies committed.
-- **Never apply if 032 (or this file) already succeeded** — you would duplicate work.
--
-- Self-contained: helpers + buckets + policies (no transaction).
-- Prefer revised 032 for greenfield applies.
--
-- If you already applied an earlier 032b with unsafe ::uuid cast, run 032c instead.
--
-- Verify after apply:
--   select count(*) from storage.buckets where id like 'ma5-%';  -- 3
--   select to_regprocedure('public.ma5_storage_path_tenant_id(text)');  -- not null
--   select count(*) from pg_policies
--   where schemaname = 'storage' and tablename = 'objects' and policyname like 'ma5_%';  -- 13

do $$
begin
  if to_regprocedure('public.ma5_is_tenant_member(uuid)') is null then
    raise exception 'ma5_is_tenant_member is missing — apply 028 first';
  end if;

  if to_regprocedure('public.ma5_is_public_tenant_row(uuid)') is null then
    raise exception 'ma5_is_public_tenant_row is missing — apply 029 first';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Path helpers
-- ---------------------------------------------------------------------------

create or replace function public.ma5_storage_path_tenant_id(object_name text)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  parts text[];
begin
  parts := storage.foldername(object_name);
  if parts is null or coalesce(array_length(parts, 1), 0) < 1 then
    return null;
  end if;

  begin
    return parts[1]::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;
end;
$$;

create or replace function public.ma5_storage_path_segment(
  object_name text,
  segment_idx integer
)
returns text
language sql
stable
set search_path = public
as $$
  select (storage.foldername(object_name))[segment_idx];
$$;

create or replace function public.ma5_storage_path_segment_uuid(
  object_name text,
  segment_idx integer
)
returns uuid
language plpgsql
stable
set search_path = public
as $$
declare
  segment text;
begin
  segment := public.ma5_storage_path_segment(object_name, segment_idx);
  if segment is null then
    return null;
  end if;

  begin
    return segment::uuid;
  exception
    when invalid_text_representation then
      return null;
  end;
end;
$$;

revoke all on function public.ma5_storage_path_tenant_id(text) from public;
revoke all on function public.ma5_storage_path_segment(text, integer) from public;
revoke all on function public.ma5_storage_path_segment_uuid(text, integer) from public;

grant execute on function public.ma5_storage_path_tenant_id(text) to anon, authenticated, service_role;
grant execute on function public.ma5_storage_path_segment(text, integer) to anon, authenticated, service_role;
grant execute on function public.ma5_storage_path_segment_uuid(text, integer) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ma5-brand-assets',
  'ma5-brand-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ma5-exercise-videos',
  'ma5-exercise-videos',
  false,
  524288000,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ma5-member-journey',
  'ma5-member-journey',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- ma5-brand-assets
-- ---------------------------------------------------------------------------

drop policy if exists ma5_brand_assets_select_public on storage.objects;
create policy ma5_brand_assets_select_public
on storage.objects
for select
to anon
using (
  bucket_id = 'ma5-brand-assets'
  and public.ma5_storage_path_segment(name, 2) = 'brand'
  and public.ma5_is_public_tenant_row(public.ma5_storage_path_tenant_id(name))
);

drop policy if exists ma5_brand_assets_select_member on storage.objects;
create policy ma5_brand_assets_select_member
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ma5-brand-assets'
  and public.ma5_storage_path_segment(name, 2) = 'brand'
  and public.ma5_is_tenant_member(public.ma5_storage_path_tenant_id(name))
);

drop policy if exists ma5_brand_assets_avatar_insert on storage.objects;
create policy ma5_brand_assets_avatar_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ma5-brand-assets'
  and public.ma5_storage_path_segment(name, 2) = 'brand'
  and public.ma5_storage_path_segment(name, 3) = 'avatar'
  and public.ma5_storage_path_segment(name, 4) = auth.uid()::text
  and public.ma5_is_tenant_member(public.ma5_storage_path_tenant_id(name))
);

drop policy if exists ma5_brand_assets_avatar_update on storage.objects;
create policy ma5_brand_assets_avatar_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ma5-brand-assets'
  and public.ma5_storage_path_segment(name, 2) = 'brand'
  and public.ma5_storage_path_segment(name, 3) = 'avatar'
  and public.ma5_storage_path_segment(name, 4) = auth.uid()::text
  and public.ma5_is_tenant_member(public.ma5_storage_path_tenant_id(name))
)
with check (
  bucket_id = 'ma5-brand-assets'
  and public.ma5_storage_path_segment(name, 2) = 'brand'
  and public.ma5_storage_path_segment(name, 3) = 'avatar'
  and public.ma5_storage_path_segment(name, 4) = auth.uid()::text
  and public.ma5_is_tenant_member(public.ma5_storage_path_tenant_id(name))
);

drop policy if exists ma5_brand_assets_avatar_delete on storage.objects;
create policy ma5_brand_assets_avatar_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ma5-brand-assets'
  and public.ma5_storage_path_segment(name, 2) = 'brand'
  and public.ma5_storage_path_segment(name, 3) = 'avatar'
  and public.ma5_storage_path_segment(name, 4) = auth.uid()::text
  and public.ma5_is_tenant_member(public.ma5_storage_path_tenant_id(name))
);

drop policy if exists ma5_brand_assets_staff_write on storage.objects;
create policy ma5_brand_assets_staff_write
on storage.objects
for all
to authenticated
using (
  bucket_id = 'ma5-brand-assets'
  and public.ma5_storage_path_segment(name, 2) = 'brand'
  and public.ma5_storage_path_segment(name, 3) in ('logo', 'marketing')
  and public.ma5_is_tenant_staff(public.ma5_storage_path_tenant_id(name))
)
with check (
  bucket_id = 'ma5-brand-assets'
  and public.ma5_storage_path_segment(name, 2) = 'brand'
  and public.ma5_storage_path_segment(name, 3) in ('logo', 'marketing')
  and public.ma5_is_tenant_staff(public.ma5_storage_path_tenant_id(name))
);

-- ---------------------------------------------------------------------------
-- ma5-exercise-videos
-- ---------------------------------------------------------------------------

drop policy if exists ma5_exercise_videos_staff_write on storage.objects;
create policy ma5_exercise_videos_staff_write
on storage.objects
for all
to authenticated
using (
  bucket_id = 'ma5-exercise-videos'
  and public.ma5_storage_path_segment(name, 2) = 'exercises'
  and public.ma5_is_tenant_staff(public.ma5_storage_path_tenant_id(name))
)
with check (
  bucket_id = 'ma5-exercise-videos'
  and public.ma5_storage_path_segment(name, 2) = 'exercises'
  and public.ma5_is_tenant_staff(public.ma5_storage_path_tenant_id(name))
);

drop policy if exists ma5_exercise_videos_select_assigned on storage.objects;
create policy ma5_exercise_videos_select_assigned
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ma5-exercise-videos'
  and public.ma5_storage_path_segment(name, 2) = 'exercises'
  and public.ma5_storage_path_segment_uuid(name, 3) is not null
  and public.ma5_client_can_read_exercise(
    public.ma5_storage_path_tenant_id(name),
    public.ma5_storage_path_segment_uuid(name, 3)
  )
);

-- ---------------------------------------------------------------------------
-- ma5-member-journey
-- ---------------------------------------------------------------------------

drop policy if exists ma5_member_journey_own_insert on storage.objects;
create policy ma5_member_journey_own_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'ma5-member-journey'
  and public.ma5_storage_path_segment(name, 2) = 'members'
  and public.ma5_storage_path_segment(name, 3) = auth.uid()::text
  and public.ma5_is_tenant_member(public.ma5_storage_path_tenant_id(name))
);

drop policy if exists ma5_member_journey_own_select on storage.objects;
create policy ma5_member_journey_own_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ma5-member-journey'
  and public.ma5_storage_path_segment(name, 2) = 'members'
  and public.ma5_storage_path_segment(name, 3) = auth.uid()::text
  and public.ma5_is_tenant_member(public.ma5_storage_path_tenant_id(name))
);

drop policy if exists ma5_member_journey_own_update on storage.objects;
create policy ma5_member_journey_own_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'ma5-member-journey'
  and public.ma5_storage_path_segment(name, 2) = 'members'
  and public.ma5_storage_path_segment(name, 3) = auth.uid()::text
  and public.ma5_is_tenant_member(public.ma5_storage_path_tenant_id(name))
)
with check (
  bucket_id = 'ma5-member-journey'
  and public.ma5_storage_path_segment(name, 2) = 'members'
  and public.ma5_storage_path_segment(name, 3) = auth.uid()::text
  and public.ma5_is_tenant_member(public.ma5_storage_path_tenant_id(name))
);

drop policy if exists ma5_member_journey_own_delete on storage.objects;
create policy ma5_member_journey_own_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'ma5-member-journey'
  and public.ma5_storage_path_segment(name, 2) = 'members'
  and public.ma5_storage_path_segment(name, 3) = auth.uid()::text
  and public.ma5_is_tenant_member(public.ma5_storage_path_tenant_id(name))
);

drop policy if exists ma5_member_journey_staff_select on storage.objects;
create policy ma5_member_journey_staff_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'ma5-member-journey'
  and public.ma5_storage_path_segment(name, 2) = 'members'
  and public.ma5_is_tenant_staff(public.ma5_storage_path_tenant_id(name))
);

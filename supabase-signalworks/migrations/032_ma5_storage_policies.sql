-- MA5 → Signal Works destination migration 032
-- Storage buckets + tenant-prefixed RLS on storage.objects.
--
-- Greenfield apply path. If 032 failed/rolled back, use 032b instead — never both.
-- If 032b was applied before the safe-UUID revision, run 032c.
--
-- Target: Signal Works shared Supabase only.
-- Prerequisites:
--   028_ma5_rls_helpers
--   029_ma5_rls_policies
--
-- Path conventions (ADR 0004, 07-storage-migration-plan.md):
--   ma5-brand-assets:    {tenant_id}/brand/{resource_type}/{resource_id}/{file}
--   ma5-exercise-videos: {tenant_id}/exercises/{exercise_id}/{file}
--   ma5-member-journey:  {tenant_id}/members/{user_id}/{file}
--
-- Hobby paths (avatars/, logos/, journey/, etc.) are NOT permitted on destination.
-- Application path builders update in app cutover (phase C).
--
-- Verify after apply:
--   select id, public from storage.buckets where id like 'ma5-%' order by 1;
--   select policyname from pg_policies
--   where schemaname = 'storage' and tablename = 'objects'
--     and policyname like 'ma5_%'
--   order by 1;

begin;

-- ---------------------------------------------------------------------------
-- Prerequisites
-- ---------------------------------------------------------------------------

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

comment on function public.ma5_storage_path_tenant_id(text) is
  'First path segment must be tenant UUID (ADR 0004).';

comment on function public.ma5_storage_path_segment_uuid(text, integer) is
  'Safe UUID parse for a storage path segment; returns null on malformed input.';

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
-- ma5-brand-assets ({tenant_id}/brand/{resource_type}/{resource_id}/{file})
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
-- ma5-exercise-videos ({tenant_id}/exercises/{exercise_id}/{file})
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
-- ma5-member-journey ({tenant_id}/members/{user_id}/{file})
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

-- ---------------------------------------------------------------------------
-- Validation (buckets + helpers only — policy count verified after COMMIT)
-- ---------------------------------------------------------------------------

do $$
declare
  bucket_count integer;
begin
  select count(*) into bucket_count
  from storage.buckets
  where id in (
    'ma5-brand-assets',
    'ma5-exercise-videos',
    'ma5-member-journey'
  );

  if bucket_count <> 3 then
    raise exception 'expected 3 ma5 storage buckets, found %', bucket_count;
  end if;

  if to_regprocedure('public.ma5_storage_path_tenant_id(text)') is null then
    raise exception 'ma5_storage_path_tenant_id helper missing';
  end if;
end
$$;

commit;

-- Run after commit (separate statement in SQL editor):
--   select count(*) from pg_policies
--   where schemaname = 'storage' and tablename = 'objects' and policyname like 'ma5_%';
-- If 0, apply 032b_ma5_storage_policies_only.sql

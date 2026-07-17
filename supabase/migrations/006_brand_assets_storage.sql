-- Brand assets storage + facility logo path. Additive only.

alter table public.ma5_facility_settings
  add column if not exists logo_storage_path text;

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

-- Avatars: users manage their own folder
drop policy if exists ma5_brand_assets_avatar_upload on storage.objects;
create policy ma5_brand_assets_avatar_upload
on storage.objects for insert to authenticated
with check (
  bucket_id = 'ma5-brand-assets'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists ma5_brand_assets_avatar_update on storage.objects;
create policy ma5_brand_assets_avatar_update
on storage.objects for update to authenticated
using (
  bucket_id = 'ma5-brand-assets'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
)
with check (
  bucket_id = 'ma5-brand-assets'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

drop policy if exists ma5_brand_assets_avatar_delete on storage.objects;
create policy ma5_brand_assets_avatar_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'ma5-brand-assets'
  and (storage.foldername(name))[1] = 'avatars'
  and (storage.foldername(name))[2] = auth.uid()::text
);

-- Logos: staff only
drop policy if exists ma5_brand_assets_logo_staff on storage.objects;
create policy ma5_brand_assets_logo_staff
on storage.objects for all to authenticated
using (
  bucket_id = 'ma5-brand-assets'
  and (storage.foldername(name))[1] = 'logos'
  and public.ma5_is_staff()
)
with check (
  bucket_id = 'ma5-brand-assets'
  and (storage.foldername(name))[1] = 'logos'
  and public.ma5_is_staff()
);

-- Public read (bucket is public; policy still required for authenticated clients)
drop policy if exists ma5_brand_assets_public_read on storage.objects;
create policy ma5_brand_assets_public_read
on storage.objects for select
to public
using (bucket_id = 'ma5-brand-assets');

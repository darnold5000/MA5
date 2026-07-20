-- Public marketing gallery: transformations and community photos.

create table if not exists public.ma5_marketing_gallery (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('transformations', 'community')),
  storage_path text not null,
  alt_text text not null default '',
  client_name text,
  sort_order integer not null default 0,
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ma5_marketing_gallery_section_idx
  on public.ma5_marketing_gallery (section, sort_order asc, created_at desc);

drop trigger if exists ma5_marketing_gallery_set_updated_at on public.ma5_marketing_gallery;
create trigger ma5_marketing_gallery_set_updated_at
before update on public.ma5_marketing_gallery
for each row execute function public.ma5_set_updated_at();

alter table public.ma5_marketing_gallery enable row level security;

drop policy if exists ma5_marketing_gallery_public_read on public.ma5_marketing_gallery;
create policy ma5_marketing_gallery_public_read
on public.ma5_marketing_gallery for select
to public
using (true);

drop policy if exists ma5_marketing_gallery_staff_write on public.ma5_marketing_gallery;
create policy ma5_marketing_gallery_staff_write
on public.ma5_marketing_gallery for all
to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

-- Marketing images in the public brand-assets bucket (staff-managed).
drop policy if exists ma5_brand_assets_marketing_staff on storage.objects;
create policy ma5_brand_assets_marketing_staff
on storage.objects for all to authenticated
using (
  bucket_id = 'ma5-brand-assets'
  and (storage.foldername(name))[1] = 'marketing'
  and public.ma5_is_staff()
)
with check (
  bucket_id = 'ma5-brand-assets'
  and (storage.foldername(name))[1] = 'marketing'
  and public.ma5_is_staff()
);

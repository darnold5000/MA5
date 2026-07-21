-- Placement slots for Our Community page photos (hero + event sections).

alter table public.ma5_marketing_gallery
  add column if not exists placement text;

alter table public.ma5_marketing_gallery
  drop constraint if exists ma5_marketing_gallery_placement_check;

alter table public.ma5_marketing_gallery
  add constraint ma5_marketing_gallery_placement_check
  check (
    placement is null
    or placement in (
      'hero',
      'fathers-heart',
      'gatlinburg',
      'breakfast-barbells',
      'blended-church',
      'pinheads-bowling'
    )
  );

create index if not exists ma5_marketing_gallery_placement_idx
  on public.ma5_marketing_gallery (section, placement)
  where placement is not null;

comment on column public.ma5_marketing_gallery.placement is
  'Our Community page slot: hero or named event section. Null for transformations or unassigned community photos.';

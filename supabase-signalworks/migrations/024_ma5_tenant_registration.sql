-- MA5 → Signal Works destination migration 024
-- Register MA5 Performance in shared public.tenants (idempotent).
--
-- Target: Signal Works shared Supabase only.
-- Do NOT apply MA5/supabase/migrations/001-023 to this database.
--
-- Prerequisites: signalworks-platform/core + signalworks-clients foundation migrations.
--
-- Applied 2026-07-23. Confirmed tenant UUID (slug ma5-performance):
--   d71ada88-8fad-466f-9264-3a479d54d6e2
-- Set MA5_TENANT_ID in deployment env. See docs/migration/RUNBOOK.md.
--
-- Re-run safe (idempotent upsert on slug). Verify:
--   select id from public.tenants where slug = 'ma5-performance';

insert into public.tenants (
  slug,
  display_name,
  status,
  platform_category
)
values (
  'ma5-performance',
  'MA5 Performance',
  'active',
  'services'
)
on conflict (slug) do update
set
  display_name = excluded.display_name,
  status = excluded.status,
  platform_category = excluded.platform_category,
  updated_at = now()
returning id;

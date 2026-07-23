# MA5 Signal Works Migration — Runbook

Operational record for destination bootstrap. Not a substitute for [11-open-decisions.md](./11-open-decisions.md) authorization gates.

## Confirmed tenant (migration 024 applied)

| Field | Value |
|-------|-------|
| **Slug** | `ma5-performance` |
| **Display name** | MA5 Performance |
| **Tenant UUID** | `d71ada88-8fad-466f-9264-3a479d54d6e2` |
| **Migration** | `MA5/supabase-signalworks/migrations/024_ma5_tenant_registration.sql` |
| **Applied** | 2026-07-23 |

### Deployment env

```bash
MA5_TENANT_ID=d71ada88-8fad-466f-9264-3a479d54d6e2
```

Transitional until `tenant_domains` hostname resolution is live (D-17).

---

## Confirmed default location (migration 025 applied)

| Field | Value |
|-------|-------|
| **Slug** | `main` |
| **Name** | MA5 Performance |
| **Location UUID** | `ac85a800-91cc-4ba5-a42c-9b55eac4653a` |
| **Timezone (target)** | `America/Indiana/Indianapolis` |
| **Migration** | `MA5/supabase-signalworks/migrations/025_ma5_locations_bootstrap.sql` |
| **Applied** | 2026-07-23 |

### Reference env (optional — for scripts / 026 bootstrap)

```bash
MA5_LOCATION_ID=ac85a800-91cc-4ba5-a42c-9b55eac4653a
```

### Verify in database

```sql
select id, slug, name, timezone
from public.ma5_locations
where tenant_id = 'd71ada88-8fad-466f-9264-3a479d54d6e2'
  and slug = 'main';
```

### Timezone correction (if first apply used `America/New_York`)

Re-run the bootstrap `insert … on conflict` from `025` (idempotent), or:

```sql
update public.ma5_locations
set timezone = 'America/Indiana/Indianapolis',
    updated_at = now()
where id = 'ac85a800-91cc-4ba5-a42c-9b55eac4653a'
  and timezone <> 'America/Indiana/Indianapolis';
```

Run **before 026** so session scheduling defaults use the correct IANA zone.

---

## Migration status

| # | Migration | Status |
|---|-----------|--------|
| 024 | `ma5_tenant_registration` | **Applied** |
| 025 | `ma5_locations_bootstrap` | **Applied** (file updated post-apply for timezone + validation) |
| 026 | `ma5_tenant_scoped_schema` | **Applied** (2026-07-23; PG15 composite FKs + inherit triggers verified) |
| 026b | `ma5_schema_hygiene` | Apply if not yet run |
| 027 | `ma5_stripe_webhook_events` | Apply if not yet run |
| 028 | `ma5_rls_helpers` | Applied |
| 029 | `ma5_rls_policies` | Applied |
| 030 | — | **Skipped** (auth trigger never on destination; D-14) |
| 031 | `ma5_inherited_table_policies` | Apply after **034** |
| 032 | `ma5_storage_policies` | Revised; greenfield apply path |
| 032b | `ma5_storage_policies_only` | **Applied** (recovery path; never with 032) |
| 032c | `ma5_storage_safe_uuid` | Apply if pre-revision 032b |
| 034 | `ma5_rls_hardening` | **Apply next** — commerce policies + column guards |
| 033 | `ma5_staging_seed` | **Staging only** — do not apply on prod |
| 034 | `ma5_rls_hardening` | Applied |

---

## Before applying migration 026b

| Check | Action |
|-------|--------|
| **Backup** | Signal Works DB immediately before apply |
| 026 applied | `select count(*) ... ma5_%` → **40** |
| Audits A/B | Composite FK + inherit triggers verified (2026-07-23) |

**File:** `MA5/supabase-signalworks/migrations/026b_ma5_schema_hygiene.sql`

Idempotent: INSERT-safe `ma5_products_sync_active`, purge `retention_days` guard, SECURITY DEFINER grants.

---

## Before applying migration 026 (historical)

| Check | Action |
|-------|--------|
| **Production backup** | Signal Works DB immediately before apply |
| `MA5_TENANT_ID` set | `d71ada88-8fad-466f-9264-3a479d54d6e2` |
| `MA5_LOCATION_ID` recorded | `ac85a800-91cc-4ba5-a42c-9b55eac4653a` |
| Location `timezone` | `America/Indiana/Indianapolis` (run correction above if needed) |
| `public.set_updated_at()` | `select to_regprocedure('public.set_updated_at()');` must not be null |
| RLS on `ma5_locations` | Enabled; no policies until `029` — OK while app on hobby DB |

**File:** `MA5/supabase-signalworks/migrations/026_ma5_tenant_scoped_schema.sql`

Creates 39 empty tenant-scoped tables. `ma5_sessions.location_id` FK → `ma5_locations`. No `ma5_facility_settings`. No product seed (staging seed is `033` only).

### Verify after 026

```sql
select count(*) as ma5_table_count
from information_schema.tables
where table_schema = 'public'
  and table_name like 'ma5_%';
-- expect 40

select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ma5_sessions'
  and column_name in ('tenant_id', 'location_id');
-- both NOT NULL
```

---

## Next step

Review **026**, backup, apply on Signal Works, then draft **027** (`ma5_stripe_webhook_events`).

---

## Before applying migration 027

| Check | Action |
|-------|--------|
| **Backup** | Signal Works DB immediately before apply |
| 026 applied | 40 `ma5_*` tables (incl. `ma5_locations`) |
| 026b applied | Recommended (function hygiene) |

**File:** `MA5/supabase-signalworks/migrations/027_ma5_stripe_webhook_events.sql`

Creates `ma5_stripe_webhook_events` (empty). Dedup: `unique(stripe_account_id, stripe_event_id)`. RLS on; policies in `029`.

### Verify after 027

```sql
select count(*) from information_schema.tables
where table_schema = 'public' and table_name = 'ma5_stripe_webhook_events';
-- expect 1

select indexname from pg_indexes
where schemaname = 'public'
  and tablename = 'ma5_stripe_webhook_events'
  and indexdef like '%stripe_account_id%stripe_event_id%';
-- expect unique constraint index
```

---

## Next step

Apply **027**, then draft **028** (RLS helpers).

---

## Before applying migration 028

| Check | Action |
|-------|--------|
| **Backup** | Signal Works DB immediately before apply |
| 026 applied | `ma5_profiles`, `ma5_user_roles` exist |
| Platform core | `has_platform_permission(text)` exists |
| 027 applied | Recommended (not required for helpers) |

**File:** `MA5/supabase-signalworks/migrations/028_ma5_rls_helpers.sql`

Creates tenant-scoped RLS helpers used by **029–031**. No policy changes.

### Verify after 028

```sql
select proname from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and proname in (
    'ma5_current_tenant_id',
    'ma5_is_tenant_member',
    'ma5_has_tenant_role',
    'ma5_is_tenant_staff',
    'ma5_is_platform_admin',
    'ma5_can_manage_resource',
    'ma5_role_grants_capability'
  )
order by 1;
-- expect 7 rows

select public.ma5_role_grants_capability('coach', 'manage_memberships');
-- expect true

select public.ma5_role_grants_capability('staff', 'manage_memberships');
-- expect false
```

---

## Next step

Apply **028**, then draft **029** (RLS policies).

---

## Before applying migration 029

| Check | Action |
|-------|--------|
| **Backup** | Signal Works DB immediately before apply |
| 028 applied | RLS helpers exist (`ma5_is_tenant_member`, etc.) |
| Middleware | App should `set_config('app.tenant_id', ...)` for anon public reads |

**File:** `MA5/supabase-signalworks/migrations/029_ma5_rls_policies.sql`

Tenant-scoped RLS on all `ma5_*` tables with direct `tenant_id`. Adds policy helpers (`ma5_can_message_clients`, `ma5_is_team_member`, etc.). **Deferred to 031:** `ma5_program_days`, `ma5_workout_blocks`, `ma5_workout_block_sets`, `ma5_team_members`, `ma5_announcement_recipients`, `ma5_message_thread_reads`. **No policies** on `ma5_stripe_webhook_events` (service_role only).

### Verify after 029

```sql
select tablename, count(*) from pg_policies
where schemaname = 'public' and tablename like 'ma5_%'
group by 1 order by 1;

select count(*) from pg_policies
where schemaname = 'public' and tablename = 'ma5_stripe_webhook_events';
-- expect 0
```

---

## Next step

Apply **034** (RLS hardening), then **032c** if needed, then **031**. **030 skipped** — auth trigger never on destination (D-14).

---

## Before applying migration 034

| Check | Action |
|-------|--------|
| **Backup** | Signal Works DB immediately before apply |
| 029 applied | 117 policies on parent `ma5_*` tables |
| App commerce paths | Checkout + webhooks use `createServiceClient()` (not user JWT) |

**File:** `MA5/supabase-signalworks/migrations/034_ma5_rls_hardening.sql`

Part A tightens commerce-related policies (no rollback of 029). Part B adds column-guard triggers.

**Policy changes:**
- `ma5_checkout_sessions` — drops client INSERT (service_role only)
- `ma5_bookings` — split staff/client insert + staff cancel/client cancel update
- `ma5_calendar_entries` — staff-only mutations
- `ma5_messages` — staff-only updates

**Triggers:** profile, booking, message, announcement_recipient column guards; booking/message `tenant_id` derivation on insert.

### Verify after 034

```sql
-- No authenticated INSERT on checkout_sessions
select count(*) from pg_policies
where schemaname = 'public'
  and tablename = 'ma5_checkout_sessions'
  and cmd = 'INSERT';
-- expect 0

-- Hardened booking policies (expect 4)
select policyname from pg_policies
where schemaname = 'public' and tablename = 'ma5_bookings'
  and policyname like 'ma5_bookings_%'
order by 1;

-- Column guards present
select proname from pg_proc
where proname in (
  'ma5_guard_profile_client_columns',
  'ma5_guard_booking_client_insert',
  'ma5_guard_booking_client_update',
  'ma5_guard_announcement_recipient_client_columns'
)
order by 1;
```

---

## Before applying migration 031

| Check | Action |
|-------|--------|
| **Backup** | Signal Works DB immediately before apply |
| 029 + **034** applied | Commerce hardened; column guards active |

**File:** `MA5/supabase-signalworks/migrations/031_ma5_inherited_table_policies.sql`

RLS for 6 inherit-only child tables via parent-chain `exists` subqueries. Adds **22** policies.

**Risk without 034:** clients with UPDATE access can alter protected columns (e.g. `ma5_announcement_recipients` beyond `read_at`). **034 adds the announcement_recipient guard before 031 policies land.**

### Verify after 031

```sql
select tablename, count(*) from pg_policies
where schemaname = 'public'
  and tablename in (
    'ma5_program_days',
    'ma5_workout_blocks',
    'ma5_workout_block_sets',
    'ma5_team_members',
    'ma5_announcement_recipients',
    'ma5_message_thread_reads'
  )
group by 1 order by 1;
-- expect 6 rows: four tables × 4 policies, two tables × 3 policies

select count(*) from pg_policies
where schemaname = 'public' and tablename like 'ma5_%';
-- expect 140 (117 + 22 from 031, +1 net from 034)
```

---

## Next step after 031

Storage is complete via **032b** on this environment. Run **032c** if not yet applied.

---

## Before applying migration 032

| Check | Action |
|-------|--------|
| **Greenfield only** | Use when 032b has **not** been applied |
| **Never both** | Do not run 032 and 032b on the same database |
| **Backup** | Signal Works DB immediately before apply |
| 029 applied | Table RLS on parent `ma5_*` tables (031 optional until 034 lands) |

**File:** `MA5/supabase-signalworks/migrations/032_ma5_storage_policies.sql`

Creates 3 buckets + **13** tenant-prefixed `storage.objects` policies. Uses `ma5_storage_path_segment_uuid()` for safe path parsing (no bare `::uuid` in policies).

### Path conventions (destination — not hobby paths)

| Bucket | Pattern |
|--------|---------|
| `ma5-brand-assets` | `{tenant_id}/brand/{resource_type}/{resource_id}/{file}` |
| `ma5-exercise-videos` | `{tenant_id}/exercises/{exercise_id}/{file}` |
| `ma5-member-journey` | `{tenant_id}/members/{user_id}/{file}` |

App upload code must use these prefixes at cutover (`browser-upload.ts`, `video/storage.ts`, `journey/constants.ts`).

### Verify after 032

```sql
-- MA5 buckets (expect 3 rows)
select id, public from storage.buckets where id like 'ma5-%' order by 1;

-- MA5 storage policies only (expect 13)
select count(*) from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'ma5_%';

-- All storage policies on project (unrelated tenants — ignore this number)
select count(*) from pg_policies
where schemaname = 'storage' and tablename = 'objects';
```

If buckets/helpers are missing or 032 rolled back, run
`032b_ma5_storage_policies_only.sql` instead (self-contained: helpers + buckets + policies).
**Never apply 032b if 032 or 032b already succeeded.**

---

## Before applying migration 032c

| Check | Action |
|-------|--------|
| **When** | 032b (or early 032) applied **before** the safe-UUID revision |
| **Skip** | If `ma5_storage_path_segment_uuid` already exists and exercise policy uses it |

**File:** `MA5/supabase-signalworks/migrations/032c_ma5_storage_safe_uuid.sql`

Idempotent patch: adds `ma5_storage_path_segment_uuid()` and recreates `ma5_exercise_videos_select_assigned` without `::uuid` cast.

### Verify after 032c

```sql
select to_regprocedure('public.ma5_storage_path_segment_uuid(text,integer)');
-- not null

select public.ma5_storage_path_segment_uuid('bad-segment/exercises/x/file.mp4', 1);
-- null, no error
```

---

## Next step after 032

Optional **033** staging seed (staging env only), then MA5 app deploy with tenant-prefixed upload paths.

---

## Before applying migration 033

| Check | Action |
|-------|--------|
| **Staging only** | **Do not run on production** |
| **Backup** | Staging DB before apply |
| 034 + 031 applied | Full RLS + column guards active |

**File:** `MA5/supabase-signalworks/migrations/033_ma5_staging_seed.sql`

Disposable fixtures for acceptance tests (AT-001, AT-032, AT-033, etc.).

**Creates:**
- Tenant B: `ma5-staging-isolation` + location + synthetic member
- Tenant A (MA5): class type, 2 published sessions, product, lead

**Tenant B test login:**
- Email: `staging-b-member@ma5-test.invalid`
- Password: `Ma5StagingB-033!`

**Fixed IDs** (for test scripts): see migration header comments.

**AT-050 note:** Seed product `staging-test-membership` has no Stripe Price until synced in Admin → Offerings.

### Verify after 033

```sql
select slug from public.tenants where slug = 'ma5-staging-isolation';
-- 1 row

select s.id, s.title, s.status
from public.ma5_sessions s
join public.tenants t on t.id = s.tenant_id
where t.slug = 'ma5-performance'
order by s.starts_at;
-- expect >= 2 published sessions

select p.email, t.slug
from public.ma5_profiles p
join public.tenants t on t.id = p.tenant_id
where t.slug = 'ma5-staging-isolation';
-- staging-b-member@ma5-test.invalid
```

---

## Next step after 033

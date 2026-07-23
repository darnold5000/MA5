# 02 — Proposed Migration Sequence

**Planning only.** Destination migrations live in **`MA5/supabase-signalworks/migrations/`** — **not** in `MA5/supabase/migrations/` (hobby database only).

**Scope (D-22):** Do **not** apply `MA5/supabase/migrations/001`–`023` to Signal Works. Do **not** modify the hobby database. Destination uses a **clean tenant-scoped schema** (migrations `024`+ in this folder).

Platform foundation (`tenants`, `tenant_memberships`, `tenant_domains`, …) must exist in Signal Works before `024` (from `signalworks-platform/core` and `signalworks-clients` migrations).

See [MA5/supabase-signalworks/README.md](../../supabase-signalworks/README.md).

---

## Migration list

### 024 — `024_ma5_tenant_registration.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/024_ma5_tenant_registration.sql` |
| **Status** | **Applied** (2026-07-23) |
| **Tenant UUID** | `d71ada88-8fad-466f-9264-3a479d54d6e2` |
| **Purpose** | Register MA5 Performance in shared `tenants` (idempotent upsert on `slug`) |
| **Tables** | `tenants` (insert or update) |
| **Output** | `select id from tenants where slug = 'ma5-performance'` → `MA5_TENANT_ID` |
| **Reversible** | Delete tenant row only if no FKs reference it |
| **Before apply** | **Production backup** of Signal Works DB immediately before running this SQL |
| **Source DB** | **No changes** |

---

### 025 — `025_ma5_locations_bootstrap.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/025_ma5_locations_bootstrap.sql` |
| **Status** | **Applied** (2026-07-23) |
| **Location UUID** | `ac85a800-91cc-4ba5-a42c-9b55eac4653a` (`slug = main`) |
| **Timezone** | `America/Indiana/Indianapolis` |
| **Purpose** | Create `ma5_locations`; bootstrap `main` for `ma5-performance` tenant |
| **Tables** | **Create** `ma5_locations`; **upsert** bootstrap row |
| **Constraints** | `tenant_id → tenants`, `unique(tenant_id, slug)` |
| **RLS** | Enabled; policies deferred to `029` |
| **Before apply** | Backup Signal Works DB |
| **After apply** | Query `ma5_locations` where `slug = 'main'` → `MA5_LOCATION_ID` |

---

### 026 — `026_ma5_tenant_scoped_schema.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/026_ma5_tenant_scoped_schema.sql` |
| **Status** | **Applied** (2026-07-23) |
| **Post-apply** | `026b_ma5_schema_hygiene.sql` — function hardening (optional hygiene) |
| **Purpose** | Create all `ma5_*` tables with **`tenant_id NOT NULL`** from inception (consolidates hobby `001`–`023` shape + tenant/location model) |
| **Tables** | 39 tables created here + `ma5_locations` (025) = 40 total; **excludes** `ma5_facility_settings`, `ma5_stripe_webhook_events` (027) |
| **Constraints** | FK `tenant_id → tenants(id)`; `ma5_sessions.location_id → ma5_locations`; composite uniques per §4 of 01 |
| **Direct `tenant_id`** | D-10/D-11: `ma5_messages`, `ma5_workout_set_logs` |
| **Indexes** | `(tenant_id)` on all scoped tables |
| **RLS** | Enabled with **no policies**; full policies in `029` |
| **Deferred** | RLS helpers (028), policies (029–031), storage (032), seed (033), auth trigger omitted (030) |
| **Before apply** | Backup Signal Works DB; confirm 024/025 applied |
| **After apply** | Validation block expects 40 `ma5_*` tables; empty schema (no seed) |
| **Coexistence** | See [12-feature-flag-cutover-strategy.md](./12-feature-flag-cutover-strategy.md) — MA5 app may stay on hobby DB until cutover |

---

### 026b — `026b_ma5_schema_hygiene.sql`

| Field | Detail |
|-------|--------|
| **Purpose** | Post-026 hygiene for DBs that applied 026 before final function hardening |
| **Changes** | INSERT-safe `ma5_products_sync_active`; purge `retention_days >= 1`; REVOKE PUBLIC + GRANT `service_role` on SECURITY DEFINER maintenance functions |
| **Prerequisite** | 026 applied (`ma5_profiles` exists) |
| **Reversible** | Re-`CREATE OR REPLACE` prior function bodies if needed |

---

### 027 — `027_ma5_stripe_webhook_events.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/027_ma5_stripe_webhook_events.sql` |
| **Status** | **Ready to apply** |
| **Purpose** | Idempotent webhook processing ledger (empty at bootstrap) |
| **Tables** | **Create** `ma5_stripe_webhook_events` |
| **Constraints** | `tenant_id NOT NULL`; `unique(tenant_id, id)`; `unique(stripe_account_id, stripe_event_id)` (D-15) |
| **Checks** | `stripe_account_id` matches `^acct_`; `stripe_event_id` matches `^evt_` |
| **RLS** | Enabled; **no policies** — service_role only until `029` |
| **Prerequisite** | 026 applied |
| **After apply** | 41 `ma5_*` tables total |

---

### 028 — `028_ma5_rls_helpers.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/028_ma5_rls_helpers.sql` |
| **Status** | **Ready to apply** |
| **Purpose** | Tenant-aware SQL helpers for RLS policies (029–031) |
| **Functions** | `ma5_current_tenant_id()`, `ma5_is_tenant_member()`, `ma5_has_tenant_role()`, `ma5_is_tenant_staff()`, `ma5_is_platform_admin()`, `ma5_can_manage_resource()`, internal `ma5_role_grants_capability()` |
| **Capability map** | Mirrors `src/lib/permissions/roles.ts` |
| **Security** | SECURITY DEFINER helpers; `REVOKE PUBLIC`; `GRANT EXECUTE` to `authenticated`, `service_role` |
| **Prerequisite** | 026 applied; platform `has_platform_permission()` |
| **Policies** | None — deferred to 029 |

---

### 029 — `029_ma5_rls_policies.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/029_ma5_rls_policies.sql` |
| **Status** | **Applied** |
| **Purpose** | Tenant-scoped RLS on all `ma5_*` tables with direct `tenant_id` |
| **Helpers added** | `ma5_is_public_tenant_row`, `ma5_can_message_clients`, `ma5_is_team_member`, `ma5_is_thread_client`, `ma5_has_program_assignment`, `ma5_client_can_read_workout`, `ma5_client_can_read_exercise` |
| **Deferred to 031** | `ma5_program_days`, `ma5_workout_blocks`, `ma5_workout_block_sets`, `ma5_team_members`, `ma5_announcement_recipients`, `ma5_message_thread_reads` |
| **SR only** | `ma5_stripe_webhook_events` — no policies |
| **Prerequisite** | 028 applied |
| **Matrix** | [04-rls-and-authorization-plan.md](./04-rls-and-authorization-plan.md) |

---

### 030 — `030_ma5_auth_trigger_omit.sql`

| Field | Detail |
|-------|--------|
| **Status** | **Skipped** — no migration file; trigger never created on destination (D-14) |

---

### 031 — `031_ma5_inherited_table_policies.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/031_ma5_inherited_table_policies.sql` |
| **Status** | **Ready after 034** |
| **Purpose** | RLS for inherit-only child tables (parent-chain `exists`) |
| **Tables** | `ma5_program_days`, `ma5_workout_blocks`, `ma5_workout_block_sets`, `ma5_team_members`, `ma5_announcement_recipients`, `ma5_message_thread_reads` |
| **Policies** | 22 total (4+4+4+4+3+3) |
| **Prerequisite** | 029 + **034** applied |

---

### 034 — `034_ma5_rls_hardening.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/034_ma5_rls_hardening.sql` |
| **Status** | **Apply next** (before 031 and production cutover) |
| **Purpose** | Commerce policy tightening + column-guard triggers (no 029 rollback) |
| **Policy changes** | `checkout_sessions` no client insert; split `bookings`; staff-only `calendar_entries` mutations; staff-only `messages` update |
| **Triggers** | Profile, booking, message, announcement_recipient guards; booking/message tenant derivation |
| **Prerequisite** | 029 applied |

---

### 032 — `032_ma5_storage_policies.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/032_ma5_storage_policies.sql` |
| **Status** | **Revised** — greenfield apply path (safe UUID parsing) |
| **Purpose** | Buckets + tenant-prefixed storage RLS (ADR 0004) |
| **Buckets** | `ma5-brand-assets` (public), `ma5-exercise-videos`, `ma5-member-journey` |
| **Policies** | 13 on `storage.objects` |
| **Helpers** | `ma5_storage_path_tenant_id()`, `ma5_storage_path_segment()`, `ma5_storage_path_segment_uuid()` |
| **Prerequisite** | 028–029 applied |
| **App follow-up** | Update upload path builders before first production upload |
| **Note** | **Never apply with 032b** on the same database |

---

### 032b — `032b_ma5_storage_policies_only.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/032b_ma5_storage_policies_only.sql` |
| **Status** | **Applied** on staging (recovery path) |
| **Purpose** | Self-contained storage apply when 032 failed or rolled back |
| **When** | Only if 032 did not commit; **never** if 032 or 032b already succeeded |

---

### 032c — `032c_ma5_storage_safe_uuid.sql`

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/032c_ma5_storage_safe_uuid.sql` |
| **Status** | **Apply next** on DBs that ran pre-revision 032b |
| **Purpose** | Replace unsafe `ma5_storage_path_segment(name, 3)::uuid` with `ma5_storage_path_segment_uuid()` |

---

### 033 — `033_ma5_staging_seed.sql` *(staging only)*

| Field | Detail |
|-------|--------|
| **Path** | `MA5/supabase-signalworks/migrations/033_ma5_staging_seed.sql` |
| **Status** | **Ready** — staging only |
| **Purpose** | Disposable test fixtures for acceptance tests |
| **Tenant A** | Class type, 2 sessions, product, lead on `ma5-performance` |
| **Tenant B** | `ma5-staging-isolation` + synthetic member (`staging-b-member@ma5-test.invalid`) |
| **Production** | **Do not run** |
| **Prerequisite** | 024–034, 031 applied |
| **Doc** | [03-data-backfill-plan.md](./03-data-backfill-plan.md) § 4 |

---

## Removed from prior plan

| Former migration | Reason |
|------------------|--------|
| `026`–`028` add nullable `tenant_id` | Schema created with `NOT NULL` in single pass |
| `029` add `location_id` + backfill | `location_id` on `ma5_sessions` from creation |
| `030` backfill `tenant_id` | **No hobby data to backfill** |
| `031` `SET NOT NULL` | Included in `026` |
| `032` composite uniques (separate) | Included in `026` |
| `037` deprecate `facility_settings` | Table never created on destination |

---

## Dependency graph

```text
024 tenants row
  → 025 locations + bootstrap insert
  → 026 full tenant-scoped ma5_* schema (empty)
  → 027 webhook events table
  → 028–029 RLS + helpers
  → 034 commerce hardening + column guards
  → 031 inherited table policies
  → 032 storage policies (or 032b recovery — never both)
  → 032c storage UUID patch (if 032b applied before revision)
  → 033 staging seed (staging env only)
  → App deploy → validation → production cutover
```

---

## Application deployment alignment

| Step | Action | Blocking? |
|------|--------|-----------|
| Apply 024–032 on Signal Works | Schema ready | — |
| Run 033 on staging only | Test fixtures | Staging only |
| Deploy MA5 app pointing to Signal Works DB | Tenant resolver + scoped queries | **Yes** |
| Bootstrap owner invite | First real user | **Yes** before UAT |
| Production cutover | Repoint production deploy env | After staging sign-off |

See [08-application-refactor-map.md](./08-application-refactor-map.md) and [09-dry-run-cutover-rollback.md](./09-dry-run-cutover-rollback.md).

---

## Hobby database

| Rule |
|------|
| `MA5/supabase/migrations/001`–`023` — hobby only; **never** apply to Signal Works |
| Destination migrations: `MA5/supabase-signalworks/migrations/024`+ only |
| Hobby DB unchanged until MA5 deploy env is repointed |

# 03 — Bootstrap and Seed Plan

**Planning only.** No SQL executed.

**Scope (D-22):** This is **not** a historical data migration. All rows on the old hobby Supabase MA5 tables are **test data** and are **not** imported into the Signal Works database.

```text
Clean destination schema deployment
  + fresh MA5 tenant bootstrap
  + application database cutover
```

---

## 1. Source database (hobby Supabase) — read only

| Use | Do not |
|-----|--------|
| Review current MA5 schema shape | Export or import MA5 table rows |
| Understand application behavior | Modify, rename, drop, or tenant-scope MA5 tables there |
| Identify non-DB config to recreate manually | Run migrations against hobby DB for this project |
| Reference for writing destination migrations | Assume hobby `auth.users` or Stripe test objects must move |

**Other applications** on the hobby database remain **completely untouched**.

Hobby MA5 test data may be **discarded** after MA5 production cutover unless a specific asset is separately approved for preservation.

---

## 2. Destination database (Signal Works) — build order

| Step | Action | Document |
|------|--------|----------|
| 1 | Create or resolve MA5 Performance `tenants` row | [13-tenant-bootstrap-lifecycle.md](./13-tenant-bootstrap-lifecycle.md) § Step 1 |
| 2 | Apply tenant-scoped MA5 schema (empty tables, `tenant_id NOT NULL`) | [02-migration-sequence.md](./02-migration-sequence.md) |
| 3 | Insert bootstrap records (default location, settings) | § 3 below |
| 4 | Seed staging test data | § 4 below |
| 5 | Point MA5 **staging** deployment at Signal Works DB | [09-dry-run-cutover-rollback.md](./09-dry-run-cutover-rollback.md) |
| 6 | Validate full application | [10-acceptance-test-plan.md](./10-acceptance-test-plan.md) |
| 7 | Cut over MA5 **production** deployment after approval | [09-dry-run-cutover-rollback.md](./09-dry-run-cutover-rollback.md) |

---

## 3. Bootstrap records (required, not backfill)

Inserted at destination creation time — **not** copied from hobby DB.

### 3.1 Tenant row

File: `MA5/supabase-signalworks/migrations/024_ma5_tenant_registration.sql` (idempotent upsert on `slug`).

```sql
-- Confirmed after migration 024 apply:
-- d71ada88-8fad-466f-9264-3a479d54d6e2
select id from public.tenants where slug = 'ma5-performance';
```

### 3.2 Default location

```sql
-- Migration 025 — conceptual
insert into ma5_locations (
  tenant_id, slug, name, timezone, is_active
) values (
  '{{MA5_TENANT_ID}}', 'main', 'MA5 Performance', 'America/Indiana/Indianapolis', true
)
returning id;  -- → {{MA5_LOCATION_ID}}
```

Source: operator-entered values or approved brand brief — **not** `ma5_facility_settings` import.  
`ma5_facility_settings` is **not created** on the destination database.

### 3.3 Platform owner (SW portal)

| Table | Action |
|-------|--------|
| `profiles`, `tenant_memberships` | SW invite flow — separate from gym staff |

### 3.4 Gym owner / admin (first `ma5_profiles`)

| Method | Detail |
|--------|--------|
| **Approved approach** | **Invite fresh** via bootstrap script or admin UI after deploy (D-14 app-only creation) |
| Not used | Copy hobby `auth.users` or `ma5_profiles` |
| Not used | Auto-create profiles on any `auth.users` insert |

Production MA5 gym users start **empty** and are onboarded through:

1. Owner bootstrap invite (first admin), then  
2. Staff/member invites through normal app flows.

### 3.5 Optional starter catalog

| Table | Bootstrap |
|-------|-----------|
| `ma5_class_types` | 0–3 placeholder types (optional seed script) |
| `ma5_products` / `ma5_prices` | Empty until admin configures |
| All other `ma5_*` | Empty at bootstrap |

---

## 4. Staging seed data (disposable)

After schema + bootstrap, run **staging-only** migration `033_ma5_staging_seed.sql`:

| Entity | Purpose |
|--------|---------|
| Synthetic `ma5_profiles` + roles | AT-001 cross-tenant tests (Tenant B synthetic gym) |
| 1–2 `ma5_sessions` | Booking smoke tests |
| 1 `ma5_products` + price | Stripe test checkout (AT-050) |
| Sample lead | Lead capture test |

**Rules:**

- All seed rows use explicit `tenant_id = {{MA5_TENANT_ID}}` (or Tenant B UUID for isolation tests).
- Seed data is **not** promoted to production.
- Production destination receives bootstrap records only until real users onboard.

---

## 5. Auth users — no migration

| Environment | Users |
|-------------|-------|
| Hobby DB | Test users — **not copied** |
| Signal Works staging | Fresh invites + seed script service accounts if needed |
| Signal Works production | **Invite fresh** — owner first, then staff/members via app |

Do **not** copy `auth.users` from hobby to Signal Works.

Supabase Auth on Signal Works is shared with other tenants — MA5 profiles are created only through approved invite/onboarding flows (D-14).

---

## 6. Stripe — no test object migration

| Item | Action |
|------|--------|
| Hobby / test Stripe customers, subscriptions, payments | **Discard** — do not import |
| Staging | MA5 Stripe **test mode**; create new test customers during AT-050 |
| Production | MA5-owned live Stripe account; new records as real customers use the system |
| `ma5_stripe_webhook_events` | Starts empty |

No metadata backfill script for historical Stripe objects. See [06-stripe-migration-plan.md](./06-stripe-migration-plan.md).

---

## 7. Storage — no test object copy

| Item | Action |
|------|--------|
| Hobby test uploads | **Discarded** |
| Destination buckets | Empty with tenant-prefixed path convention from first upload |
| Optional preservation | Only if explicitly approved: logo, website imagery, waiver PDF, policy PDF — **manual** upload to destination, not bulk copy |

See [07-storage-migration-plan.md](./07-storage-migration-plan.md).

---

## 8. Validation (destination — not count reconciliation)

Validate **schema and bootstrap correctness**, not parity with hobby row counts.

```sql
-- Tenant exists
select id from tenants where slug = 'ma5-performance';

-- Default location
select id from ma5_locations
where tenant_id = '{{MA5_TENANT_ID}}' and slug = 'main';

-- Schema: tenant_id NOT NULL on direct-scoped tables (empty tables OK)
select column_name, is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ma5_profiles'
  and column_name = 'tenant_id';
-- expected: NO

-- No orphan bootstrap rows (trivial on fresh DB)
select count(*) from ma5_locations l
where not exists (select 1 from tenants t where t.id = l.tenant_id);
-- expected: 0
```

**Removed from scope:** pre/post row-count parity, orphan remediation for hobby test records, payment/membership history import.

---

## 9. Environment configuration

| Variable | Set when |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Point to Signal Works project |
| `SUPABASE_SERVICE_ROLE_KEY` | Signal Works project |
| `MA5_TENANT_ID` | After migration 024 — transitional until resolver live (D-17) |
| `STRIPE_*` | MA5 deployment; test keys on staging, live keys on production |

Cutover = change MA5 deployment env to Signal Works Supabase URL/keys. Hobby DB connection removed from MA5 deploy only.

---

## 10. Related documents

- [02-migration-sequence.md](./02-migration-sequence.md) — destination migrations (no hobby-side changes)
- [13-tenant-bootstrap-lifecycle.md](./13-tenant-bootstrap-lifecycle.md) — full lifecycle
- [09-dry-run-cutover-rollback.md](./09-dry-run-cutover-rollback.md) — deploy cutover and rollback

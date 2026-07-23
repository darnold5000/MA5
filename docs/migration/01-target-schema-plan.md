# 01 — Final Table-by-Table Schema Plan

**MA5 tenant:** `{{MA5_TENANT_ID}}` (from `tenants` where `slug = 'ma5-performance'`)  
**Planning only** — no migrations created.

## Classification key

| Code | Meaning |
|------|---------|
| G | Platform-global |
| SW | Signal Works commercial (SW → MA5) |
| T | MA5 tenant-owned |
| L | MA5 location-owned |
| U | User-owned within tenant |
| E | External-provider reference |

## Summary counts

| Category | Count |
|----------|------:|
| MA5 `ma5_*` tables | 40 |
| Direct `tenant_id` | 31 (+ `ma5_locations` new) |
| Inherit only (approved) | 6 |
| Inherit with optional direct `tenant_id` (see §2) | 2 |
| Replaced | 1 (`ma5_facility_settings`) |

---

## 1. Master schema plan (all 40 `ma5_*` tables)

| Table | Classification | Direct `tenant_id` | Ownership path | Parent FK | RLS strategy | Migration action |
| ----- | -------------- | -----------------: | -------------- | --------- | ------------ | ---------------- |
| `ma5_profiles` | T + U | **Yes** | `tenants.id` | `tenants(id)` ON DELETE RESTRICT | Member: own row; staff: `is_tenant_member` + staff role | **Retain and tenant-scope** |
| `ma5_user_roles` | U | **Yes** | `tenants.id` | `tenants(id)`; `user_id → ma5_profiles` | Staff manage roles; members read own | **Retain and tenant-scope** |
| `ma5_notifications` | U | **Yes** | `tenants.id` | `tenants(id)`; `user_id → ma5_profiles` | User owns row; staff insert system notifications scoped to tenant | **Retain and tenant-scope** |
| `ma5_class_types` | T | **Yes** | `tenants.id` | `tenants(id)` | Staff write; members read active | **Retain and tenant-scope** |
| `ma5_products` | T + E | **Yes** | `tenants.id` | `tenants(id)` | Staff manage; public read active catalog for resolved tenant | **Retain and tenant-scope** |
| `ma5_prices` | T + E | **Yes** | `tenants.id` | `tenants(id)`; `product_id → ma5_products` | Staff manage; checkout reads via product tenant match | **Retain and tenant-scope** |
| `ma5_checkout_sessions` | T + E | **Yes** | `tenants.id` | `tenants(id)`; `user_id → ma5_profiles` | User/staff read own; service-role insert with tenant | **Retain and tenant-scope** |
| `ma5_payments` | T + U + E | **Yes** | `tenants.id` | `tenants(id)`; `user_id → ma5_profiles` | Staff read tenant; user read own; webhook service-role | **Retain and tenant-scope** |
| `ma5_subscriptions` | T + U + E | **Yes** | `tenants.id` | `tenants(id)`; `user_id → ma5_profiles` | Same as payments | **Retain and tenant-scope** |
| `ma5_invoices` | T + E | **Yes** | `tenants.id` | `tenants(id)` | Staff read; service-role webhook | **Retain and tenant-scope** |
| `ma5_refunds` | T + E | **Yes** | `tenants.id` | `tenants(id)`; `payment_id → ma5_payments` | Staff read; service-role | **Retain and tenant-scope** |
| `ma5_sessions` | T + L | **Yes** | `tenants.id` + `location_id` | `tenants(id)`; `location_id → ma5_locations` | Staff manage; members read published for tenant+location | **Retain and tenant-scope** |
| `ma5_bookings` | T + U | **Yes** | `tenants.id` | `tenants(id)`; `session_id → ma5_sessions`; `user_id → ma5_profiles` | Member own; staff tenant; **direct tenant_id** despite session FK | **Retain and tenant-scope** |
| `ma5_memberships` | T + U + E | **Yes** | `tenants.id` | `tenants(id)`; `user_id`, `product_id` | Member own; staff tenant | **Retain and tenant-scope** |
| `ma5_exercises` | T | **Yes** | `tenants.id` | `tenants(id)` | Staff manage; coaches read | **Retain and tenant-scope** |
| `ma5_workouts` | T | **Yes** | `tenants.id` | `tenants(id)` | Staff/coach manage | **Retain and tenant-scope** |
| `ma5_workout_blocks` | T | **No** | `workouts.tenant_id` | `workout_id → ma5_workouts` ON DELETE CASCADE | Inherit via workout tenant | **Retain and tenant-scope** |
| `ma5_workout_block_sets` | T | **No** | `workouts.tenant_id` | `block_id → ma5_workout_blocks` CASCADE | Inherit via block → workout | **Retain and tenant-scope** |
| `ma5_programs` | T | **Yes** | `tenants.id` | `tenants(id)` | Staff manage; assigned clients read | **Retain and tenant-scope** |
| `ma5_program_days` | T | **No** | `programs.tenant_id` | `program_id → ma5_programs` CASCADE | Inherit via program | **Retain and tenant-scope** |
| `ma5_teams` | T | **Yes** | `tenants.id` | `tenants(id)` | Staff manage | **Retain and tenant-scope** |
| `ma5_team_members` | U | **No** | `teams.tenant_id` | `team_id → ma5_teams`; `user_id → ma5_profiles` | Inherit via team | **Retain and tenant-scope** |
| `ma5_program_assignments` | T + U | **Yes** | `tenants.id` | `tenants(id)`; `program_id`, `user_id` | Staff assign; client read own | **Retain and tenant-scope** |
| `ma5_calendar_entries` | T + U | **Yes** | `tenants.id` | `tenants(id)`; `user_id`, `program_id` | Client own; staff tenant | **Retain and tenant-scope** |
| `ma5_workout_completions` | U | **Yes** | `tenants.id` | `tenants(id)`; `user_id` | Client own; coach read tenant | **Retain and tenant-scope** |
| `ma5_workout_set_logs` | U | **No*** | `completions.tenant_id` | `completion_id → ma5_workout_completions` CASCADE | Inherit via completion* | **Retain and tenant-scope** |
| `ma5_client_waivers` | U | **Yes** | `tenants.id` | `tenants(id)`; `user_id → ma5_profiles` | User own; staff read tenant | **Retain and tenant-scope** |
| `ma5_facility_settings` | L | N/A | Singleton | — | — | **Deprecate** after `ma5_locations` validated |
| `ma5_message_threads` | T + U | **Yes** | `tenants.id` | `tenants(id)`; `client_id → ma5_profiles` | Client own thread; staff tenant | **Retain and tenant-scope** |
| `ma5_messages` | U | **No*** | `threads.tenant_id` | `thread_id → ma5_message_threads` CASCADE | Inherit via thread* | **Retain and tenant-scope** |
| `ma5_message_thread_reads` | U | **No** | `threads.tenant_id` | `thread_id`; `user_id` | Inherit via thread | **Retain and tenant-scope** |
| `ma5_announcements` | T | **Yes** | `tenants.id` | `tenants(id)` | Staff write; recipients read | **Retain and tenant-scope** |
| `ma5_announcement_recipients` | U | **No** | `announcements.tenant_id` | `announcement_id` CASCADE; `user_id` | Inherit via announcement | **Retain and tenant-scope** |
| `ma5_push_subscriptions` | U + E | **Yes** | `tenants.id` | `tenants(id)`; `user_id` | User own | **Retain and tenant-scope** |
| `ma5_visitor_sessions` | T + E | **Yes** | `tenants.id` | `tenants(id)` | Service-role insert; staff read tenant | **Retain and tenant-scope** |
| `ma5_leads` | T | **Yes** | `tenants.id` | `tenants(id)` | Staff read; anon insert via service-role with resolved tenant | **Retain and tenant-scope** |
| `ma5_member_goals` | U | **Yes** | `tenants.id` | `tenants(id)`; `user_id` | User own; coach read tenant | **Retain and tenant-scope** |
| `ma5_progress_photos` | U + E | **Yes** | `tenants.id` | `tenants(id)`; `user_id` | User own; coach read with permission | **Retain and tenant-scope** |
| `ma5_marketing_gallery` | T | **Yes** | `tenants.id` | `tenants(id)` | Public read published; staff write | **Retain and tenant-scope** |
| `ma5_community_posts` | T + U | **Yes** | `tenants.id` | `tenants(id)`; `author_id` | Members read/write tenant | **Retain and tenant-scope** |

\* See §2 — candidate for direct `tenant_id` upgrade before implementation.

### New table (replaces facility singleton)

| Table | Classification | Direct `tenant_id` | Migration action |
| ----- | -------------- | -----------------: | ---------------- |
| `ma5_locations` | L | **Yes** | **Replace** `ma5_facility_settings` pattern |

### New table (Stripe idempotency)

| Table | Classification | Direct `tenant_id` | Migration action |
| ----- | -------------- | -----------------: | ---------------- |
| `ma5_stripe_webhook_events` | T + E | **Yes** | **Retain** (new); dedup `unique(stripe_account_id, stripe_event_id)`; tenant from deployment config at insert |

---

## 2. Inherited ownership — detailed analysis (8 tables)

### 2.1 Approved inherit-only (6 tables)

#### `ma5_program_days`

| Criterion | Value |
|-----------|-------|
| Mandatory FK path | `program_id → ma5_programs.id` (programs carry `tenant_id`) |
| ON DELETE | CASCADE from program |
| RLS join | `exists (select 1 from ma5_programs p where p.id = program_id and p.tenant_id = current_tenant())` |
| Query cost | Low (admin authoring) |
| Orphan risk | None if FK enforced |
| Direct `tenant_id`? | **Unnecessary** — shallow tree, low traffic |

#### `ma5_team_members`

| Criterion | Value |
|-----------|-------|
| FK path | `team_id → ma5_teams.id` |
| ON DELETE | CASCADE |
| RLS join | Via `ma5_teams.tenant_id` |
| Query cost | Low |
| Orphan risk | Low |
| Direct `tenant_id`? | **Unnecessary** |

#### `ma5_workout_blocks`

| Criterion | Value |
|-----------|-------|
| FK path | `workout_id → ma5_workouts.id` |
| ON DELETE | CASCADE |
| RLS join | Via `ma5_workouts.tenant_id` |
| Query cost | Medium (program editor) |
| Orphan risk | Low |
| Direct `tenant_id`? | **Unnecessary** — workouts already direct |

#### `ma5_workout_block_sets`

| Criterion | Value |
|-----------|-------|
| FK path | `block_id → blocks → workouts` |
| ON DELETE | CASCADE |
| RLS join | 2-hop exists subquery |
| Query cost | Medium (set logger) |
| Orphan risk | Low with CASCADE |
| Direct `tenant_id`? | **Accept inherit** — 2-hop still cheap; optional denormalize in decision log |

#### `ma5_message_thread_reads`

| Criterion | Value |
|-----------|-------|
| FK path | `thread_id → ma5_message_threads.id` |
| ON DELETE | CASCADE |
| RLS join | Via thread `tenant_id` |
| Query cost | Low |
| Direct `tenant_id`? | **Unnecessary**

#### `ma5_announcement_recipients`

| Criterion | Value |
|-----------|-------|
| FK path | `announcement_id → ma5_announcements.id` |
| ON DELETE | CASCADE |
| RLS join | Via announcement `tenant_id` |
| Bulk publish | Service-role inserts with announcement tenant check |
| Direct `tenant_id`? | **Unnecessary** unless publish volume requires denormalization (see open decisions)

### 2.2 Inherit with recommended direct `tenant_id` upgrade (2 tables)

#### `ma5_messages` — **recommend direct `tenant_id`**

| Criterion | Value |
|-----------|-------|
| Why inherit was proposed | Thread parent always has `tenant_id` |
| Why direct is better | High insert rate; service-role sends without re-loading thread; inbox queries filter messages directly; avoids 2-table policy on every SELECT |
| FK path if inherit | `thread_id → ma5_message_threads` |
| If direct added | `tenant_id` must match thread.tenant_id via trigger or app check |
| **Recommendation** | Add **`tenant_id` NOT NULL** on messages; treat as **direct** in implementation |

#### `ma5_workout_set_logs` — **recommend direct `tenant_id`**

| Criterion | Value |
|-----------|-------|
| Why inherit was proposed | Completion parent has `tenant_id` |
| Why direct is better | Exercise history aggregates across completions; reporting queries benefit from `(tenant_id, user_id, exercise_id)` index without join |
| **Recommendation** | Add **`tenant_id` NOT NULL**; bump direct count to **33 tables**

---

## 3. Shared platform tables (not `ma5_*`)

| Table | Classification | MA5 usage | Migration action |
| ----- | -------------- | --------- | ---------------- |
| `tenants` | SW | MA5 Performance row | **Retain** — insert MA5 tenant |
| `profiles` | G/T | Platform identity (optional for SW portal) | **Map** — gym members stay on `ma5_profiles` initially |
| `tenant_memberships` | SW | SW portal access for MA5 owners | **Retain** — separate from gym members |
| `tenant_profiles` | SW | SW business record | **Retain** |
| `client_offers` / `client_offer_items` | SW | SW sells to MA5 | **Retain** — no merge with `ma5_products` |
| `tenant_subscriptions` | SW | SW bills MA5 | **≠ `ma5_subscriptions`** |
| `platform_*_catalog` | G | Onboarding catalog | **Retain** |
| `agreement_acceptances` | SW | TOS/SOW | **Retain** |

**No `ma5_*` table maps into shared operational tables** — only registration of MA5 as a `tenants` row plus SW commercial linkage.

---

## 4. Constraint changes (global → tenant-scoped)

| Table | Remove | Add |
|-------|--------|-----|
| `ma5_class_types` | `unique(slug)` | `unique(tenant_id, slug)` |
| `ma5_products` | `unique(slug)` | `unique(tenant_id, slug)` |
| `ma5_bookings` | `unique(confirmation_number)` | `unique(tenant_id, confirmation_number)` |
| `ma5_profiles` | `unique(stripe_customer_id)` | `unique(tenant_id, stripe_customer_id)` nulls distinct |
| `ma5_message_threads` | global partial unique on client | `unique(tenant_id, client_id) where status='open'` |
| `ma5_memberships` | — | `unique(tenant_id, user_id, product_id)` where active (review) |

---

## 5. Required indexes (minimum)

Every table with `tenant_id`:

```sql
create index if not exists <table>_tenant_idx on public.<table> (tenant_id);
```

Additional high-value composites listed in audit §7.3; full list in [02-migration-sequence.md](./02-migration-sequence.md).

---

## 6. `location_id` scope

| Table | `location_id` | Notes |
|-------|---------------|-------|
| `ma5_sessions` | **Required** | Replaces `location_name` text |
| `ma5_class_types` | Optional | Only if types differ per location |
| All other tables | **No** | Tenant-wide unless future product requires |

See [02-migration-sequence.md](./02-migration-sequence.md) migration `027_ma5_locations.sql`.

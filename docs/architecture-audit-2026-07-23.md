# MA5 Architecture Audit

**Date:** 2026-07-23  
**Revision:** 2 — shared multi-tenant database re-evaluation  
**Repository:** `/MA5` (`ma5-web`)  
**Auditor:** Cursor (`client-architecture-audit` skill, read-only)  
**Status:** Audit complete — **no implementation performed**

**Supersedes:** Revision 1 conclusion that missing `tenant_id` is acceptable for a single-gym business.  
**Baseline doc (historical):** `docs/CURRENT_SYSTEM_AUDIT.md` (2026-07-15)

---

## Executive summary

This audit evaluates **moving MA5 into the shared Signal Works multi-tenant database** — the same Supabase project that hosts other Signal Works clients (DAWG, agency portal tenants, etc.).

MA5 may operate as **one gym business today**, but it must be modeled as **one tenant** (`tenants` row: MA5 Performance) inside a database shared with other clients. **Tenant isolation is mandatory** regardless of whether MA5 ever adds a second gym location.

### Architecture readiness (corrected)

| Finding | Severity | Meaning |
|---------|----------|---------|
| **No `tenant_id` on any `ma5_*` table** | **Critical — migration blocker** | Cannot safely cohabit shared DB with other tenants |
| **RLS scoped by `ma5_is_staff()` only** | **Critical** | Staff of Tenant A could access Tenant B data if both use `ma5_*` without tenant predicates |
| **Global `auth.users` → `ma5_profiles` trigger** | **Critical** | Any signup in shared project may create MA5 rows |
| **Singleton `ma5_facility_settings` (id=1)** | **High** | Must become tenant-scoped locations under MA5 tenant |
| **Webhook lacks deployment tenant resolution + dedup** | **High** | Must resolve tenant from MA5 deployment config; dedup `(stripe_account_id, stripe_event_id)` |
| **Storage paths not tenant-prefixed** | **High** | Cross-tenant object access risk |
| **No SW commercial linkage** | **Medium** | MA5 not yet registered as `tenants` row with offers/subscriptions |

**Previous incorrect framing (retracted):** “No `tenant_id` is fine for one gym.”  
**Correct framing:** Single-gym ≠ single-tenant database. MA5 is one **tenant** among many.

### Target ownership model

```text
Signal Works platform (shared Supabase)
├── Platform-global tables (catalog, permissions, …)
├── Signal Works commercial (tenants, client_offers, tenant_subscriptions, …)
└── Tenant: MA5 Performance (tenants.id = <ma5-tenant-uuid>)
    └── MA5 locations (ma5_locations — today: one row from facility_settings)
        ├── staff / coaches (profiles + roles, tenant-scoped)
        ├── programs, sessions, bookings
        ├── member commerce (ma5_products, memberships, payments)
        └── customers / athletes (profiles, waivers, journey data)
```

A future second MA5 facility is a **location under the same MA5 tenant**, not a separate Signal Works client, unless legally/commercially distinct.

### Recommended path (audit only)

1. Register **MA5 Performance** in shared `tenants` + Signal Works commercial tables (offers, agreements) as needed.
2. Add **`tenant_id`** to all MA5 tenant-owned tables; add **`location_id`** where facility-scoped.
3. Rewrite **RLS** to `tenant_memberships` / `is_tenant_member(tenant_id)` — not prefix isolation alone.
4. Keep **member billing** in `ma5_*` commerce tables; keep **Signal Works billing** in `client_offers` / `tenant_subscriptions` — never merge.
5. **Do not implement** until this report is approved and `client-database-migration` prerequisites are met.

---

## 1. Inventory summary

| Metric | Count |
|--------|------:|
| **MA5-owned tables** (`ma5_*`) | **40** |
| Tables requiring **direct `tenant_id`** | **31** |
| Tables that may **inherit** tenant (with enforced FK + RLS) | **8** |
| Tables **replaced** (facility singleton → locations) | **1** |
| Platform-global tables (no `tenant_id`) | **see §3** |
| Overlap with shared Signal Works commercial tables | **12** |
| Storage buckets | **3** |
| SQL migrations | **23** |
| API routes | **48** |

---

## 2. Classification legend

| Code | Category |
|------|----------|
| **G** | Platform-global — shared across all Signal Works tenants |
| **SW** | Signal Works commercial — SW selling services to MA5 |
| **T** | MA5 tenant-owned business data |
| **L** | MA5 location-owned (still under MA5 tenant) |
| **U** | User-owned within tenant (customer, staff, coach, …) |
| **E** | External-provider reference (Stripe, storage, Mindbody, …) |

**Tenant enforcement:**

| Code | Meaning |
|------|---------|
| **D** | Direct `tenant_id` required |
| **I** | May inherit via FK chain (RLS must still verify tenant) |
| **D+I** | Direct `tenant_id` recommended on high-risk rows **and** parent chain |

---

## 3. Platform-global tables (shared project)

These are **not** `ma5_*` tables. MA5 does not own them; no MA5-specific `tenant_id` column.

| Table | Purpose | MA5 relationship |
|-------|---------|------------------|
| `permissions` | Global capability definitions | Referenced by roles |
| `platform_plan_templates` | SW service catalog defaults | MA5 invite/offers |
| `platform_product_catalog` | Platform components / add-ons | MA5 onboarding |
| `roles` (platform) | May be global or tenant-scoped per ADR 0003 | MA5 admin portal access |

All other shared foundation tables (`tenants`, `profiles`, `tenant_memberships`, …) are **per-tenant or commercial** — not global.

---

## 4. Signal Works commercial overlap (SW → MA5)

MA5 as a **Signal Works client** should use these tables — **not** duplicate in `ma5_*`.

| Shared table | Purpose | Overlaps with `ma5_*`? |
|--------------|---------|------------------------|
| `tenants` | MA5 Performance tenant row | Replaces implicit “whole app = MA5” |
| `tenant_profiles` | Business/legal profile for SW relationship | **Not** `ma5_profiles` (gym members) |
| `tenant_portal_settings` | SW portal plan projection | **Not** `ma5_products` |
| `tenant_contacts` | SW account contacts | — |
| `client_offers` | SW proposal / agreement | — |
| `client_offer_items` | Line items (platform components, add-ons) | — |
| `tenant_subscriptions` | **SW bills MA5** | **≠ `ma5_subscriptions`** (members) |
| `purchases` / `purchase_items` | Immutable SW purchase snapshot | — |
| `agreement_acceptances` | TOS / SOW acceptance | — |
| `legal_documents` | Versioned legal docs | — |
| `tenant_activity_log` | SW admin audit | — |
| `stripe_webhook_events` | SW Stripe idempotency | MA5 needs **own** `ma5_stripe_webhook_events` or scoped events |

**Critical boundary:** `ma5_subscriptions`, `ma5_payments`, `ma5_memberships` = **MA5 → gym members**.  
`tenant_subscriptions`, `client_offers` = **Signal Works → MA5**. Never merge schemas.

---

## 5. MA5-owned table classification (all 40)

### 5.1 Identity and access

| Table | Primary | Tenant enforcement | `location_id` | Severity if missing `tenant_id` |
|-------|---------|-------------------|---------------|-----------------------------------|
| `ma5_profiles` | **T + U** | **D** | — | **Critical** |
| `ma5_user_roles` | **U** | **D** | — | **Critical** |
| `ma5_notifications` | **U** | **D** (not user_id alone) | — | **High** |

**Notes:** `ma5_profiles` must not be confused with platform `profiles`. On shared DB, every MA5 profile row needs `tenant_id = <ma5-tenant-uuid>`. Platform `profiles` + `tenant_memberships` may govern SW portal access separately from gym member profiles.

### 5.2 Scheduling and booking

| Table | Primary | Tenant enforcement | `location_id` | Severity |
|-------|---------|-------------------|---------------|----------|
| `ma5_class_types` | **T** | **D** | Optional | **Critical** |
| `ma5_sessions` | **T + L** | **D** | **D** | **Critical** |
| `ma5_bookings` | **T + U** | **D+I** | **I** via session | **Critical** |

**Notes:** `ma5_sessions.location_name` text field must become `location_id` FK. Bookings are high-risk — **direct `tenant_id` required** even if session FK exists.

### 5.3 Member commerce (MA5 Stripe)

| Table | Primary | Tenant enforcement | Severity |
|-------|---------|-------------------|----------|
| `ma5_products` | **T + E** | **D** | **Critical** |
| `ma5_prices` | **T + E** | **D** or **I** from product with tenant check | **Critical** |
| `ma5_checkout_sessions` | **T + E** | **D** | **Critical** |
| `ma5_payments` | **T + U + E** | **D** | **Critical** |
| `ma5_subscriptions` | **T + U + E** | **D** | **Critical** |
| `ma5_invoices` | **T + E** | **D** | **High** |
| `ma5_refunds` | **T + E** | **D** | **High** |
| `ma5_memberships` | **T + U + E** | **D** | **Critical** |

**External refs:** `stripe_*` IDs on profiles/memberships; checkout metadata includes `user_id`, `product_id` for correlation. Tenant authority on webhook ingest is **deployment config**, not metadata.

### 5.4 Programs and training

| Table | Primary | Tenant enforcement | Severity |
|-------|---------|-------------------|----------|
| `ma5_exercises` | **T** | **D** | **Critical** |
| `ma5_workouts` | **T** | **I** from program or **D** | **High** |
| `ma5_workout_blocks` | **T** | **I** | **High** |
| `ma5_workout_block_sets` | **T** | **I** | **Medium** |
| `ma5_programs` | **T** | **D** | **Critical** |
| `ma5_program_days` | **T** | **I** | **Medium** |
| `ma5_teams` | **T** | **D** | **High** |
| `ma5_team_members` | **U** | **I** | **High** |
| `ma5_program_assignments` | **T + U** | **D+I** | **High** |
| `ma5_calendar_entries` | **T + U** | **D** | **High** |
| `ma5_workout_completions` | **U** | **D+I** | **High** |
| `ma5_workout_set_logs` | **U** | **I** | **Medium** |

### 5.5 Communication

| Table | Primary | Tenant enforcement | Severity |
|-------|---------|-------------------|----------|
| `ma5_message_threads` | **T + U** | **D** | **Critical** |
| `ma5_messages` | **U** | **I** (+ tenant check on thread) | **Critical** |
| `ma5_message_thread_reads` | **U** | **I** | **High** |
| `ma5_announcements` | **T** | **D** | **Critical** |
| `ma5_announcement_recipients` | **U** | **I** | **High** |
| `ma5_push_subscriptions` | **U + E** | **D** | **High** |

Migration `007_communication.sql` explicitly warns: no tenant key — **must be fixed before shared DB**.

### 5.6 Marketing, community, member journey

| Table | Primary | Tenant enforcement | Severity |
|-------|---------|-------------------|----------|
| `ma5_visitor_sessions` | **T + E** | **D** | **High** |
| `ma5_leads` | **T** | **D** | **Critical** |
| `ma5_marketing_gallery` | **T** | **D** | **High** |
| `ma5_community_posts` | **T + U** | **D** | **High** |
| `ma5_member_goals` | **U** | **D+I** | **High** |
| `ma5_progress_photos` | **U + E** | **D** | **Critical** |
| `ma5_client_waivers` | **U** | **D+I** | **Critical** |

### 5.7 Facility / location settings

| Table | Primary | Tenant enforcement | Severity |
|-------|---------|-------------------|----------|
| `ma5_facility_settings` | **L** (singleton) | **Replace** with `ma5_locations` + **D** `tenant_id` | **Critical** |

**Required new table (future migration — documented only):**

```sql
-- Conceptual — not implemented in this audit
ma5_locations (
  id uuid primary key,
  tenant_id uuid not null references tenants(id),
  slug text not null,
  name text not null,
  -- migrated from ma5_facility_settings columns
  unique (tenant_id, slug)
)
```

---

## 6. Tenant scoping summary

### 6.1 Direct `tenant_id` required (31 tables)

`ma5_profiles`, `ma5_user_roles`, `ma5_notifications`, `ma5_class_types`, `ma5_products`, `ma5_prices`, `ma5_checkout_sessions`, `ma5_payments`, `ma5_subscriptions`, `ma5_invoices`, `ma5_refunds`, `ma5_sessions`, `ma5_bookings`, `ma5_memberships`, `ma5_exercises`, `ma5_workouts`, `ma5_programs`, `ma5_teams`, `ma5_program_assignments`, `ma5_calendar_entries`, `ma5_workout_completions`, `ma5_message_threads`, `ma5_announcements`, `ma5_push_subscriptions`, `ma5_visitor_sessions`, `ma5_leads`, `ma5_marketing_gallery`, `ma5_community_posts`, `ma5_member_goals`, `ma5_progress_photos`, `ma5_client_waivers`.

**Plus new:** `ma5_locations` (replaces `ma5_facility_settings` singleton).

### 6.2 May inherit with enforced FK + tenant RLS (8 tables)

`ma5_workout_blocks`, `ma5_workout_block_sets`, `ma5_program_days`, `ma5_team_members`, `ma5_workout_set_logs`, `ma5_messages`, `ma5_message_thread_reads`, `ma5_announcement_recipients`.

**Requirement:** Parent row must carry `tenant_id`; child policies must use `exists (select 1 from parent where parent.tenant_id = …)` — never rely on join depth alone without RLS verification.

### 6.3 Prefix isolation is insufficient

`ma5_*` table prefix does **not** provide tenant isolation when other clients share the same database. Prefix was a convention for coexisting **apps**, not **tenants**. Target model: shared table names with `tenant_id` (long-term) or `ma5_*` + `tenant_id` (transitional).

---

## 7. Required schema changes (documentation only)

### 7.1 Foreign keys

| Column | References | Tables |
|--------|------------|--------|
| `tenant_id` | `tenants(id)` | All 31 direct-scoped tables + `ma5_locations` |
| `location_id` | `ma5_locations(id)` | `ma5_sessions`, optionally `ma5_class_types`, staff assignments (future) |

### 7.2 Composite unique constraints (replace global uniques)

| Table | Current | Target |
|-------|---------|--------|
| `ma5_class_types` | `slug` unique global | `unique (tenant_id, slug)` |
| `ma5_products` | `slug` unique global | `unique (tenant_id, slug)` |
| `ma5_bookings` | `confirmation_number` global | `unique (tenant_id, confirmation_number)` |
| `ma5_facility_settings` | singleton `id=1` | **drop**; `unique (tenant_id, slug)` on locations |
| `ma5_message_threads` | one open thread per client global | `unique (tenant_id, client_id) where status='open'` |
| `ma5_profiles` | `stripe_customer_id` global unique | `unique (tenant_id, stripe_customer_id)` or platform-scoped |

### 7.3 Required indexes

For every table with `tenant_id`:

```sql
create index on <table> (tenant_id);
```

High-traffic composites:

| Table | Index |
|-------|-------|
| `ma5_sessions` | `(tenant_id, starts_at)`, `(tenant_id, location_id, starts_at)` |
| `ma5_bookings` | `(tenant_id, user_id, created_at desc)` |
| `ma5_memberships` | `(tenant_id, user_id, status)` |
| `ma5_payments` | `(tenant_id, created_at desc)` |
| `ma5_leads` | `(tenant_id, created_at desc)` |
| `ma5_profiles` | `(tenant_id, email)` |

---

## 8. Required RLS changes

### Current state (insufficient)

- Policies use `ma5_is_staff()` and `auth.uid()` without `tenant_id` predicate.
- Any user with MA5 staff role could theoretically query all rows if RLS does not filter by tenant.

### Target state

1. Enable RLS on all `ma5_*` tables (already enabled on most).
2. Replace `ma5_is_staff()` with:

```sql
-- Conceptual
is_tenant_member(tenant_id)
and has_tenant_permission(tenant_id, '<permission>')
```

3. **Platform admin** access via separate `has_platform_permission()` — not tenant staff role bleed.
4. **Anonymous** public routes: restrict to `tenant_id` resolved from hostname/slug **before** query.
5. Child tables: policies must join to parent and verify `parent.tenant_id`.

### Auth trigger (critical)

`ma5_handle_new_user()` on `auth.users` fires for **all** signups in shared project — **must be removed or gated** to MA5-invited users only with explicit `tenant_id`.

---

## 9. Service-role paths requiring manual tenant enforcement

Service role bypasses RLS. Every path must resolve `tenant_id` before write.

| Route / module | File | Current tenant enforcement | Required |
|----------------|------|---------------------------|----------|
| Member invite | `api/admin/members/invite` | None | Resolve MA5 `tenant_id`; scope all writes |
| Coach invite | `api/admin/coaches/invite` | None | Same |
| Leads capture | `api/leads` | None | Resolve tenant from site config / hostname |
| Attribution visit | `api/attribution/visit` | None | `tenant_id` on `ma5_visitor_sessions` |
| Marketing privacy | `api/admin/marketing/privacy` | None | Staff session → tenant |
| Payment import | `api/admin/payments/import` | None | `tenant_id` on imported payments |
| Announcement publish | `api/admin/announcements/.../publish` | None | Tenant scope recipients |
| Stripe webhook | `api/stripe/webhook` | `user_id` metadata only | MA5 webhook secret; tenant from **deployment config**; dedup `(stripe_account_id, stripe_event_id)` |
| Accept invite | `api/auth/accept-invite` | Partial | Bind profile to tenant |

---

## 10. Public routes requiring server-side tenant resolution

| Route / API | Resolution method (target) |
|-------------|---------------------------|
| Marketing site `(marketing)/*` | Resolve MA5 tenant from `NEXT_PUBLIC_SITE_URL` / domain map → `tenants.slug = 'ma5-performance'` |
| `POST /api/leads` | Same tenant resolver; never accept `tenant_id` from body |
| `POST /api/attribution/visit` | Cookie + tenant from marketing site context |
| `GET` published sessions (if any public) | `where tenant_id = :resolved and status = 'published'` |
| `POST /api/stripe/webhook` | MA5 `STRIPE_WEBHOOK_SECRET`; tenant from deployment config; never request body |
| Mindbody fallback links | External — no DB |

**Do not trust** client-supplied `tenant_id` (client-platform-rules §3).

---

## 11. Stripe and webhook tenant resolution

### MA5 member commerce (gym → members)

| Requirement | Current | Target |
|-------------|---------|--------|
| Stripe account | MA5-owned | Unchanged — MA5 deployment env keys |
| Webhook verification | `STRIPE_WEBHOOK_SECRET` in MA5 env | Unchanged |
| Tenant on webhook ingest | Not enforced | **Deployment config** (`MA5_TENANT_ID`) — not request body or metadata authority |
| Checkout metadata | `user_id`, `product_id`, `product_slug` | Optional `tenant_id` for cross-check only |
| Webhook handler | Resolves user by metadata | Dedup `unique(stripe_account_id, stripe_event_id)`; scope all DB by deployment tenant |
| Idempotency table | **None** | `ma5_stripe_webhook_events` with `stripe_account_id` + `stripe_event_id` |
| Customer ID on profile | `ma5_profiles.stripe_customer_id` | Scoped `unique (tenant_id, stripe_customer_id)` |

### Signal Works commerce (SW → MA5)

Handled by `signalworks-clients` on **Signal Works' own Stripe account** — separate deployment, separate webhook secret, separate endpoint. MA5 member commerce never touches SW commercial tables. **No Stripe Connect.**

---

## 12. Storage tenant-path requirements

| Bucket | Current pattern | Target (ADR 0004) |
|--------|-----------------|-------------------|
| `ma5-brand-assets` | No tenant prefix | `{tenant_id}/brand/{asset_id}/{file}` |
| `ma5-exercise-videos` | No tenant prefix | `{tenant_id}/exercises/{exercise_id}/{file}` |
| `ma5-member-journey` | No tenant prefix | `{tenant_id}/members/{user_id}/{file}` |

Storage policies must verify `is_tenant_member(tenant_id)` and object path prefix match resolved tenant.

---

## 13. Migration sequencing implications

| Phase | Work | Blocker for next phase |
|-------|------|------------------------|
| **0** | Approve this audit + schema mapping | — |
| **1** | Ensure platform foundation (`tenants`, `profiles`, `tenant_memberships`, permissions) in shared project | MA5 tenant row |
| **2** | Create `tenants` row for MA5 Performance; link SW commercial (`client_offers`, etc.) if billing via portal | `tenant_id` UUID |
| **3** | Create `ma5_locations`; migrate `ma5_facility_settings` → location row(s) | Location FKs |
| **4** | Add nullable `tenant_id` to all 40 tables (dependency order: parents before children) | — |
| **5** | Backfill `tenant_id = <ma5-uuid>` for all existing rows | — |
| **6** | Add `location_id` to sessions; backfill default location | — |
| **7** | Add NOT NULL + new composite uniques; drop global uniques | — |
| **8** | Rewrite RLS policies (tenant membership) | — |
| **9** | Fix / remove global `ma5_handle_new_user` trigger | — |
| **10** | Storage path migration + policy update | — |
| **11** | MA5 webhook: deployment tenant + dedup + scoped service-role queries | — |
| **12** | Application layer: tenant resolver, query filters, service-role enforcement | — |
| **13** | Validation queries + cutover (`client-database-migration` checklist) | — |
| **14** | Deprecate `ma5_facility_settings` singleton | — |

**Cannot cut over to shared production DB** until phases 4–9 are complete minimum.

---

## 14. Remediation backlog (revised)

| ID | Phase | Item | Severity | Effort |
|----|-------|------|----------|--------|
| R1 | 0 | Approve tenant isolation mapping (this document) | **Critical** | S |
| R2 | 1–2 | Register MA5 in `tenants` + SW commercial linkage | **Critical** | S |
| R3 | 3 | Introduce `ma5_locations`; retire singleton settings | **Critical** | M |
| R4 | 4–7 | Add `tenant_id` + constraints to all `ma5_*` tables | **Critical** | XL |
| R5 | 8 | Rewrite RLS to tenant membership model | **Critical** | L |
| R6 | 9 | Fix auth trigger scope for shared `auth.users` | **Critical** | M |
| R7 | 10 | Tenant-prefixed storage paths + policies | **High** | M |
| R8 | 11 | MA5 webhook deployment-tenant resolution + `(stripe_account_id, stripe_event_id)` dedup | **High** | M |
| R9 | 12 | Server tenant resolver for public routes + service-role APIs | **High** | L |
| R10 | 1 | Refresh stale docs (`CURRENT_SYSTEM_AUDIT.md`, README) | Medium | S |
| R11 | 11 | Mindbody ETL decision (separate from tenant migration) | Medium | L |

---

## 15. Risk report (revised)

| Risk | Likelihood | Impact | Severity |
|------|------------|--------|----------|
| Cross-tenant data read/write without `tenant_id` | **Certain** on shared DB | **Critical** | **Blocker** |
| Global `ma5_profiles` trigger polluting other clients | High | Critical | **Blocker** |
| Staff RLS without tenant predicate | High | Critical | **Blocker** |
| Stripe webhook without deployment tenant scoping | Medium | High | High |
| Storage object cross-tenant access | Medium | High | High |
| Confusing SW billing vs member billing tables | Medium | High | High |
| Deep FK chains without direct `tenant_id` on bookings/payments | Medium | High | High |

---

## 16. Assumptions and unknowns

| Item | Status |
|------|--------|
| Target shared Supabase project identity | Confirm with owner (same as `signalworks-clients` / DAWG?) |
| MA5 `tenants.slug` (e.g. `ma5-performance`) | To be assigned at registration |
| Single MA5 location at migration | Default location from `ma5_facility_settings` |
| SW Stripe account vs MA5 member Stripe account | Must remain separate metadata namespaces |
| Long-term: drop `ma5_` prefix vs keep with `tenant_id` | Product decision; audit requires `tenant_id` either way |

---

## Approval required before implementation

- [ ] **Shared-database tenant isolation model approved**
- [ ] Table classification and direct `tenant_id` list approved
- [ ] Location model (`ma5_locations`) approved
- [ ] SW commercial vs MA5 member commerce boundary approved
- [ ] Migration sequencing (§13) approved
- [ ] Risks accepted
- [ ] Approved to proceed to `client-database-migration` skill

**Explicit stop:** No migrations, application code, Supabase changes, or data migration until approval.

---

## Document history

| Revision | Date | Change |
|----------|------|--------|
| 1 | 2026-07-23 | Initial audit; incorrectly treated single-gym as exempt from `tenant_id` |
| 2 | 2026-07-23 | Shared multi-tenant re-evaluation; full table classification; migration blocker |

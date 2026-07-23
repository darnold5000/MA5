# 11 — Open Decisions

**Updated:** 2026-07-23. **D-22 acknowledged** 2026-07-23.

---

## Decision log (still open)

| ID | Topic | Options | Recommendation | Impact if deferred |
|----|-------|---------|----------------|-------------------|
| D-05 | **Customer identity model** | (a) `ma5_profiles` only; (b) Link to shared `profiles` | **(a)** initially | SSO complexity |
| D-06 | **Location ownership model** | (a) Sessions only `location_id`; (b) Per-location products/memberships | **(a)** phase 1 | Schema scope |
| D-12 | **SW commercial linkage timing** | (a) Same cutover as MA5 tenant row; (b) Pre-existing from portal | Depends on portal state | `client_offers` FK |
| D-13 | **Multi-location customer scope** | (a) Tenant-wide membership; (b) Per-location membership | **(a)** | Product rules |
| D-18 | **Preview/staging tenant** | Separate `tenants` row on staging DB | **Separate row** | Test data isolation |

---

## Resolved decisions

| ID | Topic | Decision |
|----|-------|----------|
| D-01 | **Direct vs inherited `tenant_id`** | 6 inherited + 2 direct (`ma5_messages`, `ma5_workout_set_logs`). |
| D-02 | **Mindbody / payment history import** | **N/A** — no hobby history import. |
| D-03 | **Stripe account architecture** | Client-owned Stripe per deployment; no Connect unless shared deployment. |
| D-04 | **Public tenant resolution** | `tenant_domains` → localhost/preview → `MA5_TENANT_ID` fallback. |
| D-07 | **Storage** | No test object copy; optional manual brand assets. |
| D-08 | **Hobby database** | Untouched; MA5 cutover = deploy env change only. |
| D-09 | **RLS session variable** | `set_config` = performance only; helpers verify membership. |
| D-10 / D-11 | **Direct `tenant_id`** | Approved on `ma5_messages`, `ma5_workout_set_logs`. |
| D-14 | **Auth trigger** | Mandatory app-only profile creation. |
| D-15 | **Webhook dedup** | `unique(stripe_account_id, stripe_event_id)`. |
| D-16 | **`ma5_facility_settings`** | Omit on destination — `ma5_locations` only. |
| D-17 | **`MA5_TENANT_ID` env** | Until hostname resolver replaces it. |
| D-19 | **Webhook tenant authority** | Deployment config only. |
| D-20 | **Feature flag / cutover** | [12-feature-flag-cutover-strategy.md](./12-feature-flag-cutover-strategy.md) |
| D-21 | **Tenant bootstrap** | [13-tenant-bootstrap-lifecycle.md](./13-tenant-bootstrap-lifecycle.md) |
| D-22 | **Migration type** | Clean destination + bootstrap + app cutover. No hobby data import. Hobby `001`–`023` never on Signal Works. |
| D-23 | **Destination migration location** | `MA5/supabase-signalworks/migrations/` — **not** `MA5/supabase/migrations/`. Prevents accidental hobby chain apply. |
| D-24 | **`ma5_profiles` identity model** | **`id = auth.users.id` (PK)** — one MA5 profile row per auth user globally. Not `unique(tenant_id, user_id)`. Acceptable because `ma5_*` tables are MA5-app-specific; same person cannot be a gym member at two tenants under this schema. Revisit only if building a reusable multi-gym `ma5_*` platform. |

---

## Implementation authorization

| Gate | Owner | Status |
|------|-------|--------|
| D-22 scope | Stakeholder | **Acknowledged** (2026-07-23) |
| Migration `024` | Stakeholder | **Applied** (2026-07-23) |
| Migration `025` | Stakeholder | **Applied** (2026-07-23) → `ac85a800-91cc-4ba5-a42c-9b55eac4653a` |
| Migration `026` | Stakeholder | **Applied** (2026-07-23; audits A/B clean) |
| Migration `026b` | Stakeholder | Apply if not yet run |
| Migration `027` | Stakeholder | Apply if not yet run |
| Migration `028` | Stakeholder | Applied |
| Migration `029` | Stakeholder | Applied |
| Migration `031` | Stakeholder | Apply after **034** |
| Migration `032` | Stakeholder | Revised; greenfield only (not on DB with 032b) |
| Migration `032b` | Stakeholder | **Applied** (staging); recovery only — never with 032 |
| Migration `032c` | Stakeholder | Apply if pre-revision 032b |
| Migration `034` | Stakeholder | **Apply next** |
| Migration `033` | Stakeholder | **Staging only** — ready to apply |
| Migration `034` | Stakeholder | Applied |
| Production backup | Operator | **Required immediately before applying each migration** |
| Hobby `001`–`023` on Signal Works | — | **Forbidden** |

### Migration 025 — complete

| Field | Value |
|-------|-------|
| Location UUID | `ac85a800-91cc-4ba5-a42c-9b55eac4653a` |
| Slug | `main` |
| Timezone | `America/Indiana/Indianapolis` (correct in repo; run RUNBOOK correction if DB still has `America/New_York`) |

---

## Related documents

- [02-migration-sequence.md](./02-migration-sequence.md)
- [03-data-backfill-plan.md](./03-data-backfill-plan.md)
- [MA5/supabase-signalworks/README.md](../../supabase-signalworks/README.md)

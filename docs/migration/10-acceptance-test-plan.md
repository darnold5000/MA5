# 10 — Acceptance Test Plan

**Planning only.** Tests run on **Signal Works destination** after migrations `024`–`032`, staging seed `033`, and MA5 staging deploy.

**Scope (D-22):** Use **newly seeded staging records** and **fresh invites** — not hobby DB data.

---

## 1. Test environment setup

| Fixture | Detail |
|---------|--------|
| Tenant A (MA5) | `{{MA5_TENANT_ID}}` from migration 024 |
| Tenant B | Synthetic gym from staging seed `033` — for cross-tenant tests only |
| User A-owner | Fresh invite bootstrap on destination |
| User A-staff | Fresh invite after owner |
| User A-member | Fresh member invite |
| User B-member | Seeded synthetic user (Tenant B) |
| Stripe | MA5 **test mode** on staging; new checkout creates new test customer |
| Storage | Empty buckets; uploads during test run |

---

## 2. Cross-tenant isolation (critical)

### AT-001 — Cross-tenant read (authenticated wrong tenant)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Login as Tenant B seeded member | Session active |
| 2 | Query Tenant A seeded session/booking id | **0 rows** (RLS) |
| 3 | Direct select on Tenant A `ma5_profiles` | **Denied** |

### AT-002 — Cross-tenant write

| Step | Action | Expected |
|------|--------|----------|
| 1 | As Tenant B user, POST booking for Tenant A session | **FK or RLS failure** |
| 2 | Admin invite with forged body `tenant_id` | Resolver/deployment tenant wins |

### AT-003 — Service-role isolation

| Step | Action | Expected |
|------|--------|----------|
| 1 | Lead API on MA5 hostname | `tenant_id` = MA5 |
| 2 | Webhook with wrong metadata `tenant_id` | Rejected (cross-check) |
| 3 | Webhook forged body `tenant_id` | Ignored — deployment config |

---

## 3. Staff permissions

| ID | Test | Expected |
|----|------|----------|
| AT-010 | Client cannot access `/api/admin/members` | 403 |
| AT-011 | Coach reads assigned program (seeded) | 200 |
| AT-012 | Coach cannot delete products | 403 |
| AT-013 | Admin CSV import creates rows with deployment `tenant_id` | Scoped |

---

## 4. Customer permissions

| ID | Test | Expected |
|----|------|----------|
| AT-020 | Invited member reads own profile | 200 |
| AT-021 | Member cannot read other member payments | Denied |
| AT-022 | Member posts to community | Tenant-scoped |

---

## 5. Public booking and marketing

| ID | Test | Expected |
|----|------|----------|
| AT-030 | `POST /api/leads` | New lead with MA5 `tenant_id` |
| AT-031 | Forged body `tenant_id` | Ignored |
| AT-032 | Published seeded session on marketing site | MA5 only |
| AT-033 | Booking flow on seeded session | New booking row |

---

## 6. Tenant resolution by domain

| ID | Test | Expected |
|----|------|----------|
| AT-040 | Production domain in `tenant_domains` | Resolves MA5 |
| AT-041 | Unknown domain | 404 / `unknown_tenant` |
| AT-042 | Inactive tenant | 403 |
| AT-043 | `localhost` | Dev tenant |
| AT-044 | Preview URL | Staging map |

---

## 7. Stripe (test mode — new records only)

| ID | Test | Expected |
|----|------|----------|
| AT-050 | New test checkout | New `ma5_payments` row; deployment `tenant_id` |
| AT-051 | Duplicate webhook delivery | Dedup `(stripe_account_id, stripe_event_id)` |
| AT-052 | Webhook replay | Idempotent |
| AT-053 | SW webhook to MA5 URL | Signature fails |
| AT-054 | Service-role payment query | Filtered by deployment tenant |
| AT-055 | Body `tenant_id` on webhook | Ignored |

**Not tested:** import of hobby Stripe customers or subscriptions.

---

## 8. Auth and onboarding (fresh users)

| ID | Test | Expected |
|----|------|----------|
| AT-060 | SW portal signup (no MA5 invite) | No `ma5_profiles` |
| AT-061 | MA5 owner bootstrap invite | Profile + `tenant_id` |
| AT-062 | Member invite accept | Profile created app-only |
| AT-063 | No global `ma5_on_auth_user_created` on destination | Trigger absent |
| AT-064 | Hobby test user credentials | **Do not work** on destination (not migrated) |

---

## 9. Storage (new uploads only)

| ID | Test | Expected |
|----|------|----------|
| AT-070 | Upload journey photo | Path `{tenant_id}/members/...` |
| AT-071 | Cross-tenant download attempt | Denied |
| AT-072 | Upload brand asset | Public under tenant prefix |
| AT-073 | Bucket scan | All objects tenant-prefixed |

**Not tested:** copy of hobby storage objects.

---

## 10. Multi-location

| ID | Test | Expected |
|----|------|----------|
| AT-080 | Bootstrap default location `main` | Exists from migration 025 |
| AT-081 | Seeded session has `location_id` | Matches default |
| AT-082 | Member books seeded session | Valid booking |
| AT-083 | Admin adds second location | Sessions filterable |

---

## 11. Billing separation

| ID | Test | Expected |
|----|------|----------|
| AT-090 | New `ma5_payments` from test checkout | Member commerce table |
| AT-091 | SW `tenant_subscriptions` | Separate; unchanged by MA5 checkout |
| AT-092 | No `ma5_products` in platform catalog | Schema separation |

---

## 12. Validation queries (destination schema — not hobby parity)

```sql
-- Bootstrap
select count(*) from ma5_locations
where tenant_id = '{{MA5_TENANT_ID}}' and slug = 'main';  -- 1

-- tenant_id NOT NULL enforced at schema level
select is_nullable from information_schema.columns
where table_name = 'ma5_bookings' and column_name = 'tenant_id';  -- NO

-- Cross-tenant FK integrity on seeded data
select count(*) from ma5_bookings b
join ma5_sessions s on s.id = b.session_id
where b.tenant_id <> s.tenant_id;  -- 0

-- Webhook dedup
select stripe_account_id, stripe_event_id, count(*)
from ma5_stripe_webhook_events
group by 1, 2 having count(*) > 1;  -- 0 rows
```

**Removed:** pre/post row-count match against hobby DB.

---

## 13. Test execution checklist

| Phase | Tests |
|-------|-------|
| After 026 + 033 seed | AT-080, schema validation |
| After 029 RLS + app deploy | AT-001–003, AT-010–022 |
| After bootstrap invite | AT-061–063 |
| Full staging | AT-030–055, AT-070–073, AT-090–092 |

**Pass criteria:** AT-001 and AT-064 before production cutover.

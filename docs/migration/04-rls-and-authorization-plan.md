# 04 — RLS and Authorization Plan

**Planning only.**

## 1. Role model

| Role | Scope | Source |
|------|-------|--------|
| **Signal Works platform administrator** | Cross-tenant platform ops | `has_platform_permission('manage_tenants')` etc. |
| **MA5 tenant owner** | Full MA5 tenant | `ma5_user_roles.role = 'owner'` + `tenant_id` |
| **MA5 administrator** | MA5 admin | `role = 'admin'` |
| **MA5 staff / coach** | Operations | `role in ('staff','coach')` |
| **MA5 customer** | Gym member / athlete | `role = 'client'` |
| **Public anonymous** | Marketing + lead capture | Resolved tenant only |
| **Service-role process** | Webhooks, invites, leads | App-enforced `tenant_id` |

Platform admins **do not** inherit MA5 staff access unless explicitly granted.

---

## 2. Helper functions (proposed)

### `ma5_current_tenant_id() → uuid`

- Returns tenant resolved for the current request context.
- **Authenticated app routes:** from session claim, subdomain resolver, or `tenant_memberships` + app binding — **not** from client body.
- **RLS policies:** may read `current_setting('app.tenant_id', true)` as a **performance hint only** — set via `set_config('app.tenant_id', ..., true)` in middleware after hostname resolution.
- **Security:** every policy must still call `ma5_is_tenant_member(tenant_id)` (or role-specific helper). Session variable is **not** a security mechanism (D-09).

### `ma5_is_tenant_member(p_tenant_id uuid) → boolean`

```sql
-- Conceptual behavior
select exists (
  select 1 from ma5_profiles p
  where p.id = auth.uid()
    and p.tenant_id = p_tenant_id
    and p.active = true
    and coalesce(p.access_revoked_at, 'infinity') > now()
);
```

For SW portal users without `ma5_profiles`, returns false for MA5 gym data.

### `ma5_has_tenant_role(p_tenant_id uuid, p_roles text[]) → boolean`

```sql
select exists (
  select 1 from ma5_user_roles r
  join ma5_profiles p on p.id = r.user_id
  where r.user_id = auth.uid()
    and p.tenant_id = p_tenant_id
    and r.role = any(p_roles)
);
```

### `ma5_is_tenant_staff(p_tenant_id uuid) → boolean`

Shorthand for `ma5_has_tenant_role(p_tenant_id, array['owner','admin','staff','coach'])`.

### `ma5_is_platform_admin() → boolean`

Wraps `has_platform_permission(...)` for platform tables only — **not** broad MA5 data access.

### `ma5_can_manage_resource(p_tenant_id uuid, p_permission text) → boolean`

Maps capability matrix (`manage_memberships`, `manage_programs`, …) to roles — replaces global `ma5_is_staff()` for mutations.

**Avoid:** single `is_tenant_member` granting write on all tables.

---

## 3. RLS matrix (summary)

Legend: **Y** = allowed, **O** = own rows only, **S** = staff+, **A** = admin+, **—** = denied, **P** = public read (resolved tenant), **SR** = service-role only

### Identity

| Table | Anon SELECT | Client SELECT | Staff SELECT | Client I/U/D | Staff I/U/D | Platform admin |
|-------|-------------|---------------|--------------|--------------|-------------|----------------|
| `ma5_profiles` | — | O | S (tenant) | O update | A manage | SW tables only |
| `ma5_user_roles` | — | O read | S read | — | A manage | — |
| `ma5_notifications` | — | O | — | O update read | S insert | — |

### Scheduling

| Table | Anon | Client | Staff | Client write | Staff write |
|-------|------|--------|-------|--------------|-------------|
| `ma5_sessions` | P published | P + booked | S | — | S |
| `ma5_bookings` | — | O | S | O create/cancel | S |
| `ma5_class_types` | P active | P | S | — | S |

### Commerce

| Table | Anon | Client | Staff | Notes |
|-------|------|--------|-------|-------|
| `ma5_products` | P active | P | S | Staff manages catalog |
| `ma5_prices` | P | P | S | |
| `ma5_memberships` | — | O | S | |
| `ma5_payments` | — | O | S | |
| `ma5_checkout_sessions` | — | O | S | |
| `ma5_subscriptions` | — | O | S | |
| `ma5_invoices` | — | O | S | |
| `ma5_refunds` | — | — | A | |

### Programs (inherit tables use parent exists)

| Table | Client | Staff |
|-------|--------|-------|
| `ma5_programs` | assigned read | S CUD |
| `ma5_program_days` | via program | via program |
| `ma5_workouts` / blocks / sets | assigned | S |
| `ma5_workout_completions` | O | coach read |
| `ma5_workout_set_logs` | O | coach read |

### Communication

| Table | Client | Staff |
|-------|--------|-------|
| `ma5_message_threads` | O | S |
| `ma5_messages` | thread participant | S |
| `ma5_announcements` | recipient read | S publish |
| `ma5_announcement_recipients` | O | S |

### Marketing / community

| Table | Anon | Client | Staff |
|-------|------|--------|-------|
| `ma5_leads` | — | — | S |
| `ma5_visitor_sessions` | SR insert | — | S read |
| `ma5_marketing_gallery` | P | P | S |
| `ma5_community_posts` | — | tenant read | S moderate |

### Locations

| Table | Client | Staff |
|-------|--------|-------|
| `ma5_locations` | read active | A manage |

### Webhook events

| Table | All roles |
|-------|-----------|
| `ma5_stripe_webhook_events` | **SR only** — no authenticated policy |

Full per-operation DELETE matrix documented in implementation ticket; default deny DELETE except admin cleanup.

---

## 4. Inherited table policies (pattern)

```sql
-- Example: ma5_program_days
create policy ma5_program_days_tenant_select on ma5_program_days
for select to authenticated
using (
  exists (
    select 1 from ma5_programs p
    where p.id = program_id
      and p.tenant_id = ma5_profiles.tenant_id -- via helper
      and ma5_is_tenant_member(p.tenant_id)
  )
);
```

---

## 5. Service-role and RLS

Service role **bypasses** RLS. Application must:

1. Resolve `{{MA5_TENANT_ID}}` from secure deployment configuration (or hostname resolver for public routes) — **never** from request body or unverified client input.
2. Include `tenant_id` on every insert/update.
3. Filter selects by `tenant_id` even when using service client.
4. Stripe webhooks: verify MA5 `STRIPE_WEBHOOK_SECRET`; dedupe by `(stripe_account_id, stripe_event_id)`.

---

## 6. Full RLS matrix (per operation)

Roles: **PA** = platform admin, **TO** = tenant owner, **TA** = tenant admin, **TS** = staff/coach, **TC** = customer, **AN** = anonymous, **SR** = service-role.

Default: **—** = deny. Inherited tables use parent-chain `exists` subquery.

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `ma5_profiles` | TC: own; TS+: tenant; AN: — | SR invite only | TC: own; TA+: tenant | TA+ |
| `ma5_user_roles` | TC: own; TS+: tenant | TA+ | TA+ | TO |
| `ma5_notifications` | TC: own | SR, TS | TC: own read state | — |
| `ma5_class_types` | AN: P active; TC+: tenant | TS+ | TS+ | TA+ |
| `ma5_products` | AN: P active; TC+: tenant | TS+ | TS+ | TA+ |
| `ma5_prices` | AN: P; TC+: tenant | TS+ | TS+ | TA+ |
| `ma5_sessions` | AN: P published; TC+: tenant | TS+ | TS+ | TA+ |
| `ma5_bookings` | TC: own; TS+: tenant | TC+SR; TS+ | TC cancel; TS+ | TS+ |
| `ma5_memberships` | TC: own; TS+: tenant | SR webhook; TS+ | SR; TS+ | — |
| `ma5_payments` | TC: own; TS+: tenant | SR webhook | SR | — |
| `ma5_checkout_sessions` | TC: own; TS+ | SR, TC | SR | — |
| `ma5_subscriptions` | TC: own; TS+ | SR | SR | — |
| `ma5_invoices` | TC: own; TS+ | SR | SR | — |
| `ma5_refunds` | TS+ | SR | — | — |
| `ma5_exercises` | TS+ read; TC assigned | TS+ | TS+ | TA+ |
| `ma5_workouts` | TS+; TC assigned | TS+ | TS+ | TA+ |
| `ma5_workout_blocks` | inherit workout | TS+ | TS+ | TS+ |
| `ma5_workout_block_sets` | inherit | TS+ | TS+ | TS+ |
| `ma5_programs` | TC assigned; TS+ | TS+ | TS+ | TA+ |
| `ma5_program_days` | inherit program | TS+ | TS+ | TS+ |
| `ma5_teams` | TS+ | TS+ | TS+ | TA+ |
| `ma5_team_members` | inherit team | TS+ | TS+ | TS+ |
| `ma5_program_assignments` | TC own; TS+ | TS+ | TS+ | TS+ |
| `ma5_calendar_entries` | TC own; TS+ | TC, TS+ | TC, TS+ | TC, TS+ |
| `ma5_workout_completions` | TC own; TS+ | TC | TC | — |
| `ma5_workout_set_logs` | TC own; TS+ | TC | TC | — |
| `ma5_client_waivers` | TC own; TS+ | TC, SR | — | — |
| `ma5_message_threads` | TC own; TS+ | TC, TS+ | TS+ | — |
| `ma5_messages` | thread participant | TS+, TC | sender | TS+ |
| `ma5_message_thread_reads` | TC own | TC | TC | — |
| `ma5_announcements` | TC recipient; TS+ | TS+ | TS+ | TA+ |
| `ma5_announcement_recipients` | TC own | SR publish | TC read | — |
| `ma5_push_subscriptions` | TC own | TC | TC | TC |
| `ma5_visitor_sessions` | TS+ | SR | — | — |
| `ma5_leads` | TS+ | SR (anon marketing) | TS+ | TA+ |
| `ma5_member_goals` | TC own; TS+ | TC | TC | TC |
| `ma5_progress_photos` | TC own; TS+ | TC | TC | TC |
| `ma5_marketing_gallery` | AN: P; TS+ | TS+ | TS+ | TA+ |
| `ma5_community_posts` | TC tenant | TC | author, TS+ | TS+ |
| `ma5_locations` | TC read active; TS+ | TA+ | TA+ | TO |
| `ma5_stripe_webhook_events` | SR | SR | — | — |

**PA** does not receive blanket MA5 access — only shared `tenants`, `client_offers`, etc.

---

## 7. Public tenant resolution

**Rule:** Request body, query params, and client headers must **never** be the authority for `tenant_id`.

### Resolution order (approved — D-04)

| Priority | Method | Source |
|---------:|--------|--------|
| 1 | Custom domain | `tenant_domains.hostname` → `tenants.id` |
| 2 | Preview / staging hostnames | `VERCEL_URL`, staging domains → tenant UUID via env map |
| 3 | Local development | `localhost` → dev tenant via env map |
| 4 | Fallback (transitional) | `MA5_TENANT_ID` deployment env — **remove when 1–3 verified** (D-17) |

**Not used for authority:** `tenant_id` in JSON body, query params, or client headers.

Location slug is secondary: resolves `location_id` **after** tenant is fixed.

| Scenario | Behavior |
|----------|----------|
| Unknown domain | 404 / `unknown_tenant` |
| Inactive tenant | 403 |
| Duplicate mapping | Unique constraint at migration; runtime fail-closed |
| Preview deployments | `VERCEL_URL` → staging tenant UUID |
| Local development | `localhost` → `.env.local` tenant |
| Public booking links | Under resolved tenant domain + optional location slug |
| Multi-location routes | `tenant_id` fixed; filter sessions by `location_id` |

Implementation: `src/lib/tenant/resolve.ts` (see [08-application-refactor-map.md](./08-application-refactor-map.md)).

---

## 8. Service-role remediation plan

| Path | Current purpose | Tenant resolution | Authorization | Idempotency | Required change |
|------|-----------------|-------------------|---------------|-------------|-----------------|
| `POST /api/admin/members/invite` | Member invite | `resolveTenant()` | Staff for tenant | Email dedup | `tenant_id` on all writes |
| `POST /api/admin/coaches/invite` | Coach invite | Same | Admin+ | Same | Same |
| `POST /api/leads` | Lead capture | Hostname | Anon | Optional email dedup | `tenant_id` insert |
| `POST /api/attribution/visit` | Attribution | Hostname | Bot filter | Session cookie | `tenant_id` on visitors |
| `PATCH /api/admin/marketing/privacy` | Privacy settings | Staff session | Staff | N/A | Tenant-scoped update |
| `POST /api/admin/payments/import` | CSV import | Staff session | Admin | Batch id | All rows `tenant_id` |
| `POST /api/admin/announcements/.../publish` | Fan-out | Row `tenant_id` | Publish perm | Recipient upsert | Match announcement tenant |
| `POST /api/stripe/webhook` | Member commerce | Deployment `MA5_TENANT_ID` | MA5 webhook signature | `unique(stripe_account_id, stripe_event_id)` | No body tenant trust; scope all DB by deployment tenant |
| `POST /api/auth/accept-invite` | Onboarding | `app_metadata.ma5_tenant_id` | Invite token | Profile upsert | Tenant-bound profile |

Additional modules: `webhooks.ts`, `sync-membership.ts`, `journey/queries.ts`, `push/web-push.ts`, `video/storage.ts`.

---

## 9. Location migration (summary)

| Item | Plan |
|------|------|
| Destination schema | `ma5_locations` only — **`ma5_facility_settings` omitted** (D-16, D-22) |
| Default location | Bootstrap `slug=main` in migration 025 |
| `location_id` scope | `ma5_sessions` only (phase 1) |
| Tenant-wide | Products, programs, profiles, memberships |
| Cross-location members | Tenant-scoped; book any location |
| Uniqueness | `unique(tenant_id, slug)` on locations |

See [01-target-schema-plan.md](./01-target-schema-plan.md) §6.

---

## 10. Migration files

- `028_ma5_rls_helpers.sql` through `032_ma5_storage_policies.sql`
- `034_ma5_rls_hardening.sql` — commerce policy tightening + column guards (apply before 031)

Drop policies: all existing `ma5_*` policies referencing `ma5_is_staff()` without tenant predicate.

# 08 — Application Refactor Map

**Status:** In progress on branch `feat/signalworks-app-migration`.  
**Rule:** Do **not** point MA5 at Signal Works until app phases below are complete.

## Completion gates (all required before cutover)

1. No service-role query without a tenant filter, unless intentionally global.
2. No direct commerce write from the browser.
3. No old storage path format (`avatars/`, `journey/`, `exercises/`, etc.).
4. No reference to `ma5_facility_settings` or `location_name`.
5. No tenant-scoped upsert using a global `onConflict` target.
6. Duplicate Stripe webhooks must be harmless (`ma5_stripe_webhook_events`).
7. Staging must fail visibly — no silent demo/cookie fallbacks when Supabase is configured.

## Architectural rule

**Do not scatter `process.env.MA5_TENANT_ID`.** All server-side tenant scope flows through:

- `src/lib/tenant/deployment.ts` — `requireMa5TenantId()`, `requireMa5DeploymentContext()`, `withTenantId()`, `tenantOnConflict()`
- `src/lib/tenant/service.ts` — `createMa5TenantServiceClient()` for service-role work

## Implementation order

1. Tenant foundation + centralized resolver (**done**)
2. Invites, auth, profiles, roles (**done**)
3. Stripe checkout, webhook dedup, commerce writes (**done** — apply **035** for retry-safe ledger)
4. Facility settings → `ma5_locations` (**done**)
5. Scheduling and bookings (**done** — admin session CRUD → `ma5_sessions`)
6. Storage paths
7. Programs, journey, messaging, community, push, marketing
8. Generated types + integration tests
9. Remove/disable silent demo fallbacks before staging validation

---

**Legend:** Phase **A** = destination schema (024–034); **B** = app deploy + tenant resolver; **C** = Stripe/webhooks; **D** = locations UI (greenfield — no facility_settings on destination).

---

## 1. Tenant resolution (new + middleware)

| File | Why | Phase | Blocking | Test |
|------|-----|-------|----------|------|
| `src/lib/tenant/deployment.ts` | **Done** — server-only env → tenant/location/stripe account | 1 | **Yes** | `deployment.test.ts` |
| `src/lib/tenant/service.ts` | **Done** — service client + ctx bundle | 1 | **Yes** | Integration |
| `src/lib/tenant/resolve.ts` | Hostname → `tenant_id` (replaces env fallback) | Later | **Yes** | Unit: domain map |
| `src/lib/supabase/middleware.ts` | Optional `set_config('app.tenant_id')` perf hint | Later | No | E2E login |
| `src/middleware.ts` | Call resolver on marketing + public API paths | Later | **Yes** | Unknown host 404 |

---

## 2. Data-access modules (`src/features/*`, `src/lib/*`)

| File | Why | Phase | Blocking | Test |
|------|-----|-------|----------|------|
| `src/lib/supabase/tables.ts` | Add `locations`, `stripeWebhookEvents` | A | No | Typecheck |
| `src/features/settings/queries.ts` | Read `ma5_locations` not facility_settings | D | **Yes** | Admin settings |
| `src/features/settings/types.ts` | Location type | D | No | — |
| `src/features/scheduling/queries.ts` | Filter by `tenant_id`, `location_id` | B | **Yes** | Session list |
| `src/features/booking/actions.ts` | Tenant-scoped bookings | B | **Yes** | Book flow |
| `src/features/programs/queries.ts` | Tenant filter all program queries | B | **Yes** | Program assign |
| `src/features/programs/supabase-store.ts` | Tenant on writes | B | **Yes** | — |
| `src/features/programs/set-logs.ts` | Direct `tenant_id` on set logs | B | **Yes** | Set log API |
| `src/features/messaging/queries.ts` | Thread/message tenant scope | B | **Yes** | Inbox |
| `src/features/messaging/publish.ts` | Announcement tenant check | B | **Yes** | Publish |
| `src/features/marketing/queries.ts` | Leads, visitors tenant filter | B | **Yes** | Admin leads |
| `src/features/marketing-gallery/queries.ts` | Gallery tenant + storage path | C | **Yes** | Gallery CRUD |
| `src/features/journey/queries.ts` | Service-role writes with tenant | B | **Yes** | Photo upload |
| `src/features/auth/members.ts` | Member list scoped to tenant | B | **Yes** | **Done** |
| `src/lib/auth/tenant-data.ts` | Shared invite/profile/role writes | B | **Yes** | **Done** |
| `src/features/community/queries.ts` | Community posts tenant | B | **Yes** | Board |
| `src/features/memberships/catalog.ts` | Products/prices tenant | B | **Yes** | Checkout |
| `src/features/billing/mindbody-payment-import.ts` | Import with tenant | B | **Yes** | Import CSV |
| `src/lib/billing/catalog.ts` | Catalog reads filtered | B | **Yes** | Offerings |
| `src/lib/billing/checkout.ts` | Stripe metadata `tenant_id` | C | **Yes** | Test checkout |
| `src/lib/billing/webhooks.ts` | Deployment tenant resolution; dedup; scoped service-role queries | C | **Yes** | Webhook replay |
| `src/lib/stripe/sync-membership.ts` | Tenant on sync | C | **Yes** | — |
| `src/lib/stripe/sync-session-booking.ts` | Booking tenant | C | **Yes** | — |
| `src/lib/auth/session.ts` | Load `ma5_profiles.tenant_id` | B | **Yes** | Login |
| `src/lib/auth/access.ts` | Tenant-aware permissions | B | **Yes** | Role matrix |
| `src/lib/permissions/roles.ts` | Replace global staff checks | B | **Yes** | — |
| `src/lib/video/storage.ts` | Tenant-prefixed paths | C | **Yes** | Signed URL |
| `src/lib/assets/browser-upload.ts` | Upload path prefix | C | **Yes** | Brand upload |
| `src/lib/journey/constants.ts` | Journey path builder | C | No | — |
| `src/lib/push/web-push.ts` | Tenant-scoped subscriptions | B | No | Push |
| `src/lib/attribution/middleware.ts` | Pass resolved tenant | B | No | Attribution |

---

## 3. API routes (48 total)

### Public / marketing

| Route | Why | Phase | Blocking |
|-------|-----|-------|----------|
| `POST /api/leads` | Resolver + `tenant_id` insert | B | **Yes** |
| `POST /api/attribution/visit` | `tenant_id` on visitor_sessions | B | **Yes** |

### Auth

| Route | Why | Phase | Blocking |
|-------|-----|-------|----------|
| `POST /api/auth/login` | Session includes tenant context | B | **Yes** |
| `POST /api/auth/accept-invite` | Tenant-bound profile creation | B | **Yes** |
| `POST /api/auth/forgot-password` | No tenant leak in emails | B | No |
| `POST /api/auth/logout` | Clear tenant cookie if any | B | No |

### Stripe / bookings

| Route | Why | Phase | Blocking |
|-------|-----|-------|----------|
| `POST /api/stripe/webhook` | MA5 secret verify; deployment tenant; dedup | C | **Yes** |
| `POST /api/stripe/checkout` | DB writes use deployment tenant | C | **Yes** |
| `POST /api/stripe/portal` | Customer scoped to tenant | C | **Yes** |
| `POST /api/stripe/session-checkout` | Tenant on session row | C | **Yes** |
| `POST /api/stripe/session-paid` | Tenant validation | C | **Yes** |
| `GET /api/stripe/status` | Tenant config | C | No |
| `POST /api/bookings` | `tenant_id` on booking | B | **Yes** |
| `POST /api/bookings/cancel` | Verify booking tenant | B | **Yes** |

### Member app

| Route | Why | Phase | Blocking |
|-------|-----|-------|----------|
| `GET/PATCH /api/profile` | Tenant-scoped profile | B | **Yes** |
| `POST /api/profile/password` | — | B | No |
| `POST /api/programs/complete` | Tenant on completion | B | **Yes** |
| `POST /api/programs/set-logs` | Direct `tenant_id` | B | **Yes** |
| `POST /api/messages/send` | Thread tenant match | B | **Yes** |
| `POST /api/messages/mark-read` | Thread tenant | B | No |
| `POST /api/journey/photos` | Storage path + tenant | C | **Yes** |
| `POST /api/journey/goals` | Tenant on goals | B | **Yes** |
| `POST /api/push/subscribe` | Tenant on subscription | B | No |
| `POST /api/notifications/*` | User tenant | B | No |
| `POST /api/announcements/[id]/mark-read` | Recipient tenant | B | No |
| `GET/POST /api/community` | Tenant-scoped posts | B | **Yes** |

### Admin

| Route | Why | Phase | Blocking |
|-------|-----|-------|----------|
| `POST /api/admin/members/invite` | Service-role tenant enforcement | B | **Yes** | **Done** |
| `GET/PATCH /api/admin/members` | Tenant filter | B | **Yes** | **Done** |
| `POST /api/admin/coaches/invite` | Same | B | **Yes** | **Done** |
| `GET/POST /api/admin/clients` | Tenant roster | B | **Yes** |
| `GET/POST /api/admin/roster` | Tenant | B | **Yes** |
| `GET/POST /api/admin/sessions` | `tenant_id` + `location_id` | B/D | **Yes** | **Done** |
| `GET/POST /api/admin/programs` | Tenant scope | B | **Yes** |
| `POST /api/admin/programs/workout-review` | Tenant | B | No |
| `GET/POST /api/admin/offerings/*` | Products tenant | B | **Yes** |
| `POST /api/admin/payments/import` | Import tenant | B | **Yes** |
| `GET/POST /api/admin/marketing/leads` | Tenant leads | B | **Yes** |
| `GET/PATCH /api/admin/marketing/privacy` | Tenant settings | B | No |
| `GET/POST /api/admin/marketing/gallery` | Tenant + storage | C | **Yes** |
| `GET/POST /api/admin/messages/*` | Messaging tenant | B | **Yes** |
| `GET/POST /api/admin/announcements` | Tenant | B | **Yes** |
| `POST /api/admin/announcements/[id]/publish` | Service-role tenant | B | **Yes** |
| `GET/PATCH /api/admin/facility-settings` | **Replace** with locations API | D | **Yes** |

---

## 4. Server actions / pages

| File | Why | Phase | Blocking |
|------|-----|-------|----------|
| `src/app/(marketing)/**` | Resolved tenant for public catalog | B | **Yes** |
| `src/app/app/**` | Member app tenant context | B | **Yes** |
| `src/app/admin/**` | Admin tenant context | B | **Yes** |
| `src/app/admin/settings/page.tsx` | Locations UI | D | **Yes** |
| `src/components/admin/facility-settings-form.tsx` | Rename → location form | D | **Yes** |
| `src/components/platform/app-shell.tsx` | Display location if multi | D | No |

---

## 5. Authentication

| File | Phase | Blocking |
|------|-------|----------|
| `src/lib/auth/activation-email.ts` | B | No |
| `src/lib/auth/hub-access.ts` | B | No |
| `supabase/migrations/036_*` (trigger drop) | B | **Yes** |

---

## 6. Stripe

See [06-stripe-migration-plan.md](./06-stripe-migration-plan.md). Key files: `checkout.ts`, `webhooks.ts`, `sync-membership.ts`, `api/stripe/*`.

---

## 7. Storage

See [07-storage-migration-plan.md](./07-storage-migration-plan.md). Key files: `browser-upload.ts`, `video/storage.ts`, `marketing-gallery/*`.

---

## 8. Email and notifications

| File | Why | Phase |
|------|-----|-------|
| `src/lib/email/notify-staff.ts` | Include tenant in deep links | B |
| `src/features/messaging/delivery.ts` | Tenant-scoped send | B |

---

## 9. Generated database types

| File | Phase | Blocking |
|------|-------|----------|
| `src/types/database.ts` or generated Supabase types | Regenerate after migrations 024–033 | A | **Yes** |

---

## 10. Tests

| File | Why | Phase |
|------|-----|-------|
| `src/lib/attribution/attribution.test.ts` | Tenant resolver mocks | B |
| `src/features/programs/set-logs.test.ts` | Tenant on logs | B |
| `src/features/billing/mindbody-payment-import.test.ts` | Import tenant | B |
| **New** `src/lib/tenant/resolve.test.ts` | Resolution matrix | B |
| **New** `tests/integration/cross-tenant.test.ts` | See [10-acceptance-test-plan.md](./10-acceptance-test-plan.md) | B |

---

## 11. Estimated change volume

| Category | Files |
|----------|------:|
| New tenant module | 3–4 |
| Feature query modules | ~25 |
| API routes | 48 |
| Admin UI (locations) | 3–5 |
| Billing/Stripe | 8 |
| Storage | 5 |
| Tests | 5+ |

**Deploy order:** Apply destination schema → deploy app with tenant resolver → bootstrap owner invite → staging validation → production env cutover.

# MA5 → Signal Works staging gate checklist

**Purpose:** Validate MA5 on the Signal Works destination **before** repointing the production domain or live Stripe webhooks.

**Hard gate:** Do **not** point the production domain at Signal Works until every section below passes on staging.

**Branch:** `feat/signalworks-app-migration` (or release tag cut from it)

**Confirmed tenant (MA5 performance):**

| Variable | Value |
|----------|-------|
| `MA5_TENANT_ID` | `d71ada88-8fad-466f-9264-3a479d54d6e2` |
| `MA5_LOCATION_ID` | `ac85a800-91cc-4ba5-a42c-9b55eac4653a` |
| `NEXT_PUBLIC_MA5_TENANT_ID` | Same as `MA5_TENANT_ID` |

**Do not set** `MA5_DEMO_MODE=true` on staging.

---

## 0. Pre-deploy

- [ ] Migrations `024`–`035` applied on Signal Works staging DB
- [ ] Migration `036_ma5_purge_rpc_lockdown.sql` applied (purge RPC: `service_role` only)
- [ ] Migration `042_ma5_staff_unread_message_count.sql` applied (fast admin Messages badge)
- [ ] Staging seed applied **manually** from `supabase-signalworks/seeds/033_ma5_staging_seed.sql` (not in prod migration chain)
- [ ] MA5 staging deployment env uses Signal Works `NEXT_PUBLIC_SUPABASE_URL` + keys (not hobby DB)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` set server-only on staging
- [ ] Stripe **test mode** keys + staging webhook endpoint registered
- [ ] `STRIPE_ACCOUNT_ID` matches MA5 test Connect account
- [ ] Resend / auth redirect URLs include staging host only (not production domain yet)

**Verify purge RPC lockdown:**

```sql
select grantee, privilege_type
from information_schema.role_routine_grants
where specific_schema = 'public'
  and routine_name = 'ma5_purge_expired_anonymous_visitors';
-- Expected: EXECUTE for service_role only
```

---

## 1. Empty-tenant / no demo data

Deploy with `MA5_TENANT_ID` + `MA5_LOCATION_ID` set and **no** staging seed on a scratch tenant (or fresh location) OR verify production tenant before seed:

- [ ] Public marketing pages show no invented coaches, sessions, leads, or metrics
- [ ] Client hub shows empty schedule / no program / no fake membership progress
- [ ] Admin ops dashboard shows zeroed or unavailable state (not demo “Mike” metrics)
- [ ] Marketing gallery empty (or DB-only images)
- [ ] No cookie-backed bookings or demo personas merged into UI

---

## 2. Auth

- [ ] Owner invite → accept → admin login
- [ ] Member invite → accept → client hub login
- [ ] Sign-up disabled in Supabase; unknown email cannot self-register
- [ ] Password reset and invite redirect URLs work on staging host
- [ ] `ma5_user_roles` row has correct `tenant_id` for invited users
- [ ] Logout clears session; protected routes return 401/redirect

---

## 3. Booking & scheduling

- [ ] Published sessions list from `ma5_sessions` (tenant-scoped)
- [ ] Member can book a session → row in `ma5_bookings`
- [ ] Member can view / cancel own booking
- [ ] Admin schedule CRUD uses tenant DB (not demo class types)
- [ ] Empty session list when none published (no fallback fixtures)

---

## 4. Payments & billing

- [ ] Stripe test checkout completes for a seeded or synced offering
- [ ] `ma5_payments` / `ma5_checkout_sessions` rows created with `tenant_id`
- [ ] Membership sync updates `ma5_memberships` for test user
- [ ] Admin offerings sync creates Stripe prices on test account
- [ ] Failed payment path visible in admin (no fake success data)

---

## 5. Webhooks

- [ ] Stripe CLI or Dashboard delivers test event to staging webhook URL
- [ ] `ma5_stripe_webhook_events` records event with `tenant_id` + `processing_status`
- [ ] Duplicate delivery dedupes (no double charge / double booking)
- [ ] Failed handler leaves `processing_status = failed` and `processed_at` null (retry-safe per migration 035)

---

## 6. Storage

- [ ] Journey photo upload → path `{tenant_id}/members/...`
- [ ] Marketing gallery upload → path `{tenant_id}/brand/...` or gallery prefix
- [ ] Exercise video upload → path `{tenant_id}/exercises/...`
- [ ] Cross-tenant storage path rejected by API validation
- [ ] Signed URLs work for member-owned assets only

---

## 7. Marketing & attribution (tenant isolation)

- [ ] Public lead form creates `ma5_leads` with `tenant_id`
- [ ] Attribution visit persists `ma5_visitor_sessions` with `tenant_id`
- [ ] Admin lead PATCH cannot update another tenant’s lead UUID
- [ ] Admin privacy: delete visitor / delete lead / purge expired — tenant-scoped only
- [ ] Sampled visit purge does not remove another tenant’s visitor sessions
- [ ] `anon` / `authenticated` cannot execute `ma5_purge_expired_anonymous_visitors` (SQL verify above)

**Cross-tenant (staging seed tenant B):**

- [ ] Admin actions as tenant A cannot mutate tenant B lead/visitor rows when UUID is known

---

## 8. Automated checks (CI / local)

```bash
npm run typecheck
npm test
```

- [ ] All tests pass (includes marketing tenant-isolation + attribution purge tests)

---

## 8b. Hub performance (Preview / staging)

- [ ] Deploy includes latest hub perf changes (non-blocking `refresh`, route `loading.tsx`, DB-first membership).
- [ ] In Vercel → MA5 project → **Speed Insights**, confirm data for `/app/*` and `/admin/*` (component is in root `layout.tsx`).

---

## 9. Sign-off

| Role | Name | Date | Notes |
|------|------|------|-------|
| Engineering | | | |
| Owner / ops | | | |

**Only after all boxes checked:**

1. Point **production** MA5 deployment env at Signal Works (same migration chain + `036`)
2. Register **live** Stripe webhook to production URL
3. Repoint **production domain** DNS / Vercel production env
4. Re-run smoke tests §1–§7 on production with live keys (checkout in live mode per ops plan)

**If staging fails:** keep production on hobby DB or previous stack; do not cut over domain. See [09-dry-run-cutover-rollback.md](./09-dry-run-cutover-rollback.md).

---

## Related docs

- [10-acceptance-test-plan.md](./10-acceptance-test-plan.md) — AT-xxx IDs
- [09-dry-run-cutover-rollback.md](./09-dry-run-cutover-rollback.md) — cutover / rollback
- [RUNBOOK.md](./RUNBOOK.md) — migration apply order

# 06 — Stripe Migration Plan

**Planning only.** Two billing systems remain **strictly separate**.

---

## Approved deployment architecture

| Principle | Detail |
|-----------|--------|
| **Separate deployments** | Each client has its own application deployment (MA5 is one deployment today). |
| **Client-owned Stripe** | Each client uses its own Stripe account for member/customer commerce. |
| **Deployment-scoped secrets** | Each deployment stores that client's `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_ACCOUNT_ID` in its own environment. |
| **MA5 member payments** | Remain entirely inside MA5's Stripe account — processed only by the MA5 deployment. |
| **Signal Works billing** | Signal Works uses its **separate** Stripe account only to bill Signal Works clients (`signalworks-clients`). |
| **No Stripe Connect** | Not required for the current architecture. |
| **Connect reconsideration** | Only if multiple client tenants later share **one** application deployment. |

There is **no** central Signal Works payment platform processing member checkouts for client gyms.

---

## Architecture diagram

```text
┌─────────────────────────────┐     ┌─────────────────────────────┐
│  signalworks-clients deploy │     │       MA5 deploy            │
│  SW Stripe account          │     │  MA5-owned Stripe account   │
│  SW webhook secret          │     │  MA5 webhook secret         │
│  Bills MA5 (platform fees)  │     │  Bills gym members          │
└──────────────┬──────────────┘     └──────────────┬──────────────┘
               │                                   │
               └───────────┬───────────────────────┘
                           ▼
              Shared Supabase (tenant-scoped rows)
              SW tables: client_offers, tenant_subscriptions, …
              MA5 tables: ma5_payments, ma5_memberships, …
```

---

## A. Signal Works billing MA5 (SW → client)

| Aspect | Detail |
|--------|--------|
| Deployment | `signalworks-clients` only — **not** MA5 app |
| Tables | `client_offers`, `client_offer_items`, `tenant_subscriptions`, `purchases`, SW `stripe_webhook_events` |
| Stripe account | Signal Works platform Stripe account |
| Keys / webhook | SW deployment env; SW-dedicated webhook endpoint |
| Tenant resolution | SW handler resolves `tenant_id` per SW rules (portal / metadata on SW-created objects) |
| MA5 app changes | **None** in member-commerce paths |

MA5 migration does not modify SW webhook handling. MA5 member commerce must never write to SW commercial tables.

---

## B. MA5 billing gym members (MA5 → customers)

| Aspect | Detail |
|--------|--------|
| Deployment | MA5 application only |
| Stripe account | MA5-owned (client-owned) |
| Keys | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_ACCOUNT_ID` in **MA5 deployment** env |
| Webhook | Dedicated MA5 endpoint (`/api/stripe/webhook`) — verified with **MA5** `STRIPE_WEBHOOK_SECRET` |
| Database | Shared Supabase; all service-role writes include `tenant_id` from **deployment config** |

### B.1 Checkout metadata (audit / correlation — not tenant authority)

Server-side checkout creation may attach metadata for debugging and correlation. These fields are **not** the authority for tenant resolution on webhook ingest.

| Key | Value | Purpose |
|-----|-------|---------|
| `user_id` | `ma5_profiles.id` | Link payment to member |
| `product_id` | `ma5_products.id` | Link to catalog row |
| `product_slug` | optional legacy | Human-readable trace |
| `environment` | `test` / `live` | Environment tag |
| `tenant_id` | `{{MA5_TENANT_ID}}` | Optional cross-check only — must match deployment config if present |

Update at implementation: `src/lib/billing/checkout.ts`, `src/lib/stripe/sync-membership.ts`.

### B.2 Stripe objects — no historical migration

| Item | Action |
|------|--------|
| Hobby / test Stripe customers, subscriptions, payments | **Not imported** (D-22) |
| Staging | MA5 Stripe **test mode** — create new test customers during checkout tests |
| Production | MA5-owned live account — new records as real customers onboard |
| `ma5_products` DB rows | Created via admin or seed script on destination — not copied from hobby |

No `scripts/stripe-backfill-metadata.ts` for historical objects.

### B.3 MA5 webhook processing (required behavior)

Handler: `src/app/api/stripe/webhook/route.ts` → `src/lib/billing/webhooks.ts`

| Step | Rule |
|------|------|
| 1. Verify signature | `stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)` using **MA5 deployment** secret |
| 2. Resolve tenant | `tenant_id = resolveMa5TenantFromDeployment()` — from secure server config (`MA5_TENANT_ID` env or successor resolver). **Never** from request body, query params, or client-supplied headers |
| 3. Resolve Stripe account | `stripe_account_id = process.env.STRIPE_ACCOUNT_ID` (or equivalent deployment config) |
| 4. Deduplicate | Insert into `ma5_stripe_webhook_events` with `unique(stripe_account_id, stripe_event_id)`; skip if conflict |
| 5. Scope all DB access | Every service-role `select` / `insert` / `update` includes `.eq('tenant_id', resolvedTenantId)` |
| 6. Optional metadata check | If `event.data.object.metadata.tenant_id` present and ≠ deployment tenant → **reject** (misconfigured checkout) |
| 7. Separation guard | Handler must not write to SW commercial tables (`client_offers`, `tenant_subscriptions`, SW `stripe_webhook_events`, etc.) |

**Rejected patterns:**

- Using Stripe event metadata as the sole source of `tenant_id`
- Accepting `tenant_id` from webhook request body or custom headers
- Processing events without signature verification
- Service-role queries without `tenant_id` filter

### B.4 Webhook event table (new)

```sql
-- Conceptual — migration 033
create table public.ma5_stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  stripe_account_id text not null,  -- acct_xxx from MA5 deployment env
  stripe_event_id text not null,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload_hash text,
  unique (stripe_account_id, stripe_event_id)
);

create index ma5_stripe_webhook_events_tenant_idx
  on public.ma5_stripe_webhook_events (tenant_id, processed_at desc);
```

| Concern | Approach |
|---------|----------|
| Signature verification | MA5 `STRIPE_WEBHOOK_SECRET` — raw body |
| Tenant authority | Deployment config only |
| Deduplication | `unique(stripe_account_id, stripe_event_id)` |
| Idempotent upserts | `ma5_payments`, `ma5_memberships` on conflict keys + `tenant_id` filter |
| Replay | Admin script re-process from stored payload (future) |
| Wrong Stripe account | SW platform events cannot verify against MA5 webhook secret — naturally rejected at step 1 |

### B.5 Association map

| Stripe object | Internal table | Link fields |
|---------------|----------------|-------------|
| Customer | `ma5_profiles` | `stripe_customer_id`, `tenant_id` |
| Subscription | `ma5_memberships` | `stripe_subscription_id` |
| Checkout session | `ma5_checkout_sessions` | `stripe_checkout_session_id` |
| PaymentIntent | `ma5_payments` | `stripe_payment_intent_id` |
| Invoice | `ma5_invoices` | `stripe_invoice_id` |

Bookings: `ma5_bookings.stripe_checkout_session_id` — row carries `tenant_id` from deployment config at write time.

### B.6 Test-mode validation before live

1. Stripe CLI forward to MA5 staging deployment using MA5 test webhook secret.
2. Complete test checkout — verify DB rows scoped to deployment `MA5_TENANT_ID`.
3. Replay same event — dedup by `(stripe_account_id, stripe_event_id)` prevents duplicate payment.
4. POST event with valid signature but metadata `tenant_id` for a different tenant — **rejected** (if metadata check enabled).
5. POST SW-platform Stripe event to MA5 webhook URL — signature verification **fails** (different secret).
6. Cutover: confirm MA5 Stripe dashboard webhook points to MA5 deployment URL only.

### B.7 Missed events

After production launch, run Stripe Events API backfill against **MA5's live Stripe account** only for events after cutover — not hobby test history.

---

## C. Environment variables (MA5 deployment)

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | MA5 Stripe API calls |
| `STRIPE_PUBLISHABLE_KEY` | Client-side Elements |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_ACCOUNT_ID` | `acct_xxx` for dedup key and logging |
| `MA5_TENANT_ID` | Authoritative tenant UUID for this deployment — **transitional fallback** until `tenant_domains` resolver is live (D-17) |

`MA5_TENANT_ID` is deployment configuration — same trust model as Stripe keys. Not accepted from HTTP requests. **Remove from env** once dynamic hostname resolution replaces it (D-17).

---

## D. Files to change (implementation — not started)

| File | Change |
|------|--------|
| `src/lib/billing/checkout.ts` | Optional metadata; tenant from deployment on DB writes |
| `src/lib/billing/webhooks.ts` | Deployment tenant resolution; dedup; scoped queries |
| `src/lib/stripe/sync-membership.ts` | Scope by deployment tenant |
| `src/app/api/stripe/webhook/route.ts` | Signature verify; no body tenant trust |
| `supabase/migrations/027_*` | `ma5_stripe_webhook_events` with composite unique |

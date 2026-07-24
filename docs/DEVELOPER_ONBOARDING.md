# MA5 developer onboarding (platform ops)

One place to remember **env vars**, **where logs live**, and **how auth, email, Stripe, Supabase, and Vercel fit together** after staging work on Signal Works.

**Preview host (typical):** `https://ma5.hiresignalworks.com`  
**Tenant:** `ma5-performance` → `MA5_TENANT_ID` = `d71ada88-8fad-466f-9264-3a479d54d6e2`  
**Location:** `MA5_LOCATION_ID` = `ac85a800-91cc-4ba5-a42c-9b55eac4653a` (see [migration/STAGING_CHECKLIST.md](./migration/STAGING_CHECKLIST.md))

---

## 1. Architecture in 60 seconds

| Layer | Role |
|--------|------|
| **Next.js (MA5)** | App Router on Vercel; client hub `/app`, staff hub `/admin` |
| **Signal Works Supabase** | Shared Postgres + Auth + Storage; all `ma5_*` tables are **tenant-scoped** |
| **Resend** | **All** transactional/auth email the app sends (not Supabase SMTP) |
| **Supabase Auth** | Users, sessions, `generateLink()` for invite/recovery URLs — **no** `inviteUserByEmail` / `resetPasswordForEmail` on MA5 paths |
| **Stripe** | Catalog checkout, subscriptions; **ledger in DB** via webhooks (+ membership success redirect) |

**Wrong DB migrations = disaster:** Only apply `MA5/supabase-signalworks/migrations/`. Never run `MA5/supabase/migrations/` on Signal Works. See [supabase-signalworks/README.md](../supabase-signalworks/README.md).

---

## 2. Environment variables (Vercel + local)

Copy from [`.env.example`](../.env.example). After changing secrets on Vercel, **redeploy** the environment that serves your hostname.

### Must align with the browser URL

| Variable | Why it matters |
|----------|----------------|
| `NEXT_PUBLIC_SITE_URL` | Checkout success/cancel URLs, auth links, email link base — **must match** the host users actually use (no trailing slash mismatch) |
| Stripe webhook URL | Same host + `/api/stripe/webhook` |
| Supabase **Redirect URLs** | Must include that host’s `/auth/callback`, `/auth/accept-invite`, `/auth/reset-password` |

### Signal Works deployment (server)

| Variable | Purpose |
|----------|---------|
| `MA5_TENANT_ID` | Every service-role write; webhook + checkout ledger |
| `MA5_LOCATION_ID` | Scheduling default location |
| `STRIPE_ACCOUNT_ID` | `acct_…` — **required** for webhook dedup (`ma5_stripe_webhook_events`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; never in client bundles |

### Supabase (public + server)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server anon client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | RLS-scoped client |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS for webhooks, admin sync, membership summary |

### Email (Resend)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Outbound API |
| `AUTH_EMAIL_FROM` | Member invite, recovery, activation (verified domain in Resend) |
| `CONTACT_EMAIL_FROM` / `CONTACT_TO_EMAIL` | Staff lead notify (optional) |

Auth email is “configured” only when **both** `RESEND_API_KEY` and `AUTH_EMAIL_FROM` are set (`isAuthEmailDeliveryConfigured()`).

### Stripe

| Variable | Purpose |
|----------|---------|
| `STRIPE_SECRET_KEY` | Server checkout + webhook verify |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Checkout.js / Elements if used |
| `STRIPE_WEBHOOK_SECRET` | Must match **the** Dashboard endpoint’s signing secret (`whsec_…`) |

Price IDs live in **`ma5_products.current_stripe_price_id`** — not in env.

### Preview-only gotcha

If Stripe/MA5 vars exist on **Preview** but the custom domain points at **Production** without those vars, checkout or webhooks will fail. Match **domain → Vercel environment → env vars**.

### Vercel Deployment Protection

Protected previews return **401** `Protected deployment` to Stripe (and any unauthenticated POST).

**Fix:** [Protection Bypass for Automation](https://vercel.com/docs/security/deployment-protection/methods-to-bypass-deployment-protection/protection-bypass-automation) — append to Stripe webhook URL:

```text
https://ma5.hiresignalworks.com/api/stripe/webhook?x-vercel-protection-bypass=YOUR_SECRET
```

Optional: set `VERCEL_AUTOMATION_BYPASS_SECRET` in Vercel for CI; Stripe only needs the query param on the endpoint URL.

---

## 3. Email & invites

### Policy: Resend + app-owned templates, not Supabase SMTP

- **Do** use `lib/email/auth-email-flows.ts`, `generateLink()`, and Resend via `EmailService` / `ResendProvider`.
- **Do not** use Supabase **SMTP** or built-in `inviteUserByEmail` / `resetPasswordForEmail` for MA5 product flows.
- Supabase still owns **Auth users** and **session**; redirect URLs in Supabase Dashboard must allow your app to complete `/auth/callback` and `/auth/accept-invite`.

**Inventory:** [EMAIL_INVENTORY.md](./EMAIL_INVENTORY.md)  
**Copy/templates:** [AUTH_EMAIL_TEMPLATES.md](./AUTH_EMAIL_TEMPLATES.md)  
**ADR:** `docs/adr/0007-tenant-auth-email-via-resend.md` (repo root)  
**Phase 3 DB branding:** migration `041_tenant_email_settings.sql` → `public.tenant_email_settings`

### Main flows

| Flow | API / code |
|------|------------|
| Client invite / resend | `POST /api/admin/members/invite` |
| Coach invite | `POST /api/admin/coaches/invite` |
| Forgot password | `POST /api/auth/forgot-password` |
| Accept invite | `/auth/accept-invite` + `POST /api/auth/accept-invite` |
| Session from link | `/auth/callback` (client handler) |

### Supabase Dashboard checklist

1. **Authentication → Providers → Email:** disable public sign-ups (invite-only).
2. **URL configuration:** Site URL + redirect allowlist for each deployed host.
3. **Do not** rely on Supabase email templates for invites if Resend is configured.

### When email “doesn’t arrive”

| Check | Where |
|-------|--------|
| Resend delivery / bounce | [Resend Dashboard](https://resend.com/emails) → Logs |
| API errors | Vercel → Project → **Logs** (filter `/api/admin/members/invite`, `/api/auth/forgot-password`) |
| Missing env | `RESEND_API_KEY`, `AUTH_EMAIL_FROM` on **same** deployment as the invite action |
| Link lands wrong host | `NEXT_PUBLIC_SITE_URL` vs actual link in email |
| Invite accepted but stuck “Invited” | `040` migration, accept-invite route, `invite_generation` — see lifecycle docs in migrations `037`–`040` |

---

## 4. Stripe & billing

**Setup:** [STRIPE_TEST_SETUP.md](./STRIPE_TEST_SETUP.md)  
**Deep plan:** [migration/06-stripe-migration-plan.md](./migration/06-stripe-migration-plan.md)

### Source of truth

1. **Webhooks** → `POST /api/stripe/webhook` → `lib/billing/webhooks.ts` → `ma5_*` ledger.
2. **Membership checkout success** → `GET /api/stripe/membership-paid?checkout_session_id=…` (backfill if webhooks were blocked).
3. **Class/session checkout** → `GET /api/stripe/session-paid?checkout_session_id=…`.

Returning from Stripe **does not** replace webhooks for renewals, failures, or refunds.

### Webhook events to subscribe (test + live)

`checkout.session.completed`, `checkout.session.expired`, `customer.subscription.*`, `invoice.paid`, `invoice.payment_failed`, `payment_intent.*`, `charge.refunded` — full list in STRIPE_TEST_SETUP.

### Symptom → where to look

| Symptom | First places to check |
|---------|------------------------|
| Paid in Stripe, DB empty | Stripe **Webhooks** → endpoint → **Recent deliveries** (status/body). Often **401** Vercel protection or **400** wrong `STRIPE_WEBHOOK_SECRET`. |
| `ma5_stripe_webhook_events` empty | Webhook never reached app (URL, protection, wrong host env). |
| `ma5_checkout_sessions.status = open` | `checkout.session.completed` never processed — resend event or hit `membership-paid` URL while logged in. |
| Profile shows plan but no dates | `current_period_end` null — resend subscription event or re-run `membership-paid`; see `stripe-subscription-periods.ts`. |
| Admin revenue $0, recent payment $1 | Gym-timezone “today” vs UTC timestamp — see `features/analytics/queries.ts` (`sumRevenueGymToday`). |
| Checkout 403 for staff buying | `isActiveOperationalClient` — active **client** profile required for member checkout. |

### Stripe Dashboard (bookmark these)

- **Test mode toggle** (top right)
- **Payments** — individual Checkout sessions (`cs_test_…`)
- **Developers → Webhooks** — delivery logs, resend, signing secret
- **Developers → Events** — raw event stream (debug metadata `user_id`, `product_slug`)
- **Logs** (Stripe Workbench) — API request failures from your server’s `sk_test_`

### SQL sanity (Signal Works SQL editor)

```sql
-- Webhooks reaching the app?
select event_type, processing_status, left(coalesce(last_error,''), 120), created_at
from public.ma5_stripe_webhook_events
where tenant_id = 'd71ada88-8fad-466f-9264-3a479d54d6e2'
order by created_at desc limit 15;

-- Checkout + membership for a user
select status, stripe_subscription_id, created_at
from public.ma5_checkout_sessions
where user_id = '<uuid>' order by created_at desc;

select status, current_period_end, stripe_subscription_id
from public.ma5_memberships where user_id = '<uuid>';

select status, amount_cents, created_at
from public.ma5_payments where user_id = '<uuid>' order by created_at desc;
```

---

## 5. Supabase

### Migrations

- Apply in order: `MA5/supabase-signalworks/migrations/`
- Track applied state in your runbook; verify with table/column checks in file headers.
- **041** optional until admin Email Settings UI; **040** required for accept-invite with lifecycle **037–039**.

### RLS & service role

- Browser uses **anon** + user JWT → RLS.
- Webhooks, invite side effects, analytics aggregates (some paths) use **service role** + explicit `tenant_id` from `MA5_TENANT_ID`.
- Never read `process.env.MA5_TENANT_ID` outside `lib/tenant/deployment.ts` / tenant service helpers.

### Auth debugging

| Issue | Check |
|-------|--------|
| Random logout on marketing | Middleware refreshes session — `src/middleware.ts` |
| Access disabled / invited | `ma5_profiles.client_status`, `invitation_status`, middleware redirects |
| User wrong tenant | `ma5_profiles.tenant_id`, `ma5_user_roles` |

### Supabase Dashboard

- **Authentication → Users** — confirm user exists, email confirmed
- **Logs → Postgres / API** — RLS violations, 403 from client
- **SQL Editor** — migrations and diagnostics (above)

---

## 6. Vercel

| Task | Where |
|------|--------|
| Env vars per environment | Project → **Settings → Environment Variables** |
| Which env serves domain | **Settings → Domains** (Production vs Preview) |
| Runtime errors | **Deployments → … → Logs** or **Observability** |
| Deployment Protection | **Settings → Deployment Protection** + bypass secret |
| Redeploy after env change | Deployments → **Redeploy** |

**Functions:** Stripe webhook and auth routes are serverless — timeouts show in deployment logs.

---

## 7. Local development

```bash
cd MA5
cp .env.example .env.local   # fill Supabase, Stripe test, Resend, MA5_TENANT_ID, etc.
npm run dev
```

**Stripe webhooks locally:**

```bash
npx stripe listen --forward-to localhost:3000/api/stripe/webhook
# Use the CLI whsec_... as STRIPE_WEBHOOK_SECRET in .env.local
```

**Tests:** `npm test`, `npm run typecheck`, `npm run build` (note: some admin pages may require Supabase at build if not marked dynamic).

---

## 8. Hub performance (optional context)

Prefetch and unread-count audit: [network-request-audit.md](./network-request-audit.md).  
Staff unread RPC: migration **042**.

---

## 9. Staging / release gate

Before treating Preview as “done”: [migration/STAGING_CHECKLIST.md](./migration/STAGING_CHECKLIST.md)  
Full migration runbook: [migration/RUNBOOK.md](./migration/RUNBOOK.md)

---

## 10. Doc index (by topic)

| Topic | Doc |
|-------|-----|
| Email inventory & Resend | [EMAIL_INVENTORY.md](./EMAIL_INVENTORY.md) |
| Auth email copy | [AUTH_EMAIL_TEMPLATES.md](./AUTH_EMAIL_TEMPLATES.md) |
| Stripe test setup | [STRIPE_TEST_SETUP.md](./STRIPE_TEST_SETUP.md) |
| Migrations list | [supabase-signalworks/README.md](../supabase-signalworks/README.md) |
| RLS / auth plan | [migration/04-rls-and-authorization-plan.md](./migration/04-rls-and-authorization-plan.md) |
| Stripe webhooks schema | [migration/06-stripe-migration-plan.md](./migration/06-stripe-migration-plan.md) |
| Communication / messaging | [COMMUNICATION_IMPLEMENTATION.md](./COMMUNICATION_IMPLEMENTATION.md) |
| PWA / push | [PWA_WEB_PUSH.md](./PWA_WEB_PUSH.md) |
| Cursor rules (MA5) | `/.cursor/rules/ma5-platform-ops.mdc` |

---

## 11. Quick “I forgot” checklist

- [ ] Stripe **test mode** on?
- [ ] Webhook URL = `NEXT_PUBLIC_SITE_URL` + `/api/stripe/webhook` (+ Vercel bypass if protected)?
- [ ] `STRIPE_WEBHOOK_SECRET` from **that** endpoint?
- [ ] `MA5_TENANT_ID`, `MA5_LOCATION_ID`, `STRIPE_ACCOUNT_ID` on the deployment behind the domain?
- [ ] Resend: `RESEND_API_KEY` + `AUTH_EMAIL_FROM`?
- [ ] Supabase redirect URLs include this host?
- [ ] Migrations applied on **Signal Works** project (not hobby)?
- [ ] Checked Stripe **webhook delivery** body before blaming app code?

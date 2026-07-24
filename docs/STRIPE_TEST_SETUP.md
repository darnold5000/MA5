# Stripe test setup (MA5 catalog billing)

Use **Stripe test mode** so no real charges happen.

Offerings (products + prices) are managed in **Admin → Offerings**. Saving an offering creates Stripe Product/Price objects automatically. Do **not** store Price IDs in Vercel env vars.

## 1. Stripe Dashboard (account credentials only)

1. Create/sign in at https://dashboard.stripe.com
2. Toggle **Test mode** ON.
3. Developers → **API keys** → copy:
   - Publishable key (`pk_test_…`)
   - Secret key (`sk_test_…`)

You do **not** need to create Products/Prices in the Dashboard for MA5 catalog offerings.

## 2. Environment variables

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=https://your-demo-host.example
```

Redeploy after saving account credentials. Adding or repricing an offering does **not** require a redeploy.

## 3. Seed + sync catalog

1. Apply Supabase migration `013_stripe_catalog.sql` (seeds Mindbody plans into `ma5_products`).
2. Sign in as staff → **Admin → Offerings**.
3. Click **Sync missing to Stripe** (or edit/save each offering).

Checkout reads the active offering + `current_stripe_price_id` from Supabase.

## 4. Webhook (source of truth for payments)

1. Developers → **Webhooks** → Add endpoint
2. Endpoint URL: `https://your-demo-host.example/api/stripe/webhook`
3. Events:
   - `checkout.session.completed`
   - `checkout.session.expired`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET=whsec_...`

Membership and ledger rows are written by the webhook — and by the Checkout **success redirect** (`/api/stripe/membership-paid`) when webhooks are delayed or missing. Configure webhooks anyway for renewals, failures, and refunds.

Local forwarding:

```bash
npx stripe listen --forward-to localhost:3000/api/stripe/webhook
```

## 5. Auth for Checkout

Checkout requires a signed-in user.

**Demo client account**

| | |
| --- | --- |
| Name | Alex |
| Email | `ma5client@example.com` |
| Password | `1Password` |

**Demo coach account**

| | |
| --- | --- |
| Name | Mike |
| Email | `mike@ma5.com` |
| Password | `1Password` |
| Role | `coach` (staff access to `/admin`) |

## 6. Smoke test

1. Admin → Offerings → create or sync an active membership.
2. Sign in as client → `/app/billing` → Choose plan.
3. Complete Stripe test Checkout (`4242…`).
4. Confirm webhook marks membership active and ledger rows appear (`ma5_checkout_sessions`, `ma5_subscriptions` / `ma5_payments`).
5. Deactivate the offering in admin — it disappears from storefront; existing subscribers remain.

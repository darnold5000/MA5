# Stripe test setup (MA5 Mindbody-replacement demo)

Use **Stripe test mode** so no real charges happen.

## 1. Stripe Dashboard

1. Create/sign in at https://dashboard.stripe.com
2. Toggle **Test mode** ON (switch in the Dashboard).
3. Developers → **API keys** → copy:
   - Publishable key (`pk_test_…`)
   - Secret key (`sk_test_…`)
4. Products → **Add product** for each membership you want to sell (example: “Small Group 8x / month”, recurring monthly, $150).
5. Open each product’s **Price** → copy the Price ID (`price_…`).

Suggested Price env mapping (from `.env.example`):

| Env var | Product idea |
| --- | --- |
| `STRIPE_PRICE_SG_14` | Small group 14x / month |
| `STRIPE_PRICE_SG_12` | Small group 12x / month |
| `STRIPE_PRICE_SG_8` | Small group 8x / month |
| `STRIPE_PRICE_SG_4` | Small group 4x / month |
| `STRIPE_PRICE_OG_STANDARD` | Open Gym |
| `STRIPE_PRICE_OG_HOUSEHOLD` | Open Gym household |
| `STRIPE_PRICE_OG_SMALL_GROUP` | Open Gym small-group add-on |
| `STRIPE_PRICE_OG_SEMI_PRIVATE` | Open Gym semi-private add-on |

You can start with **one** price (e.g. only `STRIPE_PRICE_SG_8`) to test Checkout.

## 2. Vercel env (this deploy)

Project → Settings → Environment Variables → add for the preview/production you use:

```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_SG_8=price_...
NEXT_PUBLIC_SITE_URL=https://your-demo-host.example
```

Redeploy after saving.

## 3. Webhook (needed for membership status sync)

1. Developers → **Webhooks** → Add endpoint
2. Endpoint URL: `https://your-demo-host.example/api/stripe/webhook`
3. Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET=whsec_...`

Without Supabase, Checkout can still open; membership “active” status won’t persist until Supabase + webhook are both set.

## 4. Auth for Checkout

Checkout requires a signed-in user. That means Supabase must also be configured (`NEXT_PUBLIC_SUPABASE_*` + migrations). Then:

1. `/signup` → create account  
2. `/app/billing` → **Start membership**  
3. Pay with test card `4242 4242 4242 4242`, any future expiry, any CVC

## 5. Local optional

```bash
cp .env.example .env.local
# paste keys
npx stripe listen --forward-to localhost:3000/api/stripe/webhook
```

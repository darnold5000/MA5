# Stripe

Used on `demo/mindbody-replacement`.

- Client: `src/lib/stripe/index.ts`
- Price map: `src/lib/stripe/prices.ts`
- Routes: `src/app/api/stripe/{checkout,portal,webhook}/route.ts`

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_*` from `.env.example`.

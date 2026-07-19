# Stripe / billing

Catalog billing lives in `src/lib/billing/` (extractable payment module later).

- Stripe client: `src/lib/stripe/index.ts` (re-exported from `@/lib/billing`)
- Catalog + admin sync: `src/lib/billing/{catalog,offerings-admin}.ts`
- Checkout: `src/lib/billing/checkout.ts` → `POST /api/stripe/checkout`
- Webhooks / ledger: `src/lib/billing/webhooks.ts` → `POST /api/stripe/webhook`
- Admin UI: `/admin/offerings`

Env (account-level only): `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

Price IDs are stored on `ma5_products` / `ma5_prices` in Supabase — never in environment variables.

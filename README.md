# MA5 Performance Website

Modern Next.js website for MA5 Performance (Avon, Indiana), with on-site Mindbody booking via Branded Web Tools.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Vercel-ready deployment

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Scripts

```bash
npm run lint
npm run typecheck
npm run build
```

## Notes

- All primary booking CTAs route to `/book`.
- Mindbody scripts load only on booking-related routes.
- Official widget embed markup is required before production booking goes live.
- Do not invent testimonials, prices, credentials, or transformation claims.

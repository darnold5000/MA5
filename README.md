# MA5 Performance Website

Modern Next.js website for MA5 Performance (Avon, Indiana). The public marketing site is the foundation; platform features (auth, client/admin shells, booking replacement) are being added incrementally without redesigning the public look and feel.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS v4
- Supabase Auth/Postgres (platform foundation)
- Vercel deployment + Web Analytics

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Apply `supabase/migrations/001_platform_foundation.sql` in your Supabase project before enabling login.

## Scripts

```bash
npm run lint
npm run typecheck
npm run build
```

## Routes

- Public marketing pages — unchanged URLs and design
- `/login`, `/signup` — account auth (requires Supabase env)
- `/app` — Fitness Hub (client)
- `/admin` — Operations (staff)
- `/platform-preview` — internal demo index (not in public nav)

## Docs

- `docs/CURRENT_SYSTEM_AUDIT.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/discovery.md`

## Notes

- Primary booking CTAs still use Mindbody Explore; `/book` redirects there until native booking ships.
- Do not invent testimonials, prices, credentials, or transformation claims.
- Do not link `/platform-preview` in public navigation.

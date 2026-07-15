# MA5 Current System Audit

**Audited:** 2026-07-15  
**Repository:** `/MA5` (`ma5-web`)  
**Live site:** https://ma5.vercel.app/  
**Branch at audit:** `main` → work continues on `feature/platform-foundation`

---

## Executive summary

MA5 is a **marketing website only**. It uses Next.js App Router, TypeScript, and Tailwind CSS v4 with a custom dark / brand-red design system. Booking is deferred to **Mindbody Explore** via redirect and fallback links. There is **no** Supabase, Stripe, auth, middleware, API routes, database, PWA, contact form backend, or admin app in the current codebase.

**Rule for expansion:** extend this app; do not rebuild the public site or change its look and feel unless a new feature requires it.

---

## Existing technology

| Area | Finding | Exact paths / notes |
| --- | --- | --- |
| Next.js | **16.2.10** (App Router) | `package.json` |
| Router | App Router only (no `pages/`) | `src/app/` |
| React | **19.2.4** | `package.json` |
| TypeScript | **strict**, path alias `@/*` → `./src/*` | `tsconfig.json` |
| Styling | Tailwind CSS **v4** via `@import "tailwindcss"` + `@theme inline` | `src/app/globals.css`, `postcss.config.mjs` |
| Component library | **None** (no shadcn / Radix / MUI). Small shared primitives only | `src/components/shared/` |
| Fonts | Google: Oswald (display), Manrope (body) | `src/app/layout.tsx` |
| Auth | **None** | — |
| Database | **None** (no `supabase/` dir, no ORM) | — |
| Payments | **None** (no Stripe packages or code) | — |
| Deployment | Vercel-ready; Analytics package installed | `@vercel/analytics` in root layout |
| PWA | **None** (no web manifest, service worker, or install prompt) | — |
| Analytics | Vercel Analytics wired; custom `trackEvent` is a **dev console stub**; GA ID env exists but unused | `src/app/layout.tsx`, `src/lib/analytics.ts`, `.env.example` |
| API routes | **None** | no `src/app/api/` |
| Forms / email | Contact page is **mailto / links only**. `RESEND_API_KEY` and `CONTACT_TO_EMAIL` are in `.env.example` but **unused** | `src/app/contact/page.tsx`, `.env.example` |
| Validation | **No Zod / RHF** | — |

### Environment variables (documented)

From `.env.example`:

| Variable | Used? |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Yes (`src/lib/env.ts`) |
| `NEXT_PUBLIC_MINDBODY_*_WIDGET_ID` | Read in `env.ts` / booking content; widgets not wired with real embed markup |
| `NEXT_PUBLIC_MINDBODY_BOOKING_URL` | Yes (fallback / CTAs) |
| `RESEND_API_KEY` | **No** |
| `CONTACT_TO_EMAIL` | **No** |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Read in `env.ts`; **not** sent to GA |

---

## Existing application structure

### Public routes (marketing)

| Route | File |
| --- | --- |
| `/` | `src/app/(marketing)/page.tsx` *(moved under route group on foundation branch)* |
| `/training` | `src/app/(marketing)/training/page.tsx` |
| `/sports-performance` | `src/app/(marketing)/sports-performance/page.tsx` |
| `/open-gym` | `src/app/(marketing)/open-gym/page.tsx` |
| `/nutrition` | `src/app/(marketing)/nutrition/page.tsx` |
| `/facility` | `src/app/(marketing)/facility/page.tsx` |
| `/about` | `src/app/(marketing)/about/page.tsx` |
| `/transformations` | `src/app/(marketing)/transformations/page.tsx` |
| `/contact` | `src/app/(marketing)/contact/page.tsx` |
| `/services/inbody-scan` | `src/app/(marketing)/services/inbody-scan/page.tsx` |
| `/services/infrared-sauna` | `src/app/(marketing)/services/infrared-sauna/page.tsx` |
| `/privacy` | `src/app/(marketing)/privacy/page.tsx` |
| `/terms` | `src/app/(marketing)/terms/page.tsx` |
| `/book` | **Redirect** → Mindbody Explore (`next.config.ts`); page still exists at `(marketing)/book/page.tsx` but is unreachable via `/book` |

### Redirects (`next.config.ts`)

- `/book` → Mindbody Explore (temporary, non-permanent)
- Legacy GoDaddy URLs → new paths (see `docs/discovery.md`)

### Protected / admin routes

**None.**

### API routes

**None.**

### Reusable components

| Area | Paths |
| --- | --- |
| Layout | `src/components/layout/site-header.tsx`, `site-footer.tsx` |
| Home | `src/components/home/*` |
| Booking | `src/components/booking/booking-shell.tsx`, `mindbody-widget.tsx`, `booking-fallback.tsx` |
| Training | `src/components/training/training-pricing-section.tsx` |
| Transformations | `src/components/transformations/transformation-gallery.tsx` |
| Shared | `button-link.tsx`, `section-heading.tsx`, `service-card.tsx`, `sticky-book-button.tsx`, `placeholder-page.tsx`, `footer-credit.tsx` |

### Content / config modules

- `src/content/site-config.ts` — brand, nav, contact, booking URLs
- `src/content/booking.ts` — booking option tabs / widget keys
- `src/content/pricing.ts`, `services.ts`, `faqs.ts`, `testimonials.ts`, `transformations.ts`

### Lib

- `src/lib/env.ts` — public env helpers
- `src/lib/analytics.ts` — stub event tracker
- `src/lib/utils.ts` — `cn()` class joiner

### Database / auth / payments

| Item | Status |
| --- | --- |
| Database clients | None |
| Auth middleware | None |
| Migrations | None |
| Data models | Content TypeScript types only (no DB models) |
| User roles | None |
| Stripe code | None |
| Stripe packages | None |

---

## Current booking flow

1. Primary CTAs use `siteConfig.booking.path` → **Mindbody Explore URL** (external).
2. Sticky book button and header “Book” follow the same pattern.
3. `/book` is **hard-redirected** in `next.config.ts` to Mindbody Explore, so the in-app booking UI is currently bypassed.
4. In-app booking stack (dormant while redirect is active):
   - `BookingShell` service tabs
   - `MindbodyWidget` expecting official Branded Web Tools `scriptSrc` + `widgetMarkup`
   - Both are **undefined** today → “Booking calendar coming soon” + `BookingFallback`
5. Widget IDs may be set via env; sports-performance and open-gym have no widget mapping yet (`src/content/booking.ts` TODOs).

**Implication for Mindbody replacement:** keep external Mindbody CTAs working until native booking is ready; then remove/adjust the `/book` redirect carefully.

---

## Design system (preserve)

Do **not** replace these without an explicit redesign request:

- Background `#0b0b0b`, surface `#141414`, brand `#e2062b`
- Display: Oswald; body: Manrope
- Sharp corners / border-driven cards (not soft “AI default” UI)
- Nav and footer composition in `SiteHeader` / `SiteFooter`

---

## Technical debt and gaps

1. `/book` redirect vs. unused booking page — two competing paths.
2. Mindbody embeds never supplied; production booking is entirely off-site.
3. `RESEND_*` / contact form / GA measurement ID unused.
4. `trackEvent` does not forward to Vercel Analytics or GA4.
5. Privacy / terms content quality called out in `docs/discovery.md`.
6. No robots/noindex strategy for future internal tools yet.
7. `.gitignore` uses `.env*` (would ignore `.env.example` if re-added from scratch; file is already tracked).

---

## Assumptions and unknowns

| Item | Status |
| --- | --- |
| Supabase project for MA5 | **Unknown** — not configured in this repo. Sister fitness apps (dawg, cornerstonehoops, signalworks-clients) use a **shared** Supabase with **prefixed** tables (`dawg_*`, `sw_*`). Recommend `ma5_*` prefix on the same pattern unless MA5 gets a dedicated project. |
| Stripe account | **Unknown** — no code present. |
| Mindbody Branded Web Tools embeds | **Not yet provided** (per discovery + code TODOs). |
| Whether native booking should keep Mindbody during transition | Product decision for `demo/mindbody-replacement`. |
| Video provider (Mux vs Storage) | Deferred; abstract in `src/lib/video/`. |
| Owner availability for env / Vercel / Supabase setup | Required before auth and payments can run in production. |

---

## Confirmation checklist (plan gates)

| Gate | Result |
| --- | --- |
| Supabase already configured? | **No** — safe to introduce as first backend |
| Stripe packages / incomplete Stripe code? | **No** |
| Working public site to preserve? | **Yes** — treat marketing routes as frozen visually |
| Second database needed? | **No** — use one Supabase project |

---

## Post-audit foundation paths (this branch)

See `docs/IMPLEMENTATION_PLAN.md` for the updated plan with exact file paths introduced under `feature/platform-foundation`.

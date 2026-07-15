# MA5 Performance Platform — Implementation Plan (Updated)

Companion to the product plan. Paths below reflect the **post-audit** repository after `feature/platform-foundation`.

**Constraint:** Keep the existing marketing site look and feel. Platform UI reuses MA5 tokens (brand red, dark surfaces, Oswald/Manrope) but lives under separate route groups so marketing chrome is unchanged.

---

## 1. Branch strategy

| Branch | Purpose | Status |
| --- | --- | --- |
| `main` | Approved marketing website | Live |
| `feature/platform-foundation` | Auth, roles, schema, app shells, `/platform-preview` | Done |
| `demo/mindbody-replacement` | Booking, memberships, Stripe, client portal | **In progress** |
| `demo/external-training-platform` | Placeholder TrainHeroic/Trainerize cards | Planned |
| `demo/ma5-programs` | Exercises, workouts, programs, progress | Planned |
| `demo/ma5-messaging` | Coach/client messaging + notifications | Planned |
| `demo/ma5-analytics-ai` | BI + AI insights | Planned |

Internal comparison page: **`/platform-preview`** (not in public nav).

---

## 2. Exact file map (foundation)

### Docs

- `docs/CURRENT_SYSTEM_AUDIT.md` — system audit
- `docs/IMPLEMENTATION_PLAN.md` — this file
- `docs/discovery.md` — original content discovery (unchanged)

### Database

- `supabase/migrations/001_platform_foundation.sql` — `ma5_*` tables, RLS helpers, roles
- `supabase/seed.sql` — optional demo profiles (local/dev only)

### Auth / Supabase / permissions

- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — server + service clients
- `src/lib/supabase/middleware.ts` — session refresh
- `src/lib/supabase/tables.ts` — table name constants
- `src/middleware.ts` — protect `/app/*` and `/admin/*`
- `src/lib/permissions/roles.ts` — role types + capability matrix
- `src/lib/auth/session.ts` — current user + roles helpers
- `src/lib/env.ts` — extended with Supabase public checks (marketing env unchanged)
- `.env.example` — Supabase (+ future Stripe) placeholders

### Feature modules (scaffolds)

Each under `src/features/<domain>/` with `types.ts` and README-style stub exports:

- `auth`, `clients`, `scheduling`, `booking`, `memberships`, `billing`
- `exercises`, `workouts`, `programs`, `messaging`, `notifications`, `analytics`, `ai`

### App routes

| URL | Path | Notes |
| --- | --- | --- |
| Marketing pages | `src/app/(marketing)/**` | Same URLs; same header/footer |
| `/login`, `/signup` | `src/app/(auth)/**` | Minimal chrome; brand tokens |
| `/app` | `src/app/app/**` | Client shell (stub until Mindbody demo) |
| `/admin` | `src/app/admin/**` | Staff shell (stub) |
| `/platform-preview` | `src/app/platform-preview/**` | Internal; `noindex` |

### Layouts

- `src/app/layout.tsx` — fonts, html/body, Analytics only
- `src/app/(marketing)/layout.tsx` — SiteHeader, SiteFooter, StickyBookButton
- `src/app/(auth)/layout.tsx` — auth chrome
- `src/app/app/layout.tsx` — client app shell
- `src/app/admin/layout.tsx` — admin shell
- `src/app/platform-preview/layout.tsx` — minimal internal layout

### Shared platform UI

- `src/components/platform/app-shell.tsx`
- `src/components/platform/admin-shell.tsx`
- `src/components/platform/auth-card.tsx`
- `src/components/platform/status-banner.tsx`

---

## 3. Architecture decisions (locked from audit)

1. **Extend Next.js App Router app** — do not create a separate frontend.
2. **Introduce Supabase** — first backend; use `ma5_` table prefix (shared-project safe).
3. **No Stripe on foundation branch** — Stripe lands on `demo/mindbody-replacement`.
4. **Keep Mindbody CTAs** until native booking ships; `/book` redirect stays for now.
5. **Do not redesign marketing** — only structural route-group split for layouts.
6. **Abstract video** later in `src/lib/video/` — not in foundation schema beyond optional media table stub if needed.

---

## 4. User roles (foundation)

```text
owner | admin | staff | coach | client
```

- Stored in `ma5_user_roles` (multi-role).
- Capability helpers in `src/lib/permissions/roles.ts`.
- Owner: full access. Admin: manage ops/content. Staff: schedule/attendance. Coach: clients/programs/messaging. Client: own bookings/billing/programs.

---

## 5. Demo sequencing (after foundation merges)

1. Merge / preview-deploy `feature/platform-foundation`.
2. Branch `demo/mindbody-replacement` — products, memberships, classes, appointments, Stripe Checkout/Billing/Portal/webhooks, client bookings UI. Keep marketing CTAs; add `/app` booking flows.
3. Parallel demo branches for programs / messaging / analytics / external-training placeholders.
4. Update `/platform-preview` links with real Vercel preview URLs when available.

---

## 6. What not to do

- Do not remove or restyle marketing home/services/nav for platform work.
- Do not put `/platform-preview` in `siteConfig.navigation`.
- Do not store training videos in `public/` or the git repo.
- Do not invent Mindbody embed markup or fake TrainHeroic API connections.
- Do not add a second database.

---

## 7. Owner setup checklist (when available)

1. Create or assign Supabase project; apply `001_platform_foundation.sql`.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel + `.env.local`.
3. Enable Email auth (and optionally Google) in Supabase Auth.
4. Create Vercel preview deployments per demo branch.
5. Paste preview URLs into `src/content/platform-previews.ts`.

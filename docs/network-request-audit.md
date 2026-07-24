# Network request audit (MA5 hub)

**Stack:** Next.js 16.2 App Router, React 19 RSC, Server Actions (minimal), Route Handlers, middleware (`src/middleware.ts` → Supabase session refresh). No SWR/React Query.

**Date:** 2026-07-24

## Root cause summary

When staff use the Operations hub (e.g. leave **Community board** or **Messages**), the Network tab shows many `?_rsc=...` requests plus `/api/notifications/unread-count`. This is expected **Next.js `<Link>` viewport prefetch** combined with **heavy async Server Components** on each admin route—not spurious third-party calls.

| Layer | What happens |
|--------|----------------|
| **RSC prefetch** | Up to **10 visible sidebar links** (9 nav + Settings) use default `prefetch={true}`. Each prefetch is a separate GET that runs that route’s Server Component tree. |
| **DB behind prefetch** | Prefetches execute real Supabase reads (session via `getSessionUser`, page queries). **No Stripe/Resend writes** on GET/render. Analytics may load on full document navigations only. |
| **unread-count** | One hook per shell (`useHubUnreadCount`); extra calls come from **`router.refresh()`** after mark-read/mutations, **`HUB_BADGE_REFRESH_EVENT`**, and **window `focus`**. Dev **Strict Mode** doubles mount effects. |
| **Chat exit** | Thread views call **mark-read on mount** (not unmount). Leaving chat unmounts the thread; **no realtime hook is mounted** (`useCommunicationRealtime` is unused). **`refresh()` after mark-read** re-fetches the **entire current RSC page** plus unread-count. |
| **Duplicate nav** | Desktop sidebar + mobile bottom bar are both in the DOM (CSS hidden). Mobile menu links mount **only when open**. Bottom bar prefetches a **subset** of routes; desktop prefetches **all** sidebar hrefs. |

## Phase 1 — Platform inventory

| Capability | Used |
|------------|------|
| App Router | Yes (`src/app`) |
| RSC pages/layouts | Yes; hub layouts are thin wrappers around client shells |
| Server Actions | Rare; mostly Route Handlers + POST APIs |
| Middleware | Yes — auth cookie refresh on matched paths |
| `loading.tsx` | Admin/app hub routes (partial) |
| `router.refresh()` | `useServerRefresh` + thread mark-read |
| `router.prefetch()` | Not called directly |
| `revalidatePath` / `revalidateTag` | Not used in app code |
| `cache()` | `getSessionUser` only |

### Navigation surfaces

| Surface | File | Link count (approx.) |
|---------|------|----------------------|
| Admin desktop sidebar | `admin-shell.tsx` | 9 + Settings |
| Admin mobile menu | `admin-shell.tsx` | 9 + Settings (when open) |
| Admin mobile tabs | `admin-shell.tsx` | 4 |
| Client desktop sidebar | `app-shell.tsx` | 8 |
| Client mobile menu | `app-shell.tsx` | 8 + announcements (when open) |
| Client mobile tabs | `app-shell.tsx` | 5 (`prefetch` explicit) |
| Marketing header | `site-header.tsx` | Public links |
| Programs subnav | `programs-section-nav.tsx` | Admin library tabs |

## Request inventory (observed / traced)

| Request | Trigger | Type | External? | Server work | Necessary? | Recommendation |
|---------|---------|------|-------------|-------------|------------|----------------|
| `/admin/community?_rsc=...` | Sidebar link in viewport | RSC prefetch | Internal → Supabase | `loadCommunityBoard` (posts + profile names) | For prefetch: **No** | `prefetch={false}` |
| `/admin/settings?_rsc=...` | Sidebar footer link | RSC prefetch | Supabase | `getFacilitySettings`, `listCoaches` | Prefetch: **No** | `prefetch={false}` |
| `/admin/messages?_rsc=...` | Sidebar | RSC prefetch | Supabase | `loadCommunicationState` (threads, messages, clients) | **Heavy**; prefetch optional | Keep prefetch for frequent use **or** false |
| `/admin/marketing?_rsc=...` | Sidebar | RSC prefetch | Supabase | `getMarketingDashboard` | Prefetch: **No** | `prefetch={false}` |
| `/admin/offerings?_rsc=...` | Sidebar | RSC prefetch | Supabase | `listOfferings` (service role) | Prefetch: **No** | `prefetch={false}` |
| `/admin/reports?_rsc=...` | Sidebar | RSC prefetch | Supabase | `getBusinessReports` (large aggregates) | Prefetch: **No** | `prefetch={false}` |
| `/admin/programs?_rsc=...` | Sidebar | RSC prefetch | Supabase | Programs landing queries | Prefetch: **No** | `prefetch={false}` |
| `/admin/clients?_rsc=...` | Sidebar | RSC prefetch | Supabase | `listDirectoryMembers`, `listCoachClientProgress` | Moderate; often used | **Keep prefetch** |
| `/admin/schedule?_rsc=...` | Sidebar | RSC prefetch | Supabase | `listAllSessions` | Frequent | **Keep prefetch** |
| `/admin?_rsc=...` | Sidebar / logo | RSC prefetch | Supabase | `getDailyOpsDashboard`, `listCoachAttentionAlerts` | Heavy home | **Keep prefetch** (primary destination) |
| `/api/notifications/unread-count?staff=1` | Shell mount, focus, badge event, after `router.refresh` | API route | Supabase | `getUnreadBadgeCount` → RPC or counts | Yes, but dedupe | Shared in-flight fetch; badge-only after mark-read |
| `/api/community` | Community post/delete (client) | API GET | Supabase | List posts | User action | Keep |
| `community` (document) | Navigate to board | Navigation | Supabase | Same as prefetch | Yes | — |
| Middleware | Every navigation/prefetch | Edge | Supabase Auth | `getUser` cookie refresh | Yes | — |
| `@vercel/analytics` | Page load | Script | Vercel | None on server | Optional product | Unchanged |
| `@vercel/speed-insights` | Page load | Script | Vercel | None | Optional | Unchanged |

### Categories

1. **Document/navigation** — Full route loads when clicking a link.
2. **RSC prefetch** — `?_rsc=` flight requests; **can run full page loaders**.
3. **Internal API** — `/api/notifications/unread-count`, messaging, community CRUD.
4. **Supabase** — Auth (middleware + `getSessionUser`), REST/RPC from RSC and APIs. **Realtime:** hook exists but **not mounted** in UI.
5. **External paid** — Resend/Stripe only on POST routes and webhooks (see below). **Not on prefetch.**

## Admin route — server work on prefetch (GET)

| Route | Main server functions | Stripe | Resend |
|-------|----------------------|--------|--------|
| `/admin` | `getDailyOpsDashboard`, `listCoachAttentionAlerts` | No | No |
| `/admin/schedule` | `listAllSessions` | No | No |
| `/admin/clients` | `listDirectoryMembers`, `listCoachClientProgress` | No | No |
| `/admin/programs/*` | Library/assign queries | No | No |
| `/admin/reports` | `getBusinessReports` | No | No |
| `/admin/offerings` | `listOfferings` | No | No |
| `/admin/marketing` | `getMarketingDashboard` | No | No |
| `/admin/messages` | `loadCommunicationState` | No | No |
| `/admin/community` | `loadCommunityBoard` | No | No |
| `/admin/settings` | `getFacilitySettings`, `listCoaches` | No | No |

**Client `/app` layout** (`app/layout.tsx`): `getSessionUser` + `getActiveMembershipForUser({ allowStripeHydrate: false })` on every `/app/*` navigation/prefetch (DB only unless checkout sync).

## External API inventory (server)

| Provider | Call sites | Browser? | Prefetch risk | Side effects |
|----------|------------|----------|---------------|--------------|
| **Supabase** | RSC, middleware, APIs | Auth client if used | High (read volume) | mark-read POST only on user/thread view |
| **Stripe** | `api/stripe/*`, webhooks, `offerings-admin`, `sync-membership` (hydrate off in layout) | Checkout button → API | **Low** on GET render | Writes on checkout/webhook/admin sync |
| **Resend** | `resend-provider`, `auth-email-flows`, `notify-staff` | No | **None** on render | Send on invite/forgot/notify POST |
| **web-push** | `api/push/subscribe` | User gesture | None | Subscribe |
| **Vercel Analytics/Speed** | `app/layout.tsx` | Client | None | None |

## Chat exit sequence (traced)

1. User clicks sidebar → client navigation.
2. Thread component unmounts (no cleanup fetch).
3. Shell stays mounted → sidebar links remain in viewport → **prefetch queue** may run for other routes.
4. If user had been on thread: mark-read already ran on mount; **no extra mark-read on exit**.
5. Prior `refresh()` from mark-read may have fired **full RSC refresh** of thread page + unread-count.

## Implemented optimizations (this pass)

| Change | Impact | Risk |
|--------|--------|------|
| `AppNavLink` + hub prefetch policy | Fewer RSC prefetches on expensive routes | Low |
| Remove redundant `prefetch` on mobile tabs | Slight reduction | Low |
| Unread count in-flight dedupe + focus debounce | Fewer duplicate API calls | Low |
| Mark-read → badge refresh only (no `router.refresh`) | Less RSC churn leaving messages | Low–medium |
| Community board: drop `refresh()` when client reload succeeds | Less RSC after post | Low |
| `cache()` on membership read in app layout | Dedupe within one request | Low |
| Dev-only `MA5_DEBUG_DATA=1` logs on badge/session | Audit aid | Dev only |

## Validation

Run production mode:

```bash
npm run build && npm run start
```

Compare Network tab: leaving community should show **fewer** `?_rsc=` prefetches (reports, settings, marketing, offerings, programs, community disabled). unread-count should **not** double on mark-read alone.

## Intentionally unchanged

- Default prefetch on **Home, Schedule, Clients, Messages** (admin) and **Home, Schedule, Messages** (client).
- Window **focus** refetch for unread (tab return); debounced to limit bursts.
- `useServerRefresh` for form mutations that need fresh RSC props.
- Middleware session refresh (required for auth).

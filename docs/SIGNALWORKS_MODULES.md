# Signal Works platform modules (MA5)

MA5 is the **reference implementation** for several reusable modules in [`signalworks-modules`](../../signalworks-modules/README.md). When you add email, Stripe, chat, or analytics to another tenant, start from the module README + SQL, then map tables per [ma5-reference-map.md](../../signalworks-modules/docs/ma5-reference-map.md).

## Quick enable matrix

| Customer need | Module | MA5 already has |
|---------------|--------|-----------------|
| Transactional email (invites, reset) | `email` | Yes — `src/lib/email/` |
| Stripe subscriptions + webhooks | `stripe-core` + `signalworks-platform/billing` | Yes — `src/lib/billing/` |
| Staff/client messaging | `messaging` | Yes — `src/features/messaging/` |
| UTM + leads + funnel | `attribution` | Yes — `src/lib/attribution/` |
| Goals + progress photos | `member-journey` | Yes — Journey tab |
| Community board | `community` | Yes — admin + client community |
| Logo/avatar/journey uploads | `media-storage` | Yes — `storage-paths.ts` |
| Ops reports + revenue | `analytics-ops` | Yes — Reports + admin home |
| Hub prefetch / unread badge | `hub-navigation` | Yes — network audit optimizations |

## Integration checklist for a new client

1. Copy module SQL into `supabase-signalworks/migrations/` with the client table prefix.
2. Copy portable `src/` from the module (or subtree the whole `signalworks-modules` repo).
3. Set env vars from each module README (Resend, Stripe, tenant IDs).
4. Wire `tables.ts` constants to prefixed table names.
5. Apply RLS policies from MA5 migrations as a template (`029`, `034`, `043`, etc.).
6. Update [docs/module-catalog.md](../../docs/module-catalog.md) when the tenant goes live.

## Keeping modules in sync

When fixing platform behavior in MA5 (e.g. Stripe period dates, webhook dedup, Resend provider):

1. Fix in MA5 if the bug is integration-specific.
2. If the fix is tenant-agnostic, **also** update the matching file under `signalworks-modules/`.
3. Note the change in the module README changelog section if behavior changes.

## Not extracted (stay client-specific)

- MA5 branding, routes, `site-config`, marketing pages
- Programs/workouts/scheduling domain
- `ma5_` migrations already applied in Signal Works Supabase (do not rename in place)

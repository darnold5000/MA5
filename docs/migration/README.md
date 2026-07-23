# MA5 Shared Database Migration — Planning Package

**Status:** Migration `024` **applied** — tenant registered on Signal Works  
**MA5 tenant UUID:** `d71ada88-8fad-466f-9264-3a479d54d6e2` (slug `ma5-performance`) — [RUNBOOK.md](./RUNBOOK.md)  
**Next:** Migration `025`+ not authorized until explicitly requested

## Migration folders (critical)

| Path | Database |
|------|----------|
| `MA5/supabase/migrations/` (`001`–`023`) | Hobby Supabase — **do not run on Signal Works** |
| `MA5/supabase-signalworks/migrations/` (`024`+) | Signal Works shared — **destination only** |

## Scope summary

| Source (hobby Supabase) | Destination (Signal Works) |
|-------------------------|----------------------------|
| Schema reference only | Tenant-scoped `ma5_*` schema (empty, `024`+) |
| Test data — **not imported** | Bootstrap + staging seed |
| **Not modified** | MA5 app repointed via deploy env |

## Documents

| # | Document | Purpose |
|---|----------|---------|
| 01 | [target-schema-plan.md](./01-target-schema-plan.md) | Table-by-table schema, FK, RLS strategy |
| 02 | [migration-sequence.md](./02-migration-sequence.md) | Destination migrations in `supabase-signalworks/` |
| 03 | [data-backfill-plan.md](./03-data-backfill-plan.md) | Bootstrap + seed plan |
| 04 | [rls-and-authorization-plan.md](./04-rls-and-authorization-plan.md) | RLS matrix, helper functions |
| 05 | [auth-trigger-remediation.md](./05-auth-trigger-remediation.md) | App-only profiles; fresh invites |
| 06 | [stripe-migration-plan.md](./06-stripe-migration-plan.md) | New Stripe records only |
| 07 | [storage-migration-plan.md](./07-storage-migration-plan.md) | Empty destination buckets |
| 08 | [application-refactor-map.md](./08-application-refactor-map.md) | Files to change by phase |
| 09 | [dry-run-cutover-rollback.md](./09-dry-run-cutover-rollback.md) | Deploy cutover; env rollback |
| 10 | [acceptance-test-plan.md](./10-acceptance-test-plan.md) | Seeded staging + fresh invites |
| 11 | [open-decisions.md](./11-open-decisions.md) | Decisions log |
| — | [RUNBOOK.md](./RUNBOOK.md) | Applied migrations, confirmed tenant UUID |
| 12 | [feature-flag-cutover-strategy.md](./12-feature-flag-cutover-strategy.md) | Deploy env switch strategy |
| 13 | [tenant-bootstrap-lifecycle.md](./13-tenant-bootstrap-lifecycle.md) | New tenant onboarding |

## Confirmed tenant ID

`MA5_TENANT_ID=d71ada88-8fad-466f-9264-3a479d54d6e2` — see [RUNBOOK.md](./RUNBOOK.md).

Migrations `025`+ remain planning-only until authorized.

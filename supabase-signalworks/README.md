# MA5 → Signal Works destination migrations

**Apply only to the Signal Works shared Supabase project.**

## Do not confuse with hobby migrations

| Folder | Database | Apply to Signal Works? |
|--------|----------|------------------------|
| `MA5/supabase/migrations/` (`001`–`023`) | Old hobby Supabase | **Never** |
| `MA5/supabase-signalworks/migrations/` (`024`+) | Signal Works shared | **Yes** (this folder only) |

Running `MA5/supabase/migrations/` against Signal Works would apply the wrong schema and is **unsafe**.

Platform foundation must already be applied:

- `signalworks-platform/core/supabase/migrations/`
- `signalworks-clients/supabase/migrations/`

## Applying a migration

1. **Backup** the Signal Works database immediately before apply (production).
2. Review the SQL in the migration file.
3. Apply via Supabase SQL editor, `supabase db push` (if this folder is linked), or your approved pipeline.
4. Record the tenant UUID (see comment in `024_ma5_tenant_registration.sql`).

## Confirmed tenant

| Slug | UUID |
|------|------|
| `ma5-performance` | `d71ada88-8fad-466f-9264-3a479d54d6e2` |

Set `MA5_TENANT_ID` in MA5 deployment environment. Details: [docs/migration/RUNBOOK.md](../docs/migration/RUNBOOK.md).

## Migration chain

| # | File | Status |
|---|------|--------|
| 024 | `024_ma5_tenant_registration.sql` | Applied |
| 025 | `025_ma5_locations_bootstrap.sql` | Applied |
| 026 | `026_ma5_tenant_scoped_schema.sql` | Applied |
| 026b | `026b_ma5_schema_hygiene.sql` | Apply if not yet run |
| 027 | `027_ma5_stripe_webhook_events.sql` | Apply if not yet run |
| 028 | `028_ma5_rls_helpers.sql` | Applied |
| 029 | `029_ma5_rls_policies.sql` | Applied |
| 030 | — | Skipped (D-14) |
| 031 | `031_ma5_inherited_table_policies.sql` | Applied |
| 032 | `032_ma5_storage_policies.sql` | Revised (greenfield) |
| 032b | `032b_ma5_storage_policies_only.sql` | Applied (recovery; never with 032) |
| 032c | `032c_ma5_storage_safe_uuid.sql` | Applied |
| 034 | `034_ma5_rls_hardening.sql` | Applied |
| 035 | `035_ma5_stripe_webhook_processing_state.sql` | Applied |
| 036 | `036_ma5_purge_rpc_lockdown.sql` | Apply before staging sign-off |

Types: `npm run gen:types` (OpenAPI) or `npm run gen:types:cli` after `supabase login` + `npm run supabase:link`.

**Staging gate:** [docs/migration/STAGING_CHECKLIST.md](../docs/migration/STAGING_CHECKLIST.md)

**Staging seed (manual only):** `seeds/033_ma5_staging_seed.sql` — not applied during production migrations. See [seeds/README.md](./seeds/README.md).

See [docs/migration/02-migration-sequence.md](../docs/migration/02-migration-sequence.md).

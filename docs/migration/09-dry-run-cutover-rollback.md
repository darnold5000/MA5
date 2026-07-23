# 09 — Dry-Run, Cutover, and Rollback

**Planning only.** **Scope (D-22):** Clean destination deployment + app cutover — **not** historical data synchronization.

```text
Clean destination schema
  → bootstrap
  → seed staging
  → point MA5 staging deploy at Signal Works DB
  → validate
  → cut over MA5 production deploy
```

The old hobby Supabase database is **not modified**. Other apps on hobby DB remain untouched.

---

## 1. Pre-work (destination)

| Step | Action |
|------|--------|
| 1 | Confirm Signal Works platform migrations applied (`tenants`, `tenant_domains`, …) |
| 2 | Backup Signal Works DB before first MA5 schema migration (standard ops) |
| 3 | Tag MA5 app `pre-sw-db-cutover` |
| 4 | Document hobby DB connection in MA5 deploy env (rollback reference) |

**Not required:** hobby MA5 table export, row-count snapshots, Stripe test object export, storage inventory from hobby.

---

## 2. Staging dry run

| Step | Detail |
|------|--------|
| 1 | Apply migrations `024`–`032` on Signal Works (staging or branch) |
| 2 | Run `033` staging seed only |
| 3 | Execute bootstrap per [03-data-backfill-plan.md](./03-data-backfill-plan.md) |
| 4 | Point **MA5 staging** deployment to Signal Works Supabase URL + keys |
| 5 | Set `MA5_TENANT_ID`, MA5 Stripe **test** keys, test webhook secret |
| 6 | Bootstrap gym owner via invite |
| 7 | Run acceptance tests ([10-acceptance-test-plan.md](./10-acceptance-test-plan.md)) |
| 8 | Stakeholder sign-off before production repoint |

---

## 3. Migration runtime expectations

| Migration | Est. duration | Notes |
|-----------|---------------|-------|
| 024–025 | < 1 min | Tenant + location bootstrap |
| 026 full schema | 1–5 min | Empty tables — no row updates |
| 027–032 | < 2 min | Policies, helpers |
| 033 seed | Seconds | Staging only |

**No write-freeze** on hobby DB — MA5 hobby instance unaffected until deploy env changes.

---

## 4. Pre-cutover checks (destination)

```sql
select id from tenants where slug = 'ma5-performance';
select id, slug from ma5_locations where tenant_id = '{{MA5_TENANT_ID}}';
-- Schema present
select count(*) from information_schema.tables
where table_schema = 'public' and table_name like 'ma5_%';
```

| Check | Pass criteria |
|-------|---------------|
| Migrations 024–032 applied | Yes |
| Default location `main` exists | Yes |
| MA5 staging on Signal Works DB | Smoke tests pass |
| Stripe test webhook registered to staging URL | Yes |
| Hobby DB untouched | No MA5 migration scripts run there |

---

## 5. Write-freeze requirements

| System | Freeze? |
|--------|---------|
| Hobby Supabase (MA5 tables) | **No** — not part of cutover |
| Signal Works DB during 024–032 | Brief maintenance window optional |
| MA5 production deploy | Repoint only after staging approval |

---

## 6. Application cutover order

| Order | Action |
|------:|--------|
| 1 | Complete staging validation |
| 2 | Apply `024`–`032` on production Signal Works DB (skip `033` on prod) |
| 3 | Bootstrap production: tenant (if not shared with staging), location, owner invite |
| 4 | Upload approved brand assets manually (if any) |
| 5 | Configure MA5 production deploy: Signal Works URL, `MA5_TENANT_ID`, live Stripe keys, live webhook |
| 6 | Register `tenant_domains` for production hostname |
| 7 | Smoke tests on production |
| 8 | Decommission MA5 → hobby DB connection from deploy env |

---

## 7. Stripe

| Environment | Approach |
|-------------|----------|
| Staging | MA5 Stripe **test mode**; new test customers during checkout tests |
| Production | MA5-owned live account; **new** customers as real users onboard |
| Not in scope | Import test customers, subscriptions, or webhook history from hobby |

---

## 8. Storage

| Action | Detail |
|--------|--------|
| Destination | Empty buckets; tenant-prefixed paths from first upload |
| Optional | Manually upload approved logo/imagery/waivers |
| Not in scope | Copy hobby test objects |

---

## 9. Smoke tests (staging then production)

| Test | Expected |
|------|----------|
| Owner login after invite | Admin access |
| Member invite → accept | Profile with correct `tenant_id` |
| Public lead form | Lead row on destination |
| Stripe test checkout (staging) | New test payment row |
| Upload progress photo | Path under `{tenant_id}/members/...` |
| Cross-tenant (seeded Tenant B) | **Denied** |

---

## 10. Rollback

**Rollback means:** switch MA5 deployment env back to **hobby Supabase** connection if the Signal Works destination fails **before** live production use is accepted.

| Step | Action |
|------|--------|
| 1 | Revert `NEXT_PUBLIC_SUPABASE_URL` and keys to hobby project |
| 2 | Redeploy MA5 app previous tag |
| 3 | No row sync between databases required |
| 4 | Signal Works MA5 schema rows may remain (orphaned) or be dropped per ops decision |

**Not rollback:** reconciling test data between hobby and Signal Works.

---

## 11. Post-cutover

| Signal | Tool |
|--------|------|
| RLS denials | Supabase logs |
| API 5xx | Vercel |
| Stripe webhooks | MA5 dashboard + `ma5_stripe_webhook_events` |
| New profiles without invite | Should be **zero** (D-14) |

---

## 12. Hobby database after cutover

| Item | Action |
|------|--------|
| MA5 hobby tables | Inactive — no further MA5 deploy connections |
| Other hobby apps | **Unchanged** |
| MA5 test data | May be discarded; no retention requirement for migration |

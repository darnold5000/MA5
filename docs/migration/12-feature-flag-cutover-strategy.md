# 12 — Feature Flag and Cutover Strategy

**Planning only.** Implements **D-20**. Updated for **D-22** (clean destination — no hobby data migration).

Every migration phase must answer: **Can old and new code coexist? How do we switch?**

---

## 1. Principles

| Principle | Detail |
|-----------|--------|
| **Database cutover** | MA5 deploy switches `NEXT_PUBLIC_SUPABASE_URL` from hobby → Signal Works |
| **Hobby DB untouched** | No migrations, no write-freeze, no row export on hobby |
| **RLS is a hard switch** | Once RLS migrations apply on destination, app **must** use tenant-scoped queries |
| **Transitional env** | `MA5_TENANT_ID` until hostname resolver verified (D-17) |

---

## 2. Phase coexistence matrix

| Phase | What changes | Hobby DB | MA5 deploy | Switch mechanism |
|-------|--------------|----------|------------|------------------|
| **A** — Destination schema | Apply 024–032 on Signal Works | **Untouched** | Still on hobby until step B | N/A |
| **B** — Staging repoint | MA5 staging → Signal Works URL | Untouched | Staging env vars | Deploy + env change |
| **C** — App tenant code | Resolver, scoped queries, webhooks | Untouched | Required for destination | App deploy with DB |
| **D** — Staging validation | Seed 033 + acceptance tests | Untouched | Staging on Signal Works | Test pass gate |
| **E** — Production repoint | Prod env → Signal Works | MA5 connection dropped | Production env vars | Approved cutover |
| **F** — Auth | App-only profiles (D-14) | N/A | Invite flows before go-live | No hobby user copy |

---

## 3. Per-feature switch detail

### 3.1 Database connection

| State | Connection | Coexistence |
|-------|------------|-------------|
| Pre-cutover | MA5 → hobby Supabase | Other hobby apps unchanged |
| Post-cutover | MA5 → Signal Works | Hobby MA5 data inactive |
| Rollback | Revert env to hobby URL | No data sync needed |

### 3.2 Bookings / all `ma5_*` writes

| State | Behavior |
|-------|----------|
| Destination | All inserts include `tenant_id` from resolver — schema enforces NOT NULL |
| Hobby | No writes after MA5 deploy repointed |

### 3.3 Public tenant resolution

Unchanged — see D-04. Remove `MA5_TENANT_ID` when AT-040–044 pass without fallback.

### 3.4 Stripe

| Environment | Mode |
|-------------|------|
| Staging on Signal Works | Test mode — new customers only |
| Production | Live mode — new customers only |
| Hobby test Stripe data | Not migrated |

### 3.5 Storage

| State | Behavior |
|-------|----------|
| Destination | Empty buckets; tenant-prefixed uploads from day one |
| Hobby objects | Discarded (optional manual asset upload) |
| No dual-read | Old hobby paths never on destination |

### 3.6 Locations

| State | Behavior |
|-------|----------|
| Destination | `ma5_locations` only — no `ma5_facility_settings` |
| App | Settings UI uses location editor (no facility_settings adapter needed on greenfield) |

---

## 4. Switch mechanisms

| Mechanism | MA5 example |
|-----------|-------------|
| **Deploy env change** | `NEXT_PUBLIC_SUPABASE_URL` hobby → Signal Works |
| **Schema on destination only** | 024–032 never on hobby |
| **Staging seed** | Migration 033 — staging only |
| **Invite bootstrap** | First owner on destination |
| **Rollback** | Revert deploy env to hobby |

---

## 5. Migration checklist template

```markdown
- [ ] Applied on destination only? (not hobby)
- [ ] Hobby DB unchanged?
- [ ] MA5 deploy env updated?
- [ ] Rollback = env revert?
- [ ] Seed data staging-only?
```

---

## 6. Recommended cutover sequence

```text
1. Apply 024–032 on Signal Works (staging branch)
2. Run 033 staging seed
3. Deploy MA5 app (tenant code) to staging preview
4. Point staging env to Signal Works DB
5. Bootstrap owner invite + run acceptance tests
6. Apply 024–032 on Signal Works production (skip 033)
7. Bootstrap production owner + optional brand assets
8. Point production MA5 env to Signal Works DB
9. Remove hobby Supabase from MA5 deploy config
```

---

## 7. Future multi-tenant shared deployment

When multiple tenants share one deployment, add per-tenant feature flags in `tenant_profiles.settings`. Not required for MA5 cutover.

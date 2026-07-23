# 13 — Tenant Bootstrap Lifecycle

**Planning only.** Implements **D-21**. Updated for **D-22** (no hobby data import).

Defines how a **brand-new client tenant** becomes operational on the Signal Works database. MA5 is the first instance.

---

## 1. Lifecycle overview

```text
Create tenant (tenants row)
        ↓
Create SW commercial linkage (optional)
        ↓
Create platform owner (profiles + tenant_memberships) — SW portal
        ↓
Apply tenant-scoped MA5 schema on Signal Works (empty tables)
        ↓
Insert default location + bootstrap settings
        ↓
Register MA5 deployment → Signal Works DB URL
        ↓
Initialize empty storage (tenant-prefixed paths on first upload)
        ↓
Configure MA5 Stripe keys in deployment env
        ↓
Invite gym owner (fresh — no auth user copy)
        ↓
Seed staging test data (staging only)
        ↓
Ready
```

---

## 2. Step-by-step (MA5 first instance)

### Step 1 — Create tenant

Migration `024` on **Signal Works only** (`MA5/supabase-signalworks/migrations/`). Output: `{{MA5_TENANT_ID}}`.

### Step 2 — SW commercial linkage

`signalworks-clients` — SW Stripe account. May pre-exist in portal (D-12).

### Step 3 — Platform owner

SW invite → `profiles` + `tenant_memberships`. Separate from gym staff.

### Step 4 — Tenant-scoped schema

Migration `026` creates all `ma5_*` tables with `tenant_id NOT NULL`. **No hobby import.**

### Step 5 — Default location

Migration `025` inserts `ma5_locations` row `slug=main` from operator config — **not** from `ma5_facility_settings`.

### Step 6 — Settings

Admin configures location hours, branding via app after owner login.

### Step 7 — Storage

Empty buckets on Signal Works. Optional manual upload of approved logo/imagery/waivers.

### Step 8 — Stripe

MA5 deployment env: test keys (staging), live keys (production). New customers only.

### Step 9 — Gym owner

**Fresh invite** (D-14). Creates `ma5_profiles` + `ma5_user_roles` in app. No hobby user migration.

### Step 10 — Staging seed

Migration `033` or script — disposable test data. **Not on production.**

### Step 11 — Ready checklist

| Check | Pass? |
|-------|-------|
| Tenant + default location on Signal Works | ☐ |
| MA5 deploy points to Signal Works DB | ☐ |
| Owner invited and logged in | ☐ |
| Member invite flow works | ☐ |
| Stripe test checkout (staging) | ☐ |
| Acceptance tests pass | ☐ |
| Hobby DB untouched | ☐ |

---

## 3. MA5 vs future clients

| Step | MA5 | Future client |
|------|-----|---------------|
| Schema | Migrations 024–032 on Signal Works | Same pattern |
| Data | Empty + bootstrap + staging seed | Empty + bootstrap |
| Hobby / legacy DB | Reference only — not imported | N/A |
| Stripe | MA5 account; new records | Client account at onboarding |
| Users | Fresh invites | Fresh invites |

---

## 4. Automation target (post-MA5)

```text
bootstrap_client_tenant({
  slug,
  display_name,
  owner_email,
  domain,
  deployment_url,
})
```

Runs on **Signal Works database only**. Out of scope for initial MA5 cutover implementation.

---

## 5. Related documents

- [03-data-backfill-plan.md](./03-data-backfill-plan.md) — bootstrap + seed detail
- [05-auth-trigger-remediation.md](./05-auth-trigger-remediation.md) — invite-only profiles
- [09-dry-run-cutover-rollback.md](./09-dry-run-cutover-rollback.md) — deploy cutover

# 05 — Shared Authentication Trigger Replacement

**Planning only.** **Mandatory (D-14):** app-only profile creation — no global `auth.users` trigger.

## 1. Problem

Migration `001_platform_foundation.sql` defines:

```sql
create trigger ma5_on_auth_user_created
after insert on auth.users
for each row execute function public.ma5_handle_new_user();
```

On a **shared** Supabase project, **every** new `auth.users` row (DAWG, SW portal, other clients) would create `ma5_profiles` + default `client` role — **unacceptable**.

---

## 2. Target behavior

| Event | Creates MA5 profile? | Tenant binding |
|-------|-------------------|----------------|
| Random signup on another app | **No** | — |
| MA5 member invite accepted | **Yes** | `{{MA5_TENANT_ID}}` |
| MA5 coach/staff invite accepted | **Yes** | `{{MA5_TENANT_ID}}` |
| SW platform user (no gym access) | **No** | Uses `profiles` + `tenant_memberships` only |
| Existing MA5 users on hobby DB | **Not migrated** — fresh invites on destination |

---

## 3. Replacement design (recommended)

### Step A — Remove global trigger

Migration `036`: `drop trigger ma5_on_auth_user_created on auth.users;`

### Step B — Invite-driven profile creation

| Workflow | Initiator | Code path |
|----------|-----------|-----------|
| Member invite | Staff | `POST /api/admin/members/invite` |
| Coach invite | Admin | `POST /api/admin/coaches/invite` |
| Accept invite | User | `POST /api/auth/accept-invite` |

**On invite send (service-role):**

1. Resolve `tenant_id = {{MA5_TENANT_ID}}` from server config / resolver (transitional env allowed with removal condition).
2. `auth.admin.inviteUserByEmail` or create user with `app_metadata: { ma5_tenant_id, invite_type }`.
3. Pre-insert or upsert `ma5_profiles` with `tenant_id`, `invitation_status = 'pending'`.

**On accept-invite:**

1. Verify invite token / user `app_metadata.ma5_tenant_id`.
2. Upsert `ma5_profiles` with correct `tenant_id`.
3. Assign roles in `ma5_user_roles` (never default global client for non-MA5 users).

### Step C — Optional gated trigger (alternative)

If a DB trigger is still desired:

```sql
-- Conceptual only
if new.raw_app_meta_data->>'ma5_tenant_id' is not null then
  -- create ma5_profiles for that tenant only
end if;
```

**Preference:** application-orchestrated creation (Step B) for clarity; trigger only as safety net with strict metadata gate.

---

## 4. Duplicate execution prevention

| Mechanism | Purpose |
|-----------|---------|
| `ma5_profiles.id` PK = `auth.users.id` | One profile per auth user per app identity |
| `unique(tenant_id, email)` on profiles | Optional — detect cross-tenant email collision |
| Invite idempotency key in admin API | Prevent double-send |
| `on conflict do nothing` on profile insert | Safe retries |

---

## 5. Existing MA5 user backfill

**Not applicable (D-22).** Destination starts with no `ma5_profiles`. Production users are **invited fresh** via bootstrap and onboarding flows.

Hobby test users are not copied to Signal Works `auth.users` or `ma5_profiles`.

---

## 6. Signal Works platform users (separate)

| Concern | Table |
|---------|-------|
| SW portal login | `profiles`, `tenant_memberships` |
| MA5 gym app login | `ma5_profiles`, `ma5_user_roles` |

Same `auth.users` row **may** have both if a person is SW account owner and gym member — rare; both rows must agree on email, different role systems.

**Staff vs customer:**

| Type | Roles | Onboarding |
|------|-------|------------|
| Customer | `client` | Member invite |
| Coach | `coach` | Coach invite |
| Admin | `admin` / `owner` | Owner bootstrap (manual) |

---

## 7. Files to change (implementation phase)

| File | Change |
|------|--------|
| `supabase/migrations/036_*` | Drop trigger |
| `src/app/api/admin/members/invite/route.ts` | Set `tenant_id` on profile |
| `src/app/api/admin/coaches/invite/route.ts` | Same |
| `src/app/api/auth/accept-invite/route.ts` | Tenant-scoped upsert |
| `src/lib/auth/session.ts` | Load tenant from profile |

---

## 8. Rollback

Re-attach old trigger only if MA5 returns to isolated Supabase project — **not** for shared DB production.

# 07 — Storage Plan (Destination)

**Planning only.** Convention: [ADR 0004](../../../docs/adr/0004-storage-conventions.md).

**Scope (D-22):** Do **not** copy test storage objects from the hobby Supabase project. Destination buckets start **empty** with tenant-prefixed paths from the first upload.

---

## 1. Hobby buckets (reference only)

| Bucket | Notes |
|--------|-------|
| `ma5-brand-assets` | Test marketing images — **discarded** |
| `ma5-exercise-videos` | Test exercise media — **discarded** |
| `ma5-member-journey` | Test progress photos — **discarded** |

Hobby storage is not modified during destination build.

---

## 2. Destination path patterns (from first upload)

| Bucket | Access | Pattern |
|--------|--------|---------|
| `ma5-brand-assets` | **Public** (published assets) | `{tenant_id}/brand/{resource_type}/{resource_id}/{file}` |
| `ma5-exercise-videos` | **Private** | `{tenant_id}/exercises/{exercise_id}/{file}` |
| `ma5-member-journey` | **Private** | `{tenant_id}/members/{user_id}/{file}` |

---

## 3. Optional approved assets (manual only)

Copy **only** if explicitly approved before production launch:

| Asset | Procedure |
|-------|-----------|
| Logo | Manual upload via admin to `{tenant_id}/brand/...` |
| Website imagery | Same |
| Waiver PDF | Upload to private bucket or document store |
| Policy documents | Same |

No bulk migration script. No automatic copy from hobby buckets.

---

## 4. Database metadata

On destination, `storage_path` columns start **empty**. Paths are set when staff/members upload through the app using tenant-prefixed builders.

| Table / field | Initial state |
|---------------|---------------|
| `ma5_marketing_gallery.storage_path` | Empty until upload |
| `ma5_exercises.video_storage_path` | Empty until upload |
| `ma5_progress_photos.storage_path` | Empty until upload |
| `ma5_profiles.avatar_url` | Empty or default |

---

## 5. Storage RLS (migration 032)

| Bucket | Policy |
|--------|--------|
| All | Path prefix matches resolved `tenant_id` |
| Public brand | Anon read for resolved tenant's published assets |
| Private | Authenticated member/staff + path ownership |

**Apply paths:** greenfield → `032`; recovery after rollback → `032b` (never both). If `032b` was applied before the safe-UUID revision, run `032c`.

**Path helpers:** `ma5_storage_path_tenant_id()`, `ma5_storage_path_segment()`, `ma5_storage_path_segment_uuid()` — policies must not use bare `::uuid` on path segments (malformed paths would error during policy evaluation).

---

## 6. Application changes

| File | Change |
|------|--------|
| `src/lib/assets/browser-upload.ts` | Upload to `{tenant_id}/brand/...` |
| `src/lib/video/storage.ts` | `{tenant_id}/exercises/...` |
| `src/lib/journey/constants.ts` | `{tenant_id}/members/...` |

No dual-read fallback for old hobby paths — those paths never exist on destination.

---

## 7. Verification

| Test | Expected |
|------|----------|
| AT-070–073 | Upload/download on destination with tenant prefix |
| Bucket scan | All objects under `{{MA5_TENANT_ID}}/` prefix |
| Cross-tenant | Member B cannot read Member A path |

---

## 8. Rollback

Rollback = repoint MA5 deployment to hobby Supabase URL (if cutover not yet live). No storage sync between databases required.

---

## 9. Timing

Apply storage policies (migration 032) with schema deploy. First uploads occur after MA5 staging deployment is live and bootstrap complete.

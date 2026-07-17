# MA5 Communication — Phase 1 Implementation

Operational coach ↔ client messaging and one-way announcements.
External SMS/email/advanced push are deferred — see `docs/COMMUNICATION_PHASE2_DEFERRED.md`.

## Product rules (firm)

- Direct messages are **two-way**
- Announcements are **one-way** in v1
- Canonical unread badge source: `ma5_notifications` (demo: communication notification rows)
- Profile toggles control **external** delivery only — in-app always works
- Service-role key only in server routes (announcement bulk publish)
- Installable PWA + basic Web Push — see `docs/PWA_WEB_PUSH.md`

## Routes

| Role | Path |
| --- | --- |
| Admin | `/admin/messages`, `/admin/messages/[threadId]` |
| Admin | `/admin/announcements`, `/admin/announcements/new` |
| Client | `/app/messages`, `/app/messages/[threadId]` |
| Client | `/app/announcements` |

Legacy `/admin/inbox` and `/app/inbox` redirect to the new routes.

Sidebar: **Communication** (admin), **Messages** (client).

## Database

Migration: `supabase/migrations/007_communication.sql`

- `ma5_message_threads` — one open thread per client
- `ma5_messages` — plain text
- `ma5_message_thread_reads` — per-participant `last_read_at`
- `ma5_announcements` + `ma5_announcement_recipients`
- Extends existing `ma5_notifications` with `type`, `entity_type`, `entity_id`

### Tenancy — not multi-tenant yet

**This communication schema is intentionally single-facility and is not tenant-safe.**

MA5 today is one gym. There is no `facility_id` / `tenant_id` on communication tables. RLS only answers “is this user staff, or the client on this thread?” — it does **not** isolate Gym A’s messages from Gym B’s.

That is fine for MA5. It is **not** fine to assume when Signal Works reuses this platform for other gyms.

Before multi-tenant reuse:

1. Add a tenant key (`facility_id` or equivalent) to threads, announcements, recipients, and notifications
2. Scope every RLS policy and every query with that key
3. Ensure service-role publish jobs never fan out across tenants
4. Do not treat the current `ma5_*` communication tables as already portable

Until then, treat this as MA5-only operational messaging.

## APIs

- `POST /api/admin/messages/thread`
- `POST /api/admin/messages/send`
- `POST /api/messages/send`
- `POST /api/messages/mark-read`
- `POST /api/admin/announcements`
- `POST /api/admin/announcements/[id]/publish`
- `POST /api/announcements/[id]/mark-read`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/mark-read`

## Feature module

`src/features/messaging/` — types, demo-store, queries, delivery adapter, publish helper, realtime hook.

Demo seed includes Jordan (unread reply), Alex (membership question), Emily (read congrats), plus holiday / strength cycle / Saturday announcements.

## Apply migration

```bash
# local / linked project
supabase db push
# or run 007_communication.sql in the SQL editor
```

Until the migration is applied, the cookie demo store powers the UI.

## Notification preferences

| Toggle | External delivery |
| --- | --- |
| Messages (`notify_coach_messages`) | Direct messages + announcements |
| Reminders | Booking / workout reminders (future) |
| Program updates | Program assigned / updated (future) |
| Billing | Failed payment / renewal (future) |

In-app records are always created.

## Acceptance checklist

- [ ] Coach starts a thread; client receives + replies; badges clear correctly
- [ ] Coach publishes announcement; recipients + read counts update
- [ ] Client cannot access another client’s thread or admin routes
- [ ] Message send succeeds when email/push provider is absent
- [ ] Mobile composer + thread scroll behave correctly

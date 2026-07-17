# MA5 PWA + Basic Web Push

Installable Progressive Web App and standards-based Web Push for coach messages and announcements.

Does **not** include SMS, external email, Firebase, OneSignal, or native apps.

## What you get

- Web app manifest (`/manifest.webmanifest` via `src/app/manifest.ts`)
- Service worker (`public/sw.js`) — push + notification click; does **not** cache `/api/*`
- Icons: 192, 512, maskable 512, Apple touch 180
- Install UX on **Profile → Install MA5**
- Web Push via VAPID when env keys are set
- Subscriptions stored in `ma5_push_subscriptions` (migration `008`)

## Setup

### 1. Apply migration

```bash
supabase db push
# or run supabase/migrations/008_push_subscriptions.sql
```

### 2. Generate VAPID keys

```bash
node scripts/generate-vapid-keys.mjs
```

Add to `.env.local` and production env:

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:ma.fitness99@gmail.com
```

`VAPID_PRIVATE_KEY` must never ship to the browser.

### 3. HTTPS

Production must be HTTPS. Localhost is allowed for development.

### 4. Client steps

1. Sign in at `/app`
2. Open **Profile → Install MA5**
3. Install (Chrome/Edge prompt, or iOS Share → Add to Home Screen)
4. Tap **Enable push** and allow notifications
5. On iOS: must be opened from the Home Screen icon before push works (iOS 16.4+)

## How push is sent

When a coach message or announcement is created, `deliverExternalSafely` calls `WebPushDeliveryAdapter.sendPush`:

1. Skips if `notify_coach_messages` is off (in-app still created)
2. Loads `ma5_push_subscriptions` for that user (service role)
3. Sends via `web-push` + VAPID
4. Deletes expired endpoints (404/410)
5. Never fails the message/announcement if push fails

## Install behavior

| Platform | Behavior |
| --- | --- |
| Chrome / Edge (Android, desktop) | `beforeinstallprompt` → **Install MA5** button |
| iOS Safari | Manual: Share → Add to Home Screen (no JS install prompt) |
| Already installed | Install instructions hidden |

## Related

- `docs/COMMUNICATION_IMPLEMENTATION.md`
- `docs/COMMUNICATION_PHASE2_DEFERRED.md` — advanced push / native still deferred

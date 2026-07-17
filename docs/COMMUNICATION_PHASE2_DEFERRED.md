# MA5 Communication — Phase 2 Deferred Integrations

## Purpose

This phase contains communication features that require external providers, ongoing delivery monitoring, additional compliance, recurring costs, or significantly more operational support.

Do not include these in the initial communication release unless explicitly requested.

The Phase 1 system remains fully functional using:

- Direct in-app messages
- Group announcements (one-way)
- Read/unread status
- Unread badges (canonical source: `ma5_notifications`)
- Supabase-backed notification records
- Optional Realtime subscriptions (refresh fallback always works)
- Delivery adapter hooks with no-provider fallback

---

## 1. SMS Messaging

Defer all SMS functionality.

Potential future features:

- Coach-to-client SMS
- Group SMS broadcasts
- Appointment reminders
- Membership expiration alerts
- Failed payment alerts
- Two-way SMS replies
- SMS delivery status

Likely provider: Twilio (or alternative selected later)

Required future work:

- Purchase and configure phone number
- Store verified client phone numbers
- Obtain SMS consent; record opt-in timestamps
- Support STOP and HELP keywords; opt-out handling
- Sending limits, rate limiting, delivery webhooks
- Handle failed / undelivered messages
- Track provider usage and cost
- Admin audit logs

Do not send SMS from Phase 1 notification events.

---

## 2. Email Delivery

Defer external email delivery beyond existing Supabase authentication emails.

Potential future email events:

- New direct message
- New announcement
- Program assigned
- Workout / booking reminders
- Membership expiration / failed payment

Possible providers: Resend, Postmark, SendGrid, Amazon SES

Required future work:

- Select provider; verify sending domain (SPF, DKIM, DMARC)
- Branded templates; unsubscribe handling where required
- Delivery failure / bounce / complaint handling
- Delivery webhooks, retries, email logs
- Respect `notify_coach_messages` and related profile toggles

Phase 1 creates in-app notifications even when no email provider exists.

**Message sending must never fail because email delivery is unavailable.**

The adapter already exists:

```ts
// src/features/messaging/delivery.ts
interface NotificationDeliveryAdapter {
  sendEmail(...)
  sendPush(...)
}
```

Wire a real provider only after approval.

---

## 3. Advanced Push Infrastructure

Phase 1 may include basic Web Push later; defer advanced capabilities:

- Native iOS / Android application push
- Firebase Cloud Messaging / APNs
- OneSignal integration
- Rich notifications, images, action buttons
- Deep-link analytics, device segmentation
- Scheduled push campaigns / automated sequences

If basic Web Push is added before Phase 2, limit it to:

- New direct message / new announcement
- Click opens related screen
- Respect `notify_coach_messages`
- Remove expired subscriptions

---

## 4. Campaigns and Automation

Defer marketing and automation:

- Scheduled / recurring announcements
- Drip campaigns, onboarding sequences
- Inactive-client re-engagement
- Membership renewal / birthday campaigns
- Bulk promotional messaging
- Segmentation rules and campaign analytics

Keep these out of the operational v1 messaging system.

---

## 5. Attachments and Rich Messaging

Defer:

- File attachments, images, PDFs, video, voice
- Reactions, GIFs, link previews
- Message editing, deletion, forwarding

V1 direct messages remain plain text. Announcements may include an optional URL only.

---

## 6. Advanced Delivery Analytics

Defer email open/click rates, SMS/push analytics, campaign funnels, provider cost reports.

V1 shows only:

- Announcement recipient count + read count
- Direct message read/unread state

---

## 7. Compliance and Retention

Defer advanced compliance tooling until external channels are added:

- SMS consent / email unsubscribe records
- Retention policies, export, deletion requests, legal hold
- Detailed audit trails, moderator access, consent history

---

## Phase 2 Trigger

Only begin this phase after:

1. Mike has used the in-app communication system.
2. In-app (and any basic Web Push) notifications are working reliably.
3. There is a demonstrated need for SMS or email delivery.
4. A provider and expected monthly cost have been approved.
5. Consent and compliance requirements are understood.

---

## Related docs

- `docs/COMMUNICATION_IMPLEMENTATION.md` — Phase 1 build notes
- `docs/COMMUNICATION_MODULE.md` — product positioning (base vs Communication+)

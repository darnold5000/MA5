# Communication module (Fitness Hub)

Mindbody messaging feels like an add-on. TrainHeroic feels like a coaching platform. **MA5 should feel like you’re connected to your coach.**

Do **not** ship a page called “Messages.” Ship **Communication** (client label: **Inbox**).

---

## Product framing

| Wrong mental model | Right mental model |
| --- | --- |
| I have messages | My coach has something for me |
| Email inbox | Coaching relationship + activity |

---

## Three communication types

### 1. Announcements (one-to-many)

Facility / coach broadcasts. Feed-style.

Examples: class moved, holiday hours, new program starts Monday, welcome new coach.

### 2. Conversations (1:1)

Private coach ↔ client chat.

Examples: great job today, can I move tomorrow, my knee hurts.

### 3. Notifications (system)

Generated from events — **not** chat threads.

Examples: booking confirmed, payment received, membership renews tomorrow, workout assigned.

---

## Client UX

**Nav label:** Inbox (route can stay `/app/inbox`).

**Tabs:**

- Inbox (unified activity-style feed)
- Conversations
- Announcements
- Notifications

**Inbox feed example rows:** announcement · coach reply · program assigned · payment successful — ordered by time so the hub feels alive.

---

## Coach UX

**Communication** hub, not “Messages.”

- Search clients
- Needs reply / booked session / program complete triage
- Team announcements → Create announcement
- Conversation view with **client context** (plan, week, last workout, upcoming) + **quick actions** (assign workout, book session, profile, membership, attendance, payments)

Coach should not leave the conversation to help the client.

---

## Channel strategy

| Channel | Role | Examples |
| --- | --- | --- |
| **In-app + PWA push** | Primary | Coach replied, workout assigned, booking confirmed |
| **SMS** | Secondary / high-value only | Class in 1 hour, waitlist cleared, emergency closure (Twilio etc.) |
| **Email** | Administrative | Receipts, invoices, renewals, welcome, password reset |

Do not SMS every workout update.

### PWA push

Web Push works when the PWA is installed and permission granted. Strong on Android; workable on iOS after Home Screen install (platform limits vs native still apply).

---

## Build order (important)

1. **Activity Feed** first — bookings, payments, program assigns, coach notes as events. Notifications become easy; chat is another activity type.
2. Announcements (broadcast)
3. Conversations (1:1) + coach quick actions
4. Push notifications
5. Optional SMS / richer email

**Before full chat:** Activity Feed.

### “Coaching message” (later differentiator)

Coach sends chat text **and** can check “Add to workout plan” so next week’s programming updates automatically — messaging that *is* coaching.

### AI (later)

Draft reply from last workouts, attendance, injuries, goals — coach edits and sends.

---

## Signal Works reusable module

Not MA5-only. Package as **Communication** for tenant apps:

- Conversations (1:1 and small groups)
- Announcements (broadcasts)
- Notifications (system events)
- Activity Feed (everything that happened)
- Push (PWA)
- Email
- Optional SMS

---

## Demo status (`demo/mindbody-replacement`)

- Client **Inbox** shell with tabs + demo activity feed (UI only).
- Real chat, push, SMS, coach console: deferred to `demo/ma5-messaging` / Communication module work.

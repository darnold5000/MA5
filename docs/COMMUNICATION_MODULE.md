# Communication — MA5 basics vs Signal Works add-on

Mindbody messaging feels like an add-on. TrainHeroic feels like a coaching platform. **MA5 should feel connected to the coach** — without turning the base product into full business-comms software overnight.

---

## Principle

**Do not put full messaging in the base website offering.**

Once you own business ↔ customer communication, expectations jump: reliability, notifications, retention, read receipts, privacy, moderation, support. That’s business software, not “a website.”

**Modular Signal Works approach:** start with site + booking; enable Communication pieces as the business grows. Natural upgrade path and recurring value.

---

## Included with Booking / base MA5 (build this first)

Operational + light coach connection. Enough that a gym owner thinks: *“I can communicate with my clients.”* Same baseline helps salons, instructors, academies.

| Feature | Notes |
| --- | --- |
| Coach ↔ client direct messages | 1:1 only |
| Read / unread | Simple seen state |
| Message history | Persist conversation |
| Booking confirmations | System notice |
| Appointment reminders | System notice |
| Payment receipt / membership renewal notice | System notice (also email where appropriate) |
| Basic push notifications | For the above (PWA when available) |
| Optional: one image attach | Nice-to-have, not required for v1 |

**Exception — always with Booking:** customers expect booking confirmed, appointment reminder, payment receipt, membership renewal. Those are part of the booking experience, not a premium upsell.

What this is **not** (yet): broadcasts, group chats, segments, AI, campaigns, analytics, automations.

### MA5 demo / near-term

- Ship **basic messaging + notifications** under **Inbox** (or Communication label).
- Keep the UI honest: conversations + notification list first.
- Activity-style unified feed, announcements, coach console, push for chat — evolve toward the premium module.

---

## Premium: Communication+ (document now, build later)

**Positioning:** optional Signal Works module (~**+$25–50/month**). Turn on only if the client wants ongoing communication ops.

### Communication module (premium pack)

| Capability | Notes |
| --- | --- |
| Conversations | 1:1 and small groups |
| Announcements | Broadcasts to all or selected groups |
| Notifications | Richer system events |
| Activity Feed | Everything that happened |
| Push notifications | Including message alerts |
| Read / unread tracking | Across types |
| Email | Receipts, campaigns hooks |
| Optional SMS | High-value only (reminders, waitlist, emergencies) |

### Optional add-ons on top of Communication+

- SMS reminders  
- Email campaigns  
- AI-assisted replies  

### Communication+ feature detail (later backlog)

| Feature | Why |
| --- | --- |
| Announcements to everyone or selected groups | Facility-wide without SMS spam |
| Group chats (e.g. 6 AM Bootcamp) | Cohort coaching |
| Segments (baseball athletes, parents, Gold members) | Targeted reach |
| Automated reminders (24h before, missed session follow-up) | Ops without manual chase |
| AI reply suggestions | Coach time saver |
| Video / PDF / file sharing | Programming assets in-thread |
| Message templates (class cancelled, welcome) | Consistency |
| Message analytics (read rates, engagement) | Prove value |
| Scheduled messages | Plan ahead |
| Workflow automations (e.g. recovery tips after leg day) | Coaching at scale |
| Coach conversation + client context + quick actions | Assign workout, book, profile, plan, attendance |
| “Add to workout plan” from a chat message | Messaging that *is* coaching |
| Draft reply with AI (workouts, attendance, goals) | Edit then send |

---

## Clean separation

| Layer | Owns |
| --- | --- |
| **Booking (included)** | Confirmations, reminders, payment/membership notices |
| **Basic client communication (included for MA5 coaching hub)** | 1:1 coach ↔ client, read/unread, history, basic push |
| **Communication+ (paid add-on)** | Announcements, groups, segments, activity feed, automations, AI, analytics, SMS/email campaigns |

---

## Channel rules (both tiers)

| Channel | Use |
| --- | --- |
| In-app + PWA push | Primary for day-to-day |
| SMS | Secondary — high-value only (don’t SMS every workout update) |
| Email | Administrative — receipts, invoices, renewals, welcome, password reset |

---

## Signal Works reusable module

Define **Communication**, not a one-off “messaging feature”:

- Conversations · Announcements · Notifications · Activity Feed · Push · Email · Optional SMS  

Every future tenant (gym, salon, baseball academy, etc.) enables only what they need — no rebuild.

---

## Build sequence reminder

1. **Now (MA5):** basic 1:1 messaging + booking/system notifications (+ read/unread).  
2. **Later (Communication+):** activity feed, announcements, groups, segments, push for messages, coach tools, AI, SMS/email campaigns.

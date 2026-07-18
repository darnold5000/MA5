# Marketing Attribution — MA5 / Signal Works

End-to-end UTM and lead attribution so facilities can see which campaigns drive visitors, leads, and members. Built first for MA5; designed as a reusable **Signal Works Growth** capability.

---

## What shipped

| Capability | Behavior |
| --- | --- |
| Automatic UTM capture | Middleware reads `utm_*` params into HttpOnly first-party cookies |
| Anonymous visitor tracking | `ma5_vid` + first/last-touch cookies (90 days) |
| First-touch immutability | Cookies + app logic + **DB BEFORE UPDATE triggers** |
| Optional last-touch | Remains updateable when new campaign params appear |
| Bot filtering | User-agent heuristics; `is_bot` excluded from unique-visitor KPIs |
| Unique vs page views | Unique visitors = distinct `visitor_id`; page views = sum(`page_views`) |
| Lead attribution | Contact form → `ma5_leads` with visitor + UTMs |
| Invite edge cases | Attribution attaches for new invite, resend, existing member, Clients invite (email match) |
| Member conversion | Accept-invite marks lead converted; acquisition_* retained if email later changes |
| Funnel timing | Lead created → invited → accepted → activated + avg days |
| Privacy cleanup | Delete unconverted leads / unlinked visitors; 90-day anonymous purge |
| Operations → Marketing | Dashboard, Leads, Campaigns |
| Profile attribution | Read-only Marketing Attribution on Fitness Hub profile |

---

## Privacy & retention

- Marketing cookies identify a **browser**, not a person (`HttpOnly`, `SameSite=Lax`, `Secure` in production).
- PII is stored only after a **voluntary form submit**.
- **Anonymous sessions** with no linked lead are eligible for deletion after **90 days** (`last_seen`).
- Attribution already copied onto a **lead or member** is never purged by retention.
- Admin privacy API: `POST /api/admin/marketing/privacy`
  - `delete_visitor` — only if no lead references the visitor
  - `delete_lead` — only unconverted / non-active-member leads; does not clear member `acquisition_*`
  - `purge_expired` — runs `ma5_purge_expired_anonymous_visitors(90)`
- Opportunistic purge also runs (~2% of human visit beacons).
- Wire a consent gate around cookie writes where required by jurisdiction.

---

## Data model (`ma5_*`)

Migrations:

- `010_marketing_attribution.sql` — tables + profile acquisition columns
- `011_marketing_hardening.sql` — triggers, `is_bot`, `invited_at`, purge function, delete policies

### `ma5_visitor_sessions`

Anonymous sessions: first-touch UTMs (immutable once set), last-touch UTMs (mutable), `page_views`, `is_bot`, `user_agent`.

### `ma5_leads`

Prospects: UTMs (immutable once set), `status`, `invited_at`, `converted_at`, `converted_profile_id`.

### `ma5_profiles`

| Column | Purpose |
| --- | --- |
| `lead_id` | Originating lead (may SET NULL on privacy delete; cannot swap to another lead) |
| `acquisition_*` | First-touch retained after conversion (DB-protected) |

---

## Runtime flow

```
Marketing page (+ UTMs)
  → middleware sets HttpOnly ma5_vid + ma5_ft (+ ma5_lt)
  → AttributionTracker POSTs /api/attribution/visit (server reads cookies)
  → upsert visitor session (bots flagged; first-touch locked in DB)

Contact form
  → POST /api/leads → ma5_leads

Invite (Marketing or Clients, new/resend/existing)
  → attachLeadOnInvite() by leadId or email (case-insensitive)
  → sets lead.invited_at + profile acquisition if empty

Accept invite
  → applyAttributionToMember() → status converted + converted_at
```

Email changes after conversion do **not** clear attribution — `lead_id` + `acquisition_*` on the profile remain authoritative.

---

## Funnel reporting

Dashboard reports:

| Stage | Source |
| --- | --- |
| Lead created | `ma5_leads.created_at` |
| Invitation sent | `ma5_leads.invited_at` |
| Invitation accepted | `ma5_profiles.invitation_accepted_at` |
| Member activated | active profile with acceptance / lead link |
| Avg lead → invite | days between lead created and `invited_at` |
| Avg lead → conversion | days between lead created and `converted_at` |

---

## Operations UI

| Page | Path |
| --- | --- |
| Dashboard | `/admin/marketing` |
| Leads | `/admin/marketing/leads` (invite / delete) |
| Campaigns | `/admin/marketing/campaigns` |

Access: `/admin/*` middleware + `canAccessAdmin` on APIs + staff RLS.

---

## Tests

```bash
npm test
```

Covers: direct traffic, returning visitor new campaign, first-touch immutability, last-touch updates, bots, unaccepted invites, existing-member conversion timing, revoked access, retention eligibility, safe delete rules.

---

## Apply migrations

```bash
supabase db push
# or run 010_ then 011_ in the SQL editor
```

---

## Manual test path

1. Instagram UTM → contact → Marketing lead → invite → accept → profile attribution  
2. Direct traffic (no UTMs) still creates a visitor + landing page  
3. Return with a different campaign — first-touch stuck, last-touch updates  
4. Lead never accepts — stays in Leads; no activated member  
5. Invite same email from Clients (no leadId) — attribution still attaches by email  

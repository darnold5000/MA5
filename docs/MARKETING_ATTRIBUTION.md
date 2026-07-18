# Marketing Attribution — MA5 / Signal Works

End-to-end UTM and lead attribution so facilities can see which campaigns drive visitors, leads, and members. Built first for MA5; designed as a reusable **Signal Works Growth** capability.

---

## What shipped

| Capability | Behavior |
| --- | --- |
| Automatic UTM capture | Middleware reads `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content` |
| Anonymous visitor tracking | First-party `ma5_vid` cookie (UUID) + first/last-touch cookies (90 days) |
| First-touch never overwritten | Cookie + `ma5_visitor_sessions` first-touch columns are write-once |
| Optional last-touch | Updated when new campaign params appear |
| Lead attribution | Contact form → `ma5_leads` with visitor + UTMs |
| Member conversion | Invite accept copies first-touch onto `ma5_profiles.acquisition_*` |
| Operations → Marketing | Dashboard, Leads, Campaigns |
| Profile attribution | Read-only Marketing Attribution on Fitness Hub profile |

---

## Privacy

- Marketing cookies identify a **browser**, not a person.
- PII is stored only after a **voluntary form submit** (contact lead).
- Respect cookie consent banners where your jurisdiction requires them (wire a consent gate around `AttributionTracker` / cookie writes if needed).

---

## Data model (`ma5_*`)

### `ma5_visitor_sessions`

Anonymous sessions: `visitor_id`, `first_seen`, `last_seen`, landing/referrer, first-touch UTMs, optional last-touch UTMs, `page_views`.

### `ma5_leads`

Identified prospects: `visitor_id`, name/email/phone, UTMs, `status` (`new` → `contacted` → `qualified` → `converted` / `closed`), `converted_profile_id`.

### `ma5_profiles` (member acquisition)

| Column | Purpose |
| --- | --- |
| `lead_id` | Link back to originating lead |
| `acquisition_source` / `_medium` / `_campaign` / `_term` / `_content` | First-touch UTMs |
| `acquisition_landing_page` / `_referrer` / `_first_seen_at` | Context |

Never overwrite acquisition fields once set.

Migration: `supabase/migrations/010_marketing_attribution.sql`.

---

## Runtime flow

```
Marketing page (+ UTMs)
  → middleware sets ma5_vid + ma5_ft (+ ma5_lt)
  → AttributionTracker POSTs /api/attribution/visit
  → ma5_visitor_sessions upsert (first-touch locked)

Contact form submit
  → POST /api/leads
  → ma5_leads row with visitor_id + first-touch UTMs

Admin invites → member accepts
  → POST /api/auth/accept-invite
  → applyAttributionToMember() links lead + copies acquisition_* 
```

---

## Operations UI

Top-level **Marketing** in the Operations sidebar:

| Page | Path |
| --- | --- |
| Dashboard | `/admin/marketing` |
| Leads | `/admin/marketing/leads` |
| Campaigns | `/admin/marketing/campaigns` |

Demo data is used when Supabase / migration is unavailable (same pattern as Reports).

---

## Key files

| Area | Path |
| --- | --- |
| Migration | `supabase/migrations/010_marketing_attribution.sql` |
| Cookie / parse | `src/lib/attribution/*` |
| Middleware hook | `src/lib/supabase/middleware.ts` → `applyAttributionCookies` |
| Domain | `src/features/marketing/*` |
| Visit / leads APIs | `src/app/api/attribution/visit`, `src/app/api/leads` |
| Admin APIs | `src/app/api/admin/marketing/leads` |
| UI | `src/components/marketing/*`, `src/app/admin/marketing/*` |

---

## Portable Signal Works pattern

For other tenants / the booking kit:

1. Rename tables `ma5_*` → `sw_*` (or tenant prefix).
2. Keep the same cookie contract (`*_vid`, `*_ft`, `*_lt`) or namespace per brand.
3. Reuse middleware capture + visit beacon + lead POST + convert helper.
4. Mount Operations → **Marketing** as a Growth module (alongside Communication, Reviews, Automations).

This is the kind of capability that makes Signal Works feel like a **business platform**, not “just a website.”

### Natural Marketing module expansion

Documented room to grow under the same nav:

- UTM / campaign attribution *(shipped)*
- Lead pipeline *(shipped basics)*
- Contact form submissions *(shipped)*
- Email campaigns
- QR code campaigns
- Referral tracking
- Coupon / promo codes
- Conversion funnels (richer viz)
- Google Ads / Meta Ads integrations
- Cost per lead / member, ROI reporting

---

## Apply migration

```bash
# Via Supabase CLI or SQL editor
supabase db push
# or run 010_marketing_attribution.sql in the project SQL editor
```

---

## Test checklist

1. Open `/?utm_source=instagram&utm_medium=social&utm_campaign=spring_strength` — cookies `ma5_vid` + `ma5_ft` set.
2. Navigate without UTMs — first-touch cookie unchanged.
3. Submit `/contact` — lead appears under Marketing → Leads with campaign.
4. Invite that email → accept invite — profile shows Marketing Attribution; lead status `converted`.
5. Operations → Marketing dashboard shows demo or live KPIs.

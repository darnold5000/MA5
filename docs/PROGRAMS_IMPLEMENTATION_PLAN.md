# MA5 Programs Module — Implementation Plan

Survey-scoped programming platform. Visual/UX patterns follow TrainHeroic (Library → builder → calendar → publish); feature set follows the owner survey **must-haves**, plus **native video uploads** and **Teams** (shared programming calendars).

**Branch:** `main` (shipped in-repo; original plan named `demo/ma5-programs`)  
**Companion:** `docs/IMPLEMENTATION_PLAN.md`  
**Constraint:** Keep MA5 brand tokens (brand red, dark surfaces, Oswald/Manrope). Match TrainHeroic **structure and workflow**, not their colors/logo.

---

## 1. Product goal

> Build a focused workout programming experience: exercise library with form video (upload or URL), workout builder, program builder, assign to individuals **or teams**, and a simple client “today’s workout” player.

Do **not** build nutrition, assessments, habits, wearables, body measurements, progress photos, circuits library, prescription templates, parent calendars, readiness analytics, or messaging in v1.

---

## 2. What the survey locked in

| Signal | Implication |
| --- | --- |
| Must-haves before replacing TrainHeroic/Trainerize | **Exercise Videos**, **Workout Builder**, **Program Builder** |
| Programs: mix shared + individual; create **weekly** | Shared program templates, **team calendars**, and per-client edits |
| Workout content used today | Videos, sets, reps, coach notes (not rest/tempo/attachments) |
| ~100–250 exercise videos | Library is a first-class asset; support **native uploads** + optional YouTube/Vimeo for migration |
| Exercise page focus | “Proper form on how to execute each movement correctly” |
| Client Progress used, not a must-have | Track **workout completion** only in v1 — not body metrics |
| Messaging wanted later, not a replace-blocker | Defer DM/announcements to Communication module |
| AI / Analytics ranked high but need data | Out of Programs v1 |

---

## 3. TrainHeroic patterns we **do** copy (look & workflow)

From the screen recordings — keep these interaction patterns:

1. **Operations Library** with three primary tabs: **Exercises · Workouts · Programs**
2. **Right-side drawer** to create/edit an exercise (title, video, form cues, default params)
3. **Workout/session builder** with lettered blocks (`A`, `B1`, `B2`), sets × reps, coach notes, embedded exercise video
4. **Program grid**: weeks × days; cell actions **Create Workout** / **Add from Library**
5. **Teams**: create team → team list → **shared team calendar** (same CREATE / ADD FROM LIBRARY / Publish All pattern as athlete calendar)
6. **Client / athlete calendar** (week view): assign/edit days, **Publish** / draft state
7. **Client player**: open today’s workout, see video + prescription, mark complete

Visual chrome: same density and hierarchy as TrainHeroic (dark rail, light workspace, tabular library lists, week grids). Restyle with MA5 tokens.

---

## 4. Explicitly out of scope (v1)

| Seen in TrainHeroic | Why skipped |
| --- | --- |
| Circuits + Prescription templates | Not must-haves |
| Parent Calendars / marketplace subscribe | Not must-haves (team calendar + program assign covers shared delivery) |
| Daily nutrition macros | Survey does not use nutrition |
| Readiness / intensity / volume analytics suite | Analytics module later |
| Working Max editor | Nice-to-have after completion tracking |
| Athlete lift-video upload + social feed | Feedback v2; completion + coach notes first |
| Rest, tempo, distance, RPE, watts, etc. | Survey uses sets/reps/notes; keep param model extensible but UI only exposes sets + reps (+ optional weight) |
| Team leaderboards / whiteboards / community feed | Teams = shared programming calendar + roster only |

---

## 5. Information architecture

```text
Exercise (library + form video: upload or URL)
    ↓
Workout / Session (blocks of exercises + prescriptions)
    ↓
Program (N weeks × 7 days of workouts)          ← shared templates
    ↓
Assignment → Individual calendar  OR  Team calendar
    ↓
Publish → Client Fitness Hub → Today’s Workout → Complete
```

### Surfaces

| Audience | Nav | Routes (proposed) |
| --- | --- | --- |
| Coach / ops | Operations → **Programs** (unhide) | `/admin/programs` hub → Library tabs |
| Coach | Library · Exercises | `/admin/programs/exercises` |
| Coach | Library · Workouts | `/admin/programs/workouts` |
| Coach | Library · Programs | `/admin/programs/library` |
| Coach | **Teams** | `/admin/programs/teams`, `/admin/programs/teams/[id]` |
| Coach | Client programming | `/admin/programs/clients/[id]` (week calendar) |
| Client | Fitness Hub → Programs | `/app/programs` (today + upcoming + history) |
| Client | Workout player | `/app/programs/workouts/[assignmentId]` |

Internal preview: link from `/platform-preview` when branch deploys.

---

## 6. Data model (Supabase `ma5_*`)

New migration: `003_programs.sql` (name may adjust to next ordinal).

### Tables

**`ma5_exercises`**
- `id`, `title`, `points_of_performance` (text)
- `video_source` (`upload` | `youtube` | `vimeo` | `none`)
- `video_url` (nullable — external URL when youtube/vimeo)
- `video_storage_path` (nullable — Supabase Storage path when upload)
- `video_poster_path` (nullable — optional thumbnail)
- `default_param_1` / `default_param_2` (enum: `reps` | `weight_lb` for v1; store as text enums for future)
- `created_by`, timestamps
- Optional later: tags, difficulty, equipment, muscle groups

**`ma5_workouts`** (reusable session templates)
- `id`, `title`, `coach_instructions`, `created_by`, timestamps

**`ma5_workout_blocks`**
- `id`, `workout_id`, `sort_order`, `label` (`A`, `B1`, …), `section_title` (optional, e.g. “Primary Lift”)
- `exercise_id`, `session_cues` (text)

**`ma5_workout_block_sets`**
- `block_id`, `set_number`, `reps`, `weight_lb` (nullable)

**`ma5_programs`**
- `id`, `title`, `weeks` (int), `created_by`, timestamps
- Shared vs individual is a **usage** concern (template vs assignment), not a second program type

**`ma5_program_days`**
- `program_id`, `week_index` (1..N), `day_index` (1..7), `workout_id` (nullable)

**`ma5_teams`**
- `id`, `name` (max 75), `difficulty` (optional text), `created_by`, timestamps

**`ma5_team_members`**
- `team_id`, `user_id`, `role` (`athlete` for v1), `joined_at`
- Unique `(team_id, user_id)`

**`ma5_program_assignments`**
- `id`, `program_id` (nullable if ad-hoc)
- Exactly one of: `client_user_id` **or** `team_id`
- `start_date`, `status` (`draft` | `active` | `completed`)

**`ma5_calendar_entries`** (unified individual + team days)
- `id`, `date`, `workout_id` (snapshot or FK), `title`
- `publish_status` (`draft` | `published`)
- `source` (`program` | `library` | `adhoc`)
- Exactly one of: `client_user_id` **or** `team_id`
- Optional `program_assignment_id`
- Client resolution: published entries for `client_user_id = me` **plus** published entries for any `team_id` I belong to

**`ma5_workout_completions`**
- `id`, `calendar_entry_id`, `client_user_id`, `completed_at`, `client_note` (optional text)
- v1 progress = presence of this row (per athlete, including team-assigned days)

### Storage

**Bucket:** `ma5-exercise-videos` (private)
- Path convention: `{org_or_owner_id}/exercises/{exercise_id}/{filename}`
- Allowed: `video/mp4`, `video/webm`, `video/quicktime`; max size TBD (start ~500MB)
- Playback via short-lived signed URLs from `src/lib/video/`
- Optional poster images in same bucket or `ma5-exercise-posters`
- RLS / storage policies: coaches with `managePrograms` can upload/delete; clients can read signed playback only for exercises on published workouts they can see

RLS (tables): coaches/staff with program capability manage library, teams, assignments; clients read own + team published entries and write own completions.

Reuse existing roles from `ma5_user_roles`. Capability: extend `src/lib/permissions/roles.ts` with `managePrograms` / `viewOwnPrograms` / `manageTeams`.

---

## 7. UX specs

### 7.1 Exercise Library

- List: title, has-video indicator (upload vs link), created by, search
- Create/Edit drawer:
  - Title (required)
  - **Video:** upload file **or** paste YouTube/Vimeo URL (mutually exclusive per exercise; coach can replace either way)
  - Preview: HTML5 player for uploads; embed for URL
  - Points of Performance (form cues) — primary teaching field
  - Default params: Reps + Weight (lb)
- Migration path: paste existing TrainHeroic YouTube links first; re-upload native files over time
- Never store video binaries in `public/` or git

### 7.2 Workout Builder

- Title + coach instructions
- **Add Block** → pick exercise from library
- Block shows: letter label, exercise name, video thumb, points of performance (read-only from exercise), session cues, sets×reps table
- Save as library workout for reuse

### 7.3 Program Builder

- Create: name + number of weeks
- Grid: WEEK × DAY 1–7
- Cell: Create Workout | Add from Library (attach existing workout)
- Goal: weekly programming workflow the owner already uses

### 7.4 Teams

- Empty state → **Create Team** (name)
- Team list table: name, member count, planned/published session hint, created, actions
- Team detail: roster (add/remove existing clients), **shared calendar** (same week UI as individual)
- Calendar actions: Create Workout | Add from Library | Publish / Publish All | Message Team (button can stub to Inbox later)
- Assign a program to a team (materialize days onto team calendar from `start_date`)
- Members see team-published days in Fitness Hub Programs alongside any individual assignments
- v1 does **not** include leaderboards, whiteboards, or team social feed

### 7.5 Assign + publish (individual)

- Pick client → week calendar
- Attach program **or** add single library workout to a day
- Draft vs **Publish** / **Publish All**
- Shared program = one template assigned to many clients **or** one team; individual = edit that client’s calendar after assign

### 7.6 Client Fitness Hub — Programs

- Replace placeholder with:
  - **Today** (next published workout from personal **or** team calendar)
  - Upcoming week strip
  - History (completed)
- Player: instructions, each block with video + sets/reps, **Mark complete** (+ optional short note)
- No body-weight charts, photos, or nutrition

---

## 8. Video strategy

| Decision | Detail |
| --- | --- |
| Primary | **Native upload** to Supabase Storage (`ma5-exercise-videos`) |
| Secondary | YouTube / Vimeo URL for migration and flexibility |
| Abstraction | `src/lib/video/` — `parse.ts` (URL providers), `storage.ts` (upload, signed URL, delete), `embed.tsx` / `player.tsx` (one player API for upload + embed) |
| Playback | Signed URL for uploads; iframe embed for YouTube/Vimeo |
| Not allowed | Files in `public/` or the git repo |
| Processing | v1 = store + stream as-uploaded (no transcoding). Note: add Mux/Cloudflare Stream later if size/quality becomes an issue |

---

## 9. Build sequence

Ship on `demo/ma5-programs` in thin vertical slices:

| Step | Deliverable | Done when |
| --- | --- | --- |
| **P0** | Schema + storage bucket + RLS + types (`exercises`, `workouts`, `programs`, `teams`) | Migration applies; types replace placeholders |
| **P1** | Exercise CRUD + **native upload** + YouTube/Vimeo fallback | Coach uploads a form video and/or pastes a URL; player works in drawer |
| **P2** | Workout builder + library list | Coach builds a multi-block workout and reopens it |
| **P3** | Program grid (weeks × days) | Coach creates a 4-week program and fills days from library |
| **P4** | **Teams**: create, roster, team calendar, assign program, publish | Team members see published team days |
| **P5** | Individual assign + publish calendar | Client sees only published personal days |
| **P6** | Client workout player + complete (personal + team sources) | Client finishes a workout; ops can see completed state |
| **P7** | Unhide Operations Programs (+ Teams) nav; wire `/platform-preview` | Demo-ready slice |

Messaging, Analytics, and AI stay on their existing planned branches.

---

## 10. File map (expected)

```text
supabase/migrations/00X_programs.sql
src/lib/video/parse.ts
src/lib/video/storage.ts
src/lib/video/player.tsx
src/features/exercises/{types,queries,actions}.ts
src/features/workouts/{types,queries,actions}.ts
src/features/programs/{types,queries,actions}.ts
src/features/teams/{types,queries,actions}.ts
src/components/programs/…          # library tables, drawers, grids, player
src/components/teams/…             # team list, roster, team calendar
src/app/admin/programs/…           # hub + exercises + workouts + library + clients + teams
src/app/app/programs/…             # client list + player
```

Reuse `admin-shell` / `app-shell`; do not restyle marketing.

---

## 11. Acceptance criteria (v1 demo)

1. Coach creates exercises with form video via **native upload** and via YouTube/Vimeo URL; both play in the library drawer and client player.
2. Coach builds a workout with ≥3 blocks (sets × reps + notes).
3. Coach builds a multi-week program and assigns it to a demo client **and** to a team.
4. Coach creates a team, adds athletes, programs the team calendar, and publishes.
5. Unpublished days are invisible to clients; publish reveals them (personal and team).
6. Client opens today’s workout (from either source), watches video, marks complete.
7. No nutrition, circuits, parent calendars, or analytics required to demo the flow.
8. Marketing site look/feel unchanged; no videos stored in git/`public/`.

---

## 12. Follow-ups (explicitly later)

- Communication: DM, group announcements, push (survey wants these; not replace-blockers)
- Athlete form-check video upload + coach comment thread
- Working max / last-performance autofill
- Video transcoding / CDN specialist (Mux, Cloudflare Stream) if Storage streaming is insufficient
- Team leaderboards / whiteboards
- Progress beyond completion (PRs, volume) if owner asks
- AI insights once booking + programming data exist

---

## 13. Cursor implementation prompt (kickoff)

```text
Goal: Build MA5 Programs v1 per docs/PROGRAMS_IMPLEMENTATION_PLAN.md.
Focus on: exercise library with native video upload (Supabase Storage) and
YouTube/Vimeo fallback, form cues, workout builder (blocks, sets, reps,
coach notes), program grid, Teams (create, roster, shared calendar, assign/
publish), individual assignment/publish, and client workout player with
completion tracking.
Do not build nutrition, assessments, circuits, prescription templates,
parent calendars, readiness analytics, or messaging in this branch.
Match TrainHeroic workflow/layout density; use MA5 brand tokens.
```

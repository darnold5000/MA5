-- MA5 Programs module: exercises, workouts, programs, teams, calendars, completions.
-- Creates ONLY ma5_* tables, storage bucket, and policies.
-- Apply after 001_platform_foundation and 002_mindbody_replacement.

-- ---------------------------------------------------------------------------
-- Exercises
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_exercises (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Legs'
    check (category in (
      'Chest', 'Back', 'Shoulders', 'Legs', 'Hamstrings / Glutes', 'Arms',
      'Core', 'Plyometrics', 'Speed & Agility', 'Olympic Lifts',
      'Conditioning', 'Mobility', 'Recovery'
    )),
  points_of_performance text not null default '',
  video_source text not null default 'none'
    check (video_source in ('upload', 'youtube', 'vimeo', 'none')),
  video_url text,
  video_storage_path text,
  video_poster_path text,
  default_param_1 text not null default 'reps'
    check (default_param_1 in ('reps', 'weight_lb')),
  default_param_2 text not null default 'weight_lb'
    check (default_param_2 in ('reps', 'weight_lb')),
  created_by uuid references public.ma5_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ma5_exercises_title_idx
  on public.ma5_exercises (title);

create index if not exists ma5_exercises_category_idx
  on public.ma5_exercises (category);

-- ---------------------------------------------------------------------------
-- Workouts (session templates)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_workouts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  coach_instructions text not null default '',
  created_by uuid references public.ma5_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ma5_workout_blocks (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.ma5_workouts (id) on delete cascade,
  sort_order int not null default 0,
  label text not null default 'A',
  section_title text,
  exercise_id uuid not null references public.ma5_exercises (id) on delete restrict,
  session_cues text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists ma5_workout_blocks_workout_idx
  on public.ma5_workout_blocks (workout_id, sort_order);

create table if not exists public.ma5_workout_block_sets (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.ma5_workout_blocks (id) on delete cascade,
  set_number int not null,
  reps int,
  weight_lb numeric(8, 2),
  unique (block_id, set_number)
);

-- ---------------------------------------------------------------------------
-- Programs (multi-week templates)
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_programs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  weeks int not null check (weeks >= 1 and weeks <= 52),
  created_by uuid references public.ma5_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ma5_program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.ma5_programs (id) on delete cascade,
  week_index int not null check (week_index >= 1),
  day_index int not null check (day_index >= 1 and day_index <= 7),
  workout_id uuid references public.ma5_workouts (id) on delete set null,
  unique (program_id, week_index, day_index)
);

create index if not exists ma5_program_days_program_idx
  on public.ma5_program_days (program_id);

-- ---------------------------------------------------------------------------
-- Teams
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 75),
  difficulty text,
  created_by uuid references public.ma5_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ma5_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.ma5_teams (id) on delete cascade,
  user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  role text not null default 'athlete'
    check (role in ('athlete')),
  joined_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create index if not exists ma5_team_members_user_idx
  on public.ma5_team_members (user_id);

-- ---------------------------------------------------------------------------
-- Assignments + calendar
-- ---------------------------------------------------------------------------

create table if not exists public.ma5_program_assignments (
  id uuid primary key default gen_random_uuid(),
  program_id uuid references public.ma5_programs (id) on delete set null,
  client_user_id uuid references public.ma5_profiles (id) on delete cascade,
  team_id uuid references public.ma5_teams (id) on delete cascade,
  start_date date not null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ma5_program_assignments_target_chk check (
    (client_user_id is not null and team_id is null)
    or (client_user_id is null and team_id is not null)
  )
);

create table if not exists public.ma5_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  workout_id uuid references public.ma5_workouts (id) on delete set null,
  title text not null default '',
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published')),
  source text not null default 'adhoc'
    check (source in ('program', 'library', 'adhoc')),
  client_user_id uuid references public.ma5_profiles (id) on delete cascade,
  team_id uuid references public.ma5_teams (id) on delete cascade,
  program_assignment_id uuid references public.ma5_program_assignments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ma5_calendar_entries_target_chk check (
    (client_user_id is not null and team_id is null)
    or (client_user_id is null and team_id is not null)
  )
);

create index if not exists ma5_calendar_entries_client_date_idx
  on public.ma5_calendar_entries (client_user_id, entry_date);

create index if not exists ma5_calendar_entries_team_date_idx
  on public.ma5_calendar_entries (team_id, entry_date);

create table if not exists public.ma5_workout_completions (
  id uuid primary key default gen_random_uuid(),
  calendar_entry_id uuid not null references public.ma5_calendar_entries (id) on delete cascade,
  client_user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  client_note text not null default '',
  unique (calendar_entry_id, client_user_id)
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

drop trigger if exists ma5_exercises_set_updated_at on public.ma5_exercises;
create trigger ma5_exercises_set_updated_at
before update on public.ma5_exercises
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_workouts_set_updated_at on public.ma5_workouts;
create trigger ma5_workouts_set_updated_at
before update on public.ma5_workouts
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_programs_set_updated_at on public.ma5_programs;
create trigger ma5_programs_set_updated_at
before update on public.ma5_programs
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_teams_set_updated_at on public.ma5_teams;
create trigger ma5_teams_set_updated_at
before update on public.ma5_teams
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_program_assignments_set_updated_at on public.ma5_program_assignments;
create trigger ma5_program_assignments_set_updated_at
before update on public.ma5_program_assignments
for each row execute function public.ma5_set_updated_at();

drop trigger if exists ma5_calendar_entries_set_updated_at on public.ma5_calendar_entries;
create trigger ma5_calendar_entries_set_updated_at
before update on public.ma5_calendar_entries
for each row execute function public.ma5_set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage bucket (private exercise videos)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'ma5-exercise-videos',
  'ma5-exercise-videos',
  false,
  524288000,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.ma5_is_team_member(target_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ma5_team_members m
    where m.team_id = target_team_id
      and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.ma5_exercises enable row level security;
alter table public.ma5_workouts enable row level security;
alter table public.ma5_workout_blocks enable row level security;
alter table public.ma5_workout_block_sets enable row level security;
alter table public.ma5_programs enable row level security;
alter table public.ma5_program_days enable row level security;
alter table public.ma5_teams enable row level security;
alter table public.ma5_team_members enable row level security;
alter table public.ma5_program_assignments enable row level security;
alter table public.ma5_calendar_entries enable row level security;
alter table public.ma5_workout_completions enable row level security;

-- Library: staff write; authenticated read (clients need exercise media on published workouts)
drop policy if exists ma5_exercises_staff_all on public.ma5_exercises;
create policy ma5_exercises_staff_all
on public.ma5_exercises for all to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_exercises_auth_read on public.ma5_exercises;
create policy ma5_exercises_auth_read
on public.ma5_exercises for select to authenticated
using (true);

drop policy if exists ma5_workouts_staff_all on public.ma5_workouts;
create policy ma5_workouts_staff_all
on public.ma5_workouts for all to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_workouts_auth_read on public.ma5_workouts;
create policy ma5_workouts_auth_read
on public.ma5_workouts for select to authenticated
using (true);

drop policy if exists ma5_workout_blocks_staff_all on public.ma5_workout_blocks;
create policy ma5_workout_blocks_staff_all
on public.ma5_workout_blocks for all to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_workout_blocks_auth_read on public.ma5_workout_blocks;
create policy ma5_workout_blocks_auth_read
on public.ma5_workout_blocks for select to authenticated
using (true);

drop policy if exists ma5_workout_block_sets_staff_all on public.ma5_workout_block_sets;
create policy ma5_workout_block_sets_staff_all
on public.ma5_workout_block_sets for all to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_workout_block_sets_auth_read on public.ma5_workout_block_sets;
create policy ma5_workout_block_sets_auth_read
on public.ma5_workout_block_sets for select to authenticated
using (true);

drop policy if exists ma5_programs_staff_all on public.ma5_programs;
create policy ma5_programs_staff_all
on public.ma5_programs for all to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_programs_auth_read on public.ma5_programs;
create policy ma5_programs_auth_read
on public.ma5_programs for select to authenticated
using (true);

drop policy if exists ma5_program_days_staff_all on public.ma5_program_days;
create policy ma5_program_days_staff_all
on public.ma5_program_days for all to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_program_days_auth_read on public.ma5_program_days;
create policy ma5_program_days_auth_read
on public.ma5_program_days for select to authenticated
using (true);

drop policy if exists ma5_teams_staff_all on public.ma5_teams;
create policy ma5_teams_staff_all
on public.ma5_teams for all to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_teams_member_read on public.ma5_teams;
create policy ma5_teams_member_read
on public.ma5_teams for select to authenticated
using (
  public.ma5_is_staff()
  or public.ma5_is_team_member(id)
);

drop policy if exists ma5_team_members_staff_all on public.ma5_team_members;
create policy ma5_team_members_staff_all
on public.ma5_team_members for all to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_team_members_self_read on public.ma5_team_members;
create policy ma5_team_members_self_read
on public.ma5_team_members for select to authenticated
using (user_id = auth.uid() or public.ma5_is_staff());

drop policy if exists ma5_program_assignments_staff_all on public.ma5_program_assignments;
create policy ma5_program_assignments_staff_all
on public.ma5_program_assignments for all to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_program_assignments_client_read on public.ma5_program_assignments;
create policy ma5_program_assignments_client_read
on public.ma5_program_assignments for select to authenticated
using (
  client_user_id = auth.uid()
  or (team_id is not null and public.ma5_is_team_member(team_id))
  or public.ma5_is_staff()
);

drop policy if exists ma5_calendar_entries_staff_all on public.ma5_calendar_entries;
create policy ma5_calendar_entries_staff_all
on public.ma5_calendar_entries for all to authenticated
using (public.ma5_is_staff())
with check (public.ma5_is_staff());

drop policy if exists ma5_calendar_entries_client_read on public.ma5_calendar_entries;
create policy ma5_calendar_entries_client_read
on public.ma5_calendar_entries for select to authenticated
using (
  public.ma5_is_staff()
  or (
    publish_status = 'published'
    and (
      client_user_id = auth.uid()
      or (team_id is not null and public.ma5_is_team_member(team_id))
    )
  )
);

drop policy if exists ma5_workout_completions_staff_read on public.ma5_workout_completions;
create policy ma5_workout_completions_staff_read
on public.ma5_workout_completions for select to authenticated
using (public.ma5_is_staff() or client_user_id = auth.uid());

drop policy if exists ma5_workout_completions_client_write on public.ma5_workout_completions;
create policy ma5_workout_completions_client_write
on public.ma5_workout_completions for insert to authenticated
with check (client_user_id = auth.uid());

drop policy if exists ma5_workout_completions_client_update on public.ma5_workout_completions;
create policy ma5_workout_completions_client_update
on public.ma5_workout_completions for update to authenticated
using (client_user_id = auth.uid())
with check (client_user_id = auth.uid());

-- Storage policies
drop policy if exists ma5_exercise_videos_staff_all on storage.objects;
create policy ma5_exercise_videos_staff_all
on storage.objects for all to authenticated
using (
  bucket_id = 'ma5-exercise-videos'
  and public.ma5_is_staff()
)
with check (
  bucket_id = 'ma5-exercise-videos'
  and public.ma5_is_staff()
);

drop policy if exists ma5_exercise_videos_auth_read on storage.objects;
create policy ma5_exercise_videos_auth_read
on storage.objects for select to authenticated
using (bucket_id = 'ma5-exercise-videos');

-- MA5 workout set logs: member-recorded weights/reps per set with history for autofill.

create table if not exists public.ma5_workout_set_logs (
  id uuid primary key default gen_random_uuid(),
  calendar_entry_id uuid not null references public.ma5_calendar_entries (id) on delete cascade,
  client_user_id uuid not null references public.ma5_profiles (id) on delete cascade,
  workout_block_id uuid not null references public.ma5_workout_blocks (id) on delete cascade,
  exercise_id uuid not null references public.ma5_exercises (id) on delete restrict,
  set_number int not null check (set_number >= 1),
  target_reps int,
  reps int,
  weight_lb numeric(8, 2),
  logged_at timestamptz not null default now(),
  unique (calendar_entry_id, client_user_id, workout_block_id, set_number)
);

create index if not exists ma5_workout_set_logs_session_idx
  on public.ma5_workout_set_logs (calendar_entry_id, client_user_id);

create index if not exists ma5_workout_set_logs_history_idx
  on public.ma5_workout_set_logs (client_user_id, exercise_id, target_reps, logged_at desc);

alter table public.ma5_workout_set_logs enable row level security;

drop policy if exists ma5_workout_set_logs_staff_read on public.ma5_workout_set_logs;
create policy ma5_workout_set_logs_staff_read
on public.ma5_workout_set_logs for select to authenticated
using (public.ma5_is_staff() or client_user_id = auth.uid());

drop policy if exists ma5_workout_set_logs_client_write on public.ma5_workout_set_logs;
create policy ma5_workout_set_logs_client_write
on public.ma5_workout_set_logs for insert to authenticated
with check (client_user_id = auth.uid());

drop policy if exists ma5_workout_set_logs_client_update on public.ma5_workout_set_logs;
create policy ma5_workout_set_logs_client_update
on public.ma5_workout_set_logs for update to authenticated
using (client_user_id = auth.uid())
with check (client_user_id = auth.uid());

drop policy if exists ma5_workout_set_logs_client_delete on public.ma5_workout_set_logs;
create policy ma5_workout_set_logs_client_delete
on public.ma5_workout_set_logs for delete to authenticated
using (client_user_id = auth.uid());

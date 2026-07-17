-- Add category to exercises (safe if 003 already applied without category).
alter table public.ma5_exercises
  add column if not exists category text not null default 'Legs';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ma5_exercises_category_check'
  ) then
    alter table public.ma5_exercises
      add constraint ma5_exercises_category_check
      check (category in (
        'Chest', 'Back', 'Shoulders', 'Legs', 'Hamstrings / Glutes', 'Arms',
        'Core', 'Plyometrics', 'Speed & Agility', 'Olympic Lifts',
        'Conditioning', 'Mobility', 'Recovery'
      ));
  end if;
end $$;

create index if not exists ma5_exercises_category_idx
  on public.ma5_exercises (category);

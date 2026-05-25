-- VXthenics — Row Level Security
-- Each user can only see and modify their own rows. Child tables
-- (workout_exercises, workout_sets) inherit ownership via their parent workout.

-- Enable RLS everywhere.
alter table public.users enable row level security;
alter table public.api_credentials enable row level security;
alter table public.exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.cardio_activities enable row level security;
alter table public.personal_records enable row level security;
alter table public.daily_steps enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.food_items enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.supplements enable row level security;
alter table public.supplement_logs enable row level security;
alter table public.body_measurements enable row level security;
alter table public.progress_photos enable row level security;
alter table public.water_logs enable row level security;
alter table public.mood_logs enable row level security;
alter table public.habit_streaks enable row level security;
alter table public.ai_reviews enable row level security;
alter table public.accountability_score enable row level security;

-- users: a user can read/update only their own profile row.
create policy "users self select" on public.users
  for select using (id = auth.uid());
create policy "users self update" on public.users
  for update using (id = auth.uid());

-- Helper: standard owner policy for tables with a user_id column.
-- (Written out per-table since policies can't be parameterized.)

-- Tables keyed by user_id — full CRUD on own rows.
do $$
declare
  t text;
  owner_tables text[] := array[
    'api_credentials','exercises','workouts','cardio_activities',
    'personal_records','daily_steps','sleep_logs','nutrition_logs',
    'supplements','supplement_logs','body_measurements','progress_photos',
    'water_logs','mood_logs','habit_streaks','ai_reviews','accountability_score'
  ];
begin
  foreach t in array owner_tables loop
    execute format(
      'create policy %I on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t || '_owner', t
    );
  end loop;
end $$;

-- food_items: global rows (user_id is null) readable by everyone;
-- custom rows readable/writable only by their owner.
create policy "food_items read" on public.food_items
  for select using (user_id is null or user_id = auth.uid());
create policy "food_items insert" on public.food_items
  for insert with check (user_id = auth.uid());
create policy "food_items update" on public.food_items
  for update using (user_id = auth.uid());
create policy "food_items delete" on public.food_items
  for delete using (user_id = auth.uid());

-- workout_exercises: ownership via parent workout.
create policy "workout_exercises owner" on public.workout_exercises
  for all using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id and w.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id and w.user_id = auth.uid()
    )
  );

-- workout_sets: ownership via parent workout_exercise -> workout.
create policy "workout_sets owner" on public.workout_sets
  for all using (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id and w.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from public.workout_exercises we
      join public.workouts w on w.id = we.workout_id
      where we.id = workout_sets.workout_exercise_id and w.user_id = auth.uid()
    )
  );

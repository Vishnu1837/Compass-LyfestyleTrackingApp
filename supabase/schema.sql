-- Compass — full schema. Paste into Supabase SQL Editor (Dashboard -> SQL Editor -> New query) and Run.
-- Generated from supabase/migrations/*.sql in order.

-- Compass — initial schema
-- Source-agnostic workout model + all module tables, with Row Level Security.
-- Every table is owned by a user and only that user can read/write their rows.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users (profile) — mirrors auth.users, holds app preferences
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  timezone text not null default 'UTC',
  active_workout_provider text not null default 'lyfta'
    check (active_workout_provider in ('lyfta', 'native')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- api_credentials — encrypted third-party tokens
-- ---------------------------------------------------------------------------
create table public.api_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null check (provider in ('lyfta', 'strava', 'google_fit')),
  access_token text,        -- encrypted at rest by the app
  refresh_token text,       -- encrypted at rest by the app
  expires_at timestamptz,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

-- ---------------------------------------------------------------------------
-- exercises — shared library (seeded from Lyfta, owned natively later)
-- ---------------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  source text not null default 'lyfta' check (source in ('lyfta', 'native')),
  external_id text,
  name text not null,
  image_url text,
  exercise_type text,
  equipment_ids text[],
  body_part_ids text[],
  target_muscle_ids text[],
  synergist_muscle_ids text[],
  created_at timestamptz not null default now(),
  unique (user_id, source, external_id)
);

-- ---------------------------------------------------------------------------
-- workouts — canonical, source-agnostic
-- ---------------------------------------------------------------------------
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  source text not null check (source in ('lyfta', 'native')),
  source_id text,                       -- lyfta workout id; null for native
  title text,
  performed_at timestamptz not null,
  body_weight numeric,
  total_volume numeric,
  duration_seconds integer,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, source, source_id)
);

create index workouts_user_performed_idx
  on public.workouts (user_id, performed_at desc);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_name text not null,
  exercise_type text,
  order_index integer not null default 0
);

create index workout_exercises_workout_idx
  on public.workout_exercises (workout_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null
    references public.workout_exercises (id) on delete cascade,
  set_number integer not null,
  weight numeric,
  reps integer,
  rir integer,
  duration integer,        -- seconds, for timed sets
  distance numeric,        -- meters, for distance sets
  is_completed boolean not null default true,
  set_type text,           -- 'normal' | 'warmup' | 'drop' | 'failure' ...
  record_type text         -- set when this set established a PR
);

create index workout_sets_we_idx
  on public.workout_sets (workout_exercise_id);

-- ---------------------------------------------------------------------------
-- cardio_activities — from Strava (Phase 3)
-- ---------------------------------------------------------------------------
create table public.cardio_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  strava_activity_id bigint,
  type text not null,
  start_time timestamptz not null,
  duration_seconds integer,
  distance_m numeric,
  avg_pace numeric,
  avg_hr integer,
  max_hr integer,
  avg_power integer,
  elevation_gain_m numeric,
  calories integer,
  polyline text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, strava_activity_id)
);

create index cardio_user_start_idx
  on public.cardio_activities (user_id, start_time desc);

-- ---------------------------------------------------------------------------
-- personal_records — derived
-- ---------------------------------------------------------------------------
create table public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete cascade,
  record_type text not null
    check (record_type in ('1rm', 'volume', 'reps', 'pace', 'distance')),
  value numeric not null,
  achieved_at timestamptz not null,
  workout_id uuid references public.workouts (id) on delete set null,
  cardio_activity_id uuid references public.cardio_activities (id) on delete set null,
  created_at timestamptz not null default now()
);

create index pr_user_exercise_idx
  on public.personal_records (user_id, exercise_id, record_type);

-- ---------------------------------------------------------------------------
-- daily_steps — from Google Fit (Phase 4)
-- ---------------------------------------------------------------------------
create table public.daily_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  step_count integer,
  distance_meters numeric,
  active_minutes integer,
  calories_burned integer,
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- sleep_logs
-- ---------------------------------------------------------------------------
create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  bedtime timestamptz,
  wake_time timestamptz,
  duration_minutes integer,
  quality_rating integer check (quality_rating between 1 and 5),
  notes text,
  source text not null default 'manual' check (source in ('manual', 'google_fit')),
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- nutrition
-- ---------------------------------------------------------------------------
create table public.food_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade, -- null = global/OFF
  barcode text,
  name text not null,
  brand text,
  serving_size text,
  calories numeric,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  source text not null default 'open_food_facts'
);

create table public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  meal text,
  food_id uuid references public.food_items (id) on delete set null,
  servings numeric not null default 1,
  logged_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- supplements
-- ---------------------------------------------------------------------------
create table public.supplements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  dose numeric,
  unit text,
  frequency_per_day integer not null default 1,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  supplement_id uuid not null references public.supplements (id) on delete cascade,
  taken_at timestamptz not null default now(),
  dose_taken numeric
);

-- ---------------------------------------------------------------------------
-- body / mood / water
-- ---------------------------------------------------------------------------
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  weight numeric,
  body_fat_pct numeric,
  chest numeric,
  waist numeric,
  hips numeric,
  biceps numeric,
  thighs numeric,
  notes text
);

create table public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  photo_url text not null,
  pose text,
  notes text
);

create table public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  amount_ml integer not null,
  logged_at timestamptz not null default now()
);

create table public.mood_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  date date not null,
  mood integer check (mood between 1 and 5),
  energy integer check (energy between 1 and 5),
  stress integer check (stress between 1 and 5),
  notes text,
  unique (user_id, date)
);

-- ---------------------------------------------------------------------------
-- accountability + AI
-- ---------------------------------------------------------------------------
create table public.habit_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  habit_type text not null,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_completed_date date,
  unique (user_id, habit_type)
);

create table public.ai_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  period_start date,
  period_end date,
  model_used text,
  prompt text,
  response jsonb,
  created_at timestamptz not null default now()
);

create table public.accountability_score (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  week_start date not null,
  workouts_score integer,
  cardio_score integer,
  nutrition_score integer,
  sleep_score integer,
  supplements_score integer,
  total_score integer,
  notes text,
  unique (user_id, week_start)
);

-- Compass — Row Level Security
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

-- Compass — personal record recomputation
-- Derives PRs from canonical workout_sets for a single user. Called after each
-- sync. Strength records only here (cardio PRs land with Strava in Phase 3).
--
-- Records computed per exercise:
--   '1rm'    — best estimated 1RM (Epley: weight * (1 + reps/30))
--   'volume' — best single-set volume (weight * reps)
--   'reps'   — most reps in a single set

create or replace function public.recompute_personal_records(uid uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Clear this user's strength PRs, then rebuild.
  delete from public.personal_records
  where user_id = uid and record_type in ('1rm', 'volume', 'reps');

  -- Flatten the user's sets with their exercise + workout context.
  with sets as (
    select
      we.exercise_id,
      w.id as workout_id,
      w.performed_at,
      ws.weight,
      ws.reps
    from public.workout_sets ws
    join public.workout_exercises we on we.id = ws.workout_exercise_id
    join public.workouts w on w.id = we.workout_id
    where w.user_id = uid
      and we.exercise_id is not null
      and ws.weight is not null
      and ws.reps is not null
      and ws.reps > 0
  ),
  ranked as (
    select
      exercise_id, workout_id, performed_at, weight, reps,
      weight * (1 + reps / 30.0) as est_1rm,
      weight * reps as volume,
      row_number() over (
        partition by exercise_id order by weight * (1 + reps / 30.0) desc
      ) as rn_1rm,
      row_number() over (
        partition by exercise_id order by weight * reps desc
      ) as rn_volume,
      row_number() over (
        partition by exercise_id order by reps desc
      ) as rn_reps
    from sets
  )
  insert into public.personal_records
    (user_id, exercise_id, record_type, value, achieved_at, workout_id)
  select uid, exercise_id, '1rm', round(est_1rm::numeric, 1), performed_at, workout_id
    from ranked where rn_1rm = 1 and est_1rm > 0
  union all
  select uid, exercise_id, 'volume', round(volume::numeric, 1), performed_at, workout_id
    from ranked where rn_volume = 1 and volume > 0
  union all
  select uid, exercise_id, 'reps', reps, performed_at, workout_id
    from ranked where rn_reps = 1 and reps > 0;
end;
$$;

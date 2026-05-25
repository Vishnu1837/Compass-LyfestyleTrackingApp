-- VXthenics — personal record recomputation
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

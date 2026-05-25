import type { SupabaseClient } from "@supabase/supabase-js";
import { getWorkoutProvider } from "../get-provider";
import type { WorkoutDetail } from "../types";

export interface SyncResult {
  ok: boolean;
  message?: string;
  workoutsSynced: number;
  exercisesSynced: number;
}

// Pulls from the user's active workout provider into the canonical tables.
// Incremental: only workouts newer than last_sync_at are fetched. Idempotent:
// a workout's exercises/sets are replaced on each sync.
export async function syncLyfta(
  supabase: SupabaseClient,
  userId: string,
): Promise<SyncResult> {
  const provider = await getWorkoutProvider(supabase, userId);
  if (!provider) {
    return {
      ok: false,
      message: "No Lyfta connection found.",
      workoutsSynced: 0,
      exercisesSynced: 0,
    };
  }

  // 1. Sync the exercise library and build an external_id -> our id map.
  const exercises = await provider.listExercises();
  if (exercises.length > 0) {
    await supabase.from("exercises").upsert(
      exercises.map((e) => ({
        user_id: userId,
        source: "lyfta",
        external_id: e.externalId,
        name: e.name,
        image_url: e.imageUrl,
        exercise_type: e.exerciseType,
        equipment_ids: e.equipmentIds ?? [],
        body_part_ids: e.bodyPartIds ?? [],
        target_muscle_ids: e.targetMuscleIds ?? [],
        synergist_muscle_ids: e.synergistMuscleIds ?? [],
      })),
      { onConflict: "user_id,source,external_id" },
    );
  }

  const { data: exRows } = await supabase
    .from("exercises")
    .select("id, external_id")
    .eq("user_id", userId)
    .eq("source", "lyfta");
  const externalToId = new Map<string, string>(
    (exRows ?? []).map((r) => [r.external_id as string, r.id as string]),
  );

  // 2. Incremental workout sync.
  const { data: cred } = await supabase
    .from("api_credentials")
    .select("last_sync_at")
    .eq("user_id", userId)
    .eq("provider", "lyfta")
    .maybeSingle();
  const since = cred?.last_sync_at ? new Date(cred.last_sync_at) : undefined;

  const summaries = await provider.listWorkouts(since);
  let workoutsSynced = 0;

  for (const summary of summaries) {
    if (!summary.sourceId) continue;
    const detail = await provider.getWorkout(summary.sourceId);
    await upsertWorkout(supabase, userId, detail, externalToId);
    workoutsSynced++;
  }

  // 3. Recompute personal records and stamp the sync time.
  await supabase.rpc("recompute_personal_records", { uid: userId });
  await supabase
    .from("api_credentials")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "lyfta");

  return {
    ok: true,
    workoutsSynced,
    exercisesSynced: exercises.length,
  };
}

async function upsertWorkout(
  supabase: SupabaseClient,
  userId: string,
  detail: WorkoutDetail,
  externalToId: Map<string, string>,
): Promise<void> {
  const { data: workoutRow, error } = await supabase
    .from("workouts")
    .upsert(
      {
        user_id: userId,
        source: "lyfta",
        source_id: detail.sourceId,
        title: detail.title,
        performed_at: detail.performedAt.toISOString(),
        body_weight: detail.bodyWeight,
        total_volume: detail.totalVolume,
        duration_seconds: detail.durationSeconds,
        raw_payload: detail.rawPayload ?? null,
      },
      { onConflict: "user_id,source,source_id" },
    )
    .select("id")
    .single();

  if (error || !workoutRow) return;
  const workoutId = workoutRow.id as string;

  // Replace children so re-syncs stay idempotent (sets cascade-delete).
  await supabase
    .from("workout_exercises")
    .delete()
    .eq("workout_id", workoutId);

  for (const entry of detail.exercises) {
    const { data: weRow } = await supabase
      .from("workout_exercises")
      .insert({
        workout_id: workoutId,
        exercise_id: entry.exerciseExternalId
          ? (externalToId.get(entry.exerciseExternalId) ?? null)
          : null,
        exercise_name: entry.exerciseName,
        exercise_type: entry.exerciseType,
        order_index: entry.orderIndex,
      })
      .select("id")
      .single();

    if (!weRow || entry.sets.length === 0) continue;

    await supabase.from("workout_sets").insert(
      entry.sets.map((s) => ({
        workout_exercise_id: weRow.id,
        set_number: s.setNumber,
        weight: s.weight,
        reps: s.reps,
        rir: s.rir,
        duration: s.duration,
        distance: s.distance,
        is_completed: s.isCompleted,
        set_type: s.setType,
        record_type: s.recordType,
      })),
    );
  }
}

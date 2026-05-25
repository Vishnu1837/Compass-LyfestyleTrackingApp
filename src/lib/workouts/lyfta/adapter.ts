import type { WorkoutProvider } from "../provider";
import type {
  CanonicalExerciseEntry,
  CanonicalSet,
  Exercise,
  ProgressPoint,
  ProviderCapabilities,
  Workout,
  WorkoutDetail,
} from "../types";
import { LyftaClient } from "./client";
import type {
  LyftaExercise,
  LyftaExercisesResponse,
  LyftaProgressResponse,
  LyftaSet,
  LyftaWorkout,
  LyftaWorkoutExercise,
  LyftaWorkoutsResponse,
} from "./api-types";
import { toDate, toInt, toNumber, toIdArray } from "./parse";

const PAGE_SIZE = 100;
const MAX_PAGES = 100; // hard ceiling: 100 * 100 = 10k workouts

export class LyftaAdapter implements WorkoutProvider {
  private readonly client: LyftaClient;
  private detailCache = new Map<string, WorkoutDetail>();
  private orderedSummaries: Workout[] | null = null;

  constructor(apiKey: string) {
    this.client = new LyftaClient(apiKey);
  }

  getProviderName(): string {
    return "lyfta";
  }

  getCapabilities(): ProviderCapabilities {
    return {
      hasExerciseProgress: true,
      hasExerciseLibrary: true,
      supportsIncrementalSync: true,
    };
  }

  // Lyfta has no /workouts/{id} endpoint and /workouts returns full detail,
  // so we page through it once and memoize. Workouts come newest-first, which
  // lets `since` short-circuit paging for incremental syncs.
  private async loadWorkouts(since?: Date): Promise<void> {
    this.detailCache.clear();
    const summaries: Workout[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await this.client.get<LyftaWorkoutsResponse>(
        "/api/v1/workouts",
        { limit: PAGE_SIZE, page },
      );
      const workouts = res.workouts ?? [];
      let reachedCutoff = false;

      for (const w of workouts) {
        const detail = this.mapWorkoutDetail(w);
        if (since && detail.performedAt < since) {
          reachedCutoff = true;
          break;
        }
        this.detailCache.set(detail.sourceId!, detail);
        summaries.push(this.toSummary(detail));
      }

      const totalPages = res.total_pages ?? page;
      if (reachedCutoff || workouts.length < PAGE_SIZE || page >= totalPages) {
        break;
      }
    }

    this.orderedSummaries = summaries;
  }

  async listWorkouts(since?: Date): Promise<Workout[]> {
    await this.loadWorkouts(since);
    return this.orderedSummaries ?? [];
  }

  async getWorkout(id: string): Promise<WorkoutDetail> {
    if (!this.detailCache.has(id)) {
      await this.loadWorkouts();
    }
    const detail = this.detailCache.get(id);
    if (!detail) {
      throw new Error(`Lyfta workout ${id} not found`);
    }
    return detail;
  }

  async listExercises(): Promise<Exercise[]> {
    const all: Exercise[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await this.client.get<LyftaExercisesResponse>(
        "/api/v1/exercises",
        { limit: PAGE_SIZE, page },
      );
      const exercises = res.exercises ?? [];
      all.push(...exercises.map((e) => this.mapExercise(e)));
      if (exercises.length < PAGE_SIZE) break;
    }
    return all;
  }

  async getExerciseProgress(
    exerciseId: string,
    days: number,
  ): Promise<ProgressPoint[]> {
    const res = await this.client.get<LyftaProgressResponse>(
      "/api/v1/exercises/progress",
      { exercise_id: exerciseId, duration: days },
    );
    return (res.data ?? [])
      .map((p) => ({
        date: toDate(p.date),
        value: toNumber(p.estimated_rm) ?? 0,
        metric: "est_1rm" as const,
      }))
      .filter((p) => !Number.isNaN(p.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // --- mapping -------------------------------------------------------------

  private mapSet(s: LyftaSet, index: number): CanonicalSet {
    return {
      setNumber: index + 1,
      weight: toNumber(s.weight),
      reps: toInt(s.reps),
      rir: toInt(s.rir),
      duration: toInt(s.duration),
      distance: toNumber(s.distance),
      isCompleted: Boolean(s.is_completed),
      setType: null,
      recordType: s.record_type ?? null,
      recordValue: toNumber(s.record_value),
    };
  }

  private mapExerciseEntry(
    e: LyftaWorkoutExercise,
    index: number,
  ): CanonicalExerciseEntry {
    return {
      exerciseExternalId: e.exercise_id != null ? String(e.exercise_id) : null,
      exerciseName: e.excercise_name,
      exerciseType: e.exercise_type ?? null,
      orderIndex: index,
      sets: (e.sets ?? []).map((s, i) => this.mapSet(s, i)),
    };
  }

  private mapWorkoutDetail(w: LyftaWorkout): WorkoutDetail {
    return {
      source: "lyfta",
      sourceId: String(w.id),
      title: w.title ?? null,
      performedAt: toDate(w.workout_perform_date),
      bodyWeight: toNumber(w.body_weight),
      totalVolume: toNumber(w.total_volume),
      durationSeconds: null,
      exercises: (w.exercises ?? []).map((e, i) => this.mapExerciseEntry(e, i)),
      rawPayload: w,
    };
  }

  private toSummary(d: WorkoutDetail): Workout {
    return {
      source: d.source,
      sourceId: d.sourceId,
      title: d.title,
      performedAt: d.performedAt,
      bodyWeight: d.bodyWeight,
      totalVolume: d.totalVolume,
      durationSeconds: d.durationSeconds,
    };
  }

  private mapExercise(e: LyftaExercise): Exercise {
    return {
      externalId: String(e.id),
      name: e.name,
      imageUrl: e.image_name ?? null,
      exerciseType: e.exercise_type ?? null,
      equipmentIds: toIdArray(e.equipment_id),
      bodyPartIds: toIdArray(e.body_part_id),
      targetMuscleIds: toIdArray(e.Target_muscles_id),
      synergistMuscleIds: toIdArray(e.Synergist_muscles_id),
    };
  }
}

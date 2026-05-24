// Canonical workout model. Every workout provider (Lyfta today, native later)
// translates its own shape into these types. The rest of the app — dashboard,
// PR detection, AI coach — only ever sees these.

export type WorkoutSource = "lyfta" | "native";

export type SetType =
  | "normal"
  | "warmup"
  | "drop"
  | "failure"
  | "timed"
  | "distance";

export interface CanonicalSet {
  setNumber: number;
  weight?: number | null;
  reps?: number | null;
  rir?: number | null;
  /** seconds, for timed sets */
  duration?: number | null;
  /** meters, for distance sets */
  distance?: number | null;
  isCompleted: boolean;
  setType?: SetType | null;
}

export interface CanonicalExerciseEntry {
  /** Provider's exercise id, mapped to our exercise library where possible. */
  exerciseExternalId?: string | null;
  exerciseName: string;
  exerciseType?: string | null;
  orderIndex: number;
  sets: CanonicalSet[];
}

/** Summary shape returned by listWorkouts. */
export interface Workout {
  source: WorkoutSource;
  /** Provider's id for the workout (null for native-logged). */
  sourceId: string | null;
  title?: string | null;
  performedAt: Date;
  bodyWeight?: number | null;
  totalVolume?: number | null;
  durationSeconds?: number | null;
}

/** Full workout with exercises and sets, returned by getWorkout. */
export interface WorkoutDetail extends Workout {
  exercises: CanonicalExerciseEntry[];
  rawPayload?: unknown;
}

export interface Exercise {
  externalId: string;
  name: string;
  imageUrl?: string | null;
  exerciseType?: string | null;
  equipmentIds?: string[];
  bodyPartIds?: string[];
  targetMuscleIds?: string[];
  synergistMuscleIds?: string[];
}

/** A single point on an exercise's progress chart (e.g. est. 1RM over time). */
export interface ProgressPoint {
  date: Date;
  /** e.g. estimated 1RM, top-set weight, or total volume — see metric. */
  value: number;
  metric: "est_1rm" | "top_weight" | "volume" | "reps";
}

export interface ProviderCapabilities {
  /** Provider returns precomputed estimated 1RM / progress series. */
  hasExerciseProgress: boolean;
  /** Provider exposes a browsable exercise library. */
  hasExerciseLibrary: boolean;
  /** Provider supports incremental sync via a `since` cursor. */
  supportsIncrementalSync: boolean;
}

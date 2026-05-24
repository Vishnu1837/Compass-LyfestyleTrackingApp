import type {
  Exercise,
  ProgressPoint,
  ProviderCapabilities,
  Workout,
  WorkoutDetail,
} from "./types";

// The one interface every workout source implements. Nothing in the app talks
// to Lyfta (or any future source) directly — it talks to a WorkoutProvider.
// Swapping Lyfta for native tracking later means writing a new adapter and
// flipping `users.active_workout_provider`; the rest of the app is unchanged.
export interface WorkoutProvider {
  listWorkouts(since?: Date): Promise<Workout[]>;
  getWorkout(id: string): Promise<WorkoutDetail>;
  listExercises(): Promise<Exercise[]>;
  getExerciseProgress(
    exerciseId: string,
    days: number,
  ): Promise<ProgressPoint[]>;
  getProviderName(): string;
  getCapabilities(): ProviderCapabilities;
}

/** Raised by adapters for auth / connectivity failures so callers can react
 *  (e.g. prompt the user to re-enter their key). */
export class WorkoutProviderError extends Error {
  constructor(
    message: string,
    readonly cause?: { status?: number; provider: string },
  ) {
    super(message);
    this.name = "WorkoutProviderError";
  }
}

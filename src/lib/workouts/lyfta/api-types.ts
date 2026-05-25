// Raw response shapes from the Lyfta API (https://my.lyfta.app), as documented
// and verified against live responses. Numbers are often strings; "null" may
// appear as a literal string — see ./parse.ts.

export interface LyftaListEnvelope {
  status: boolean;
  message?: string;
  count?: number;
  total_records?: number;
  total_pages?: number;
  current_page?: number;
  limit?: number;
}

export interface LyftaSet {
  id: string;
  weight: string | null;
  reps: string | null;
  rir: string | null;
  duration: string | null;
  distance: string | null;
  set_type_id: string | null;
  is_completed: boolean;
  record_type: string | null;
  record_level: string | null;
  record_value: string | null;
}

export interface LyftaWorkoutExercise {
  exercise_id: number;
  excercise_name: string; // [sic] — Lyfta misspells this field
  exercise_type: string | null;
  exercise_image: string | null;
  exercise_rest_time: number | null;
  sets: LyftaSet[];
}

export interface LyftaWorkout {
  id: number;
  title: string | null;
  body_weight: number | null;
  workout_perform_date: string;
  total_volume: number | null;
  totalLiftedWeight: number | null;
  user?: { username?: string };
  exercises: LyftaWorkoutExercise[];
}

export interface LyftaWorkoutsResponse extends LyftaListEnvelope {
  workouts: LyftaWorkout[];
}

export interface LyftaExercise {
  id: string;
  name: string;
  image_name: string | null;
  equipment_id: string | null;
  body_part_id: string | null;
  Target_muscles_id: string | null;
  Synergist_muscles_id: string | null;
  exercise_type: string | null;
}

export interface LyftaExercisesResponse extends LyftaListEnvelope {
  exercises: LyftaExercise[];
}

export interface LyftaProgressPoint {
  date: string;
  best_weight: number | null;
  best_reps: number | null;
  best_volume: number | null;
  estimated_rm: string | null;
}

export interface LyftaProgressResponse {
  status: boolean;
  message?: string;
  weight_unit?: string;
  data: LyftaProgressPoint[];
}

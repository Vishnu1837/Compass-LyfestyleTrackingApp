import type { SupabaseClient } from "@supabase/supabase-js";

// The six tracked habits. Five contribute to the weekly score (20 pts each);
// water is tracked as a streak too. Supplements only count if the user has any
// active, so people who don't take supplements aren't penalized.
export const HABITS = [
  "workout",
  "cardio",
  "nutrition",
  "sleep",
  "supplements",
  "water",
] as const;
export type Habit = (typeof HABITS)[number];

const WATER_GOAL_ML = 2500;
const SCORED_HABITS: Habit[] = [
  "workout",
  "cardio",
  "nutrition",
  "sleep",
  "supplements",
];

function dateKey(d: string | Date): string {
  return (typeof d === "string" ? new Date(d) : d).toISOString().slice(0, 10);
}

interface HabitData {
  metDays: Record<Habit, Set<string>>;
  hasActiveSupplements: boolean;
}

// Fetches `days` of history and reduces each habit to the set of dates it was met.
async function getHabitData(
  supabase: SupabaseClient,
  userId: string,
  days: number,
): Promise<HabitData> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);
  const sinceDate = since.toISOString().slice(0, 10);
  const sinceTs = since.toISOString();

  const [workouts, cardio, nutrition, sleep, suppLogs, water, activeSupps] =
    await Promise.all([
      supabase.from("workouts").select("performed_at").eq("user_id", userId).gte("performed_at", sinceTs),
      supabase.from("cardio_activities").select("start_time").eq("user_id", userId).gte("start_time", sinceTs),
      supabase.from("nutrition_logs").select("date").eq("user_id", userId).gte("date", sinceDate),
      supabase.from("sleep_logs").select("date").eq("user_id", userId).gte("date", sinceDate),
      supabase.from("supplement_logs").select("taken_at").eq("user_id", userId).gte("taken_at", sinceTs),
      supabase.from("water_logs").select("date, amount_ml").eq("user_id", userId).gte("date", sinceDate),
      supabase.from("supplements").select("id").eq("user_id", userId).eq("active", true).limit(1),
    ]);

  const metDays: Record<Habit, Set<string>> = {
    workout: new Set((workouts.data ?? []).map((r) => dateKey(r.performed_at))),
    cardio: new Set((cardio.data ?? []).map((r) => dateKey(r.start_time))),
    nutrition: new Set((nutrition.data ?? []).map((r) => r.date)),
    sleep: new Set((sleep.data ?? []).map((r) => r.date)),
    supplements: new Set((suppLogs.data ?? []).map((r) => dateKey(r.taken_at))),
    water: new Set<string>(),
  };

  const waterByDay = new Map<string, number>();
  for (const r of water.data ?? [])
    waterByDay.set(r.date, (waterByDay.get(r.date) ?? 0) + (Number(r.amount_ml) || 0));
  for (const [date, ml] of waterByDay)
    if (ml >= WATER_GOAL_ML) metDays.water.add(date);

  return { metDays, hasActiveSupplements: (activeSupps.data?.length ?? 0) > 0 };
}

function last7Keys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

// Current streak with a grace day for "today" (not yet logged).
function streakFor(met: Set<string>): number {
  const today = new Date();
  const cursor = new Date(today);
  if (!met.has(cursor.toISOString().slice(0, 10))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1); // grace: start from yesterday
  }
  let streak = 0;
  while (met.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

export interface AccountabilitySummary {
  total: number;
  subscores: Record<"workout" | "cardio" | "nutrition" | "sleep" | "supplements", number>;
  daysMetThisWeek: Record<Habit, number>;
  streaks: Record<Habit, number>;
  hasActiveSupplements: boolean;
}

export async function computeAccountability(
  supabase: SupabaseClient,
  userId: string,
): Promise<AccountabilitySummary> {
  const { metDays, hasActiveSupplements } = await getHabitData(supabase, userId, 90);
  const week = last7Keys();

  const daysMet = (h: Habit) => week.filter((d) => metDays[h].has(d)).length;

  const daysMetThisWeek = Object.fromEntries(
    HABITS.map((h) => [h, daysMet(h)]),
  ) as Record<Habit, number>;

  const subscoreFor = (h: Habit) => {
    // No active supplements => don't penalize; award full marks.
    if (h === "supplements" && !hasActiveSupplements) return 20;
    return Math.round((daysMet(h) / 7) * 20);
  };

  const subscores = {
    workout: subscoreFor("workout"),
    cardio: subscoreFor("cardio"),
    nutrition: subscoreFor("nutrition"),
    sleep: subscoreFor("sleep"),
    supplements: subscoreFor("supplements"),
  };
  const total = SCORED_HABITS.reduce((s, h) => s + subscores[h as keyof typeof subscores], 0);

  const streaks = Object.fromEntries(
    HABITS.map((h) => [h, streakFor(metDays[h])]),
  ) as Record<Habit, number>;

  return { total, subscores, daysMetThisWeek, streaks, hasActiveSupplements };
}

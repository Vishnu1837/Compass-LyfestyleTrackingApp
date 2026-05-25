import type { SupabaseClient } from "@supabase/supabase-js";

// Builds a compact 14-day data snapshot for the AI coach. Kept small and
// aggregated to stay well within token limits and avoid leaking raw rows.
export async function buildCoachContext(
  supabase: SupabaseClient,
  userId: string,
): Promise<string> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 14);
  const sinceDate = since.toISOString().slice(0, 10);
  const sinceTs = since.toISOString();

  const [
    workouts,
    prs,
    cardio,
    steps,
    nutrition,
    sleep,
    supplements,
    water,
    body,
  ] = await Promise.all([
    supabase
      .from("workouts")
      .select("title, performed_at, total_volume")
      .eq("user_id", userId)
      .gte("performed_at", sinceTs)
      .order("performed_at", { ascending: false }),
    supabase
      .from("personal_records")
      .select("record_type, value, achieved_at, exercises(name)")
      .eq("user_id", userId)
      .order("achieved_at", { ascending: false })
      .limit(8),
    supabase
      .from("cardio_activities")
      .select("type, distance_m, duration_seconds, avg_pace, start_time")
      .eq("user_id", userId)
      .gte("start_time", sinceTs),
    supabase
      .from("daily_steps")
      .select("date, step_count")
      .eq("user_id", userId)
      .gte("date", sinceDate),
    supabase
      .from("nutrition_logs")
      .select("date, servings, food_items(calories, protein_g)")
      .eq("user_id", userId)
      .gte("date", sinceDate),
    supabase
      .from("sleep_logs")
      .select("date, duration_minutes, quality_rating")
      .eq("user_id", userId)
      .gte("date", sinceDate),
    supabase
      .from("supplements")
      .select("name, frequency_per_day")
      .eq("user_id", userId)
      .eq("active", true),
    supabase
      .from("water_logs")
      .select("date, amount_ml")
      .eq("user_id", userId)
      .gte("date", sinceDate),
    supabase
      .from("body_measurements")
      .select("date, weight, body_fat_pct")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(2),
  ]);

  const avg = (nums: number[]) =>
    nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;

  // Nutrition: average daily calories/protein over days that have logs.
  const nutByDay = new Map<string, { cal: number; protein: number }>();
  for (const r of nutrition.data ?? []) {
    const f = (r.food_items ?? {}) as { calories?: number; protein_g?: number };
    const s = Number(r.servings) || 0;
    const d = nutByDay.get(r.date) ?? { cal: 0, protein: 0 };
    d.cal += (f.calories ?? 0) * s;
    d.protein += (f.protein_g ?? 0) * s;
    nutByDay.set(r.date, d);
  }
  const nutDays = [...nutByDay.values()];

  const waterByDay = new Map<string, number>();
  for (const r of water.data ?? [])
    waterByDay.set(r.date, (waterByDay.get(r.date) ?? 0) + (Number(r.amount_ml) || 0));

  const snapshot = {
    period: `${sinceDate} to today (14 days)`,
    strength: {
      workouts: workouts.data?.length ?? 0,
      sessions: (workouts.data ?? [])
        .slice(0, 10)
        .map((w) => ({
          title: w.title,
          date: String(w.performed_at).slice(0, 10),
          volumeKg: w.total_volume ? Math.round(Number(w.total_volume)) : null,
        })),
      recentPRs: (prs.data ?? []).map((p) => ({
        exercise: (p.exercises as { name?: string } | null)?.name ?? null,
        type: p.record_type,
        value: Number(p.value),
        date: String(p.achieved_at).slice(0, 10),
      })),
    },
    cardio: {
      activities: cardio.data?.length ?? 0,
      totalDistanceKm: Math.round(
        ((cardio.data ?? []).reduce((s, c) => s + (Number(c.distance_m) || 0), 0) /
          1000) *
          10,
      ) / 10,
      byType: (cardio.data ?? []).reduce<Record<string, number>>((acc, c) => {
        acc[c.type] = (acc[c.type] ?? 0) + 1;
        return acc;
      }, {}),
    },
    steps: {
      avgDaily: avg((steps.data ?? []).map((s) => Number(s.step_count) || 0)),
      daysLogged: steps.data?.length ?? 0,
    },
    nutrition: {
      daysLogged: nutDays.length,
      avgCalories: avg(nutDays.map((d) => d.cal)),
      avgProteinG: avg(nutDays.map((d) => d.protein)),
      note: "No calorie/macro goal set by the user.",
    },
    sleep: {
      nightsLogged: sleep.data?.length ?? 0,
      avgHours: sleep.data?.length
        ? Math.round(
            (avg((sleep.data ?? []).map((s) => Number(s.duration_minutes) || 0)) ??
              0) /
              6,
          ) / 10
        : null,
      avgQuality: avg(
        (sleep.data ?? [])
          .map((s) => Number(s.quality_rating))
          .filter((n) => n > 0),
      ),
    },
    supplements: (supplements.data ?? []).map((s) => ({
      name: s.name,
      perDay: s.frequency_per_day,
    })),
    water: {
      avgDailyMl: avg([...waterByDay.values()]),
    },
    body: (body.data ?? []).map((b) => ({
      date: b.date,
      weightKg: b.weight ? Number(b.weight) : null,
      bodyFatPct: b.body_fat_pct ? Number(b.body_fat_pct) : null,
    })),
  };

  return JSON.stringify(snapshot, null, 2);
}

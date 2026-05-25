import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchActivities, getValidStravaToken } from "./client";
import type { StravaActivity } from "./types";

export interface CardioSyncResult {
  ok: boolean;
  message?: string;
  activitiesSynced: number;
}

function paceSecPerKm(a: StravaActivity): number | null {
  if (!a.distance || !a.moving_time) return null;
  return a.moving_time / (a.distance / 1000);
}

// Syncs a single activity by id (used by the webhook for near-realtime).
export async function syncStrava(
  supabase: SupabaseClient,
  userId: string,
): Promise<CardioSyncResult> {
  const token = await getValidStravaToken(supabase, userId);
  if (!token) {
    return { ok: false, message: "No Strava connection found.", activitiesSynced: 0 };
  }

  // Incremental: fetch activities since the last sync (minus a 1-day overlap
  // to catch edits), else full history.
  const { data: cred } = await supabase
    .from("api_credentials")
    .select("last_sync_at")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .maybeSingle();

  const after = cred?.last_sync_at
    ? Math.floor(new Date(cred.last_sync_at).getTime() / 1000) - 86400
    : undefined;

  const activities = await fetchActivities(token, after);

  if (activities.length > 0) {
    const rows = activities.map((a) => ({
      user_id: userId,
      strava_activity_id: a.id,
      type: (a.sport_type ?? a.type ?? "").toLowerCase(),
      start_time: a.start_date,
      duration_seconds: a.moving_time,
      distance_m: a.distance,
      avg_pace: paceSecPerKm(a),
      avg_hr: a.average_heartrate ? Math.round(a.average_heartrate) : null,
      max_hr: a.max_heartrate ? Math.round(a.max_heartrate) : null,
      avg_power: a.average_watts ? Math.round(a.average_watts) : null,
      elevation_gain_m: a.total_elevation_gain ?? null,
      calories: a.calories ? Math.round(a.calories) : null,
      polyline: a.map?.summary_polyline ?? a.map?.polyline ?? null,
      raw_payload: a,
    }));

    await supabase
      .from("cardio_activities")
      .upsert(rows, { onConflict: "user_id,strava_activity_id" });
  }

  await recomputeCardioPRs(supabase, userId);
  await supabase
    .from("api_credentials")
    .update({ last_sync_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("provider", "strava");

  return { ok: true, activitiesSynced: activities.length };
}

// Cardio PRs: longest run (distance) and best running pace over a 5k+ effort.
async function recomputeCardioPRs(
  supabase: SupabaseClient,
  userId: string,
): Promise<void> {
  const { data: runs } = await supabase
    .from("cardio_activities")
    .select("id, type, distance_m, avg_pace, start_time")
    .eq("user_id", userId)
    .eq("type", "run");

  if (!runs || runs.length === 0) return;

  // Longest run.
  const longest = runs
    .filter((r) => r.distance_m != null)
    .sort((a, b) => Number(b.distance_m) - Number(a.distance_m))[0];

  // Best (lowest) pace among runs of at least 5 km.
  const fastest = runs
    .filter((r) => r.avg_pace != null && Number(r.distance_m) >= 5000)
    .sort((a, b) => Number(a.avg_pace) - Number(b.avg_pace))[0];

  // Replace existing cardio PRs.
  await supabase
    .from("personal_records")
    .delete()
    .eq("user_id", userId)
    .not("cardio_activity_id", "is", null);

  const prs: Record<string, unknown>[] = [];
  if (longest) {
    prs.push({
      user_id: userId,
      record_type: "distance",
      value: Number(longest.distance_m),
      achieved_at: longest.start_time,
      cardio_activity_id: longest.id,
    });
  }
  if (fastest) {
    prs.push({
      user_id: userId,
      record_type: "pace",
      value: Number(fastest.avg_pace),
      achieved_at: fastest.start_time,
      cardio_activity_id: fastest.id,
    });
  }
  if (prs.length) await supabase.from("personal_records").insert(prs);
}

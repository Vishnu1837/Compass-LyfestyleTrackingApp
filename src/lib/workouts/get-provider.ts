import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/crypto";
import { LyftaAdapter } from "./lyfta/adapter";
import type { WorkoutProvider } from "./provider";

// Resolves the active WorkoutProvider for a user from their stored, encrypted
// credentials. Returns null if the user hasn't connected a workout source yet.
export async function getWorkoutProvider(
  supabase: SupabaseClient,
  userId: string,
): Promise<WorkoutProvider | null> {
  const { data: profile } = await supabase
    .from("users")
    .select("active_workout_provider")
    .eq("id", userId)
    .single();

  const active = profile?.active_workout_provider ?? "lyfta";

  if (active === "lyfta") {
    const { data: cred } = await supabase
      .from("api_credentials")
      .select("access_token")
      .eq("user_id", userId)
      .eq("provider", "lyfta")
      .maybeSingle();

    if (!cred?.access_token) return null;
    return new LyftaAdapter(decryptToken(cred.access_token));
  }

  // 'native' provider lands in a later phase.
  return null;
}

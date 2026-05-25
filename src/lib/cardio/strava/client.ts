import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { refreshTokens } from "./oauth";
import type { StravaActivity } from "./types";

const API_BASE = "https://www.strava.com/api/v3";
// Refresh a little early to avoid using a token that expires mid-request.
const REFRESH_SKEW_SECONDS = 120;

// Returns a valid Strava access token, transparently refreshing (and
// persisting the rotated refresh token) when the current one is near expiry.
export async function getValidStravaToken(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data: cred } = await supabase
    .from("api_credentials")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .eq("provider", "strava")
    .maybeSingle();

  if (!cred?.access_token || !cred?.refresh_token) return null;

  const expiresAt = cred.expires_at ? new Date(cred.expires_at).getTime() : 0;
  const stillValid = expiresAt - REFRESH_SKEW_SECONDS * 1000 > Date.now();
  if (stillValid) {
    return decryptToken(cred.access_token);
  }

  // Refresh.
  const refreshed = await refreshTokens(decryptToken(cred.refresh_token));
  await supabase
    .from("api_credentials")
    .update({
      access_token: encryptToken(refreshed.access_token),
      refresh_token: encryptToken(refreshed.refresh_token),
      expires_at: new Date(refreshed.expires_at * 1000).toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "strava");

  return refreshed.access_token;
}

// Fetches activities updated after `afterEpoch` (seconds), paginating fully.
export async function fetchActivities(
  accessToken: string,
  afterEpoch?: number,
  perPage = 100,
): Promise<StravaActivity[]> {
  const all: StravaActivity[] = [];
  for (let page = 1; page <= 50; page++) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
    });
    if (afterEpoch) params.set("after", String(afterEpoch));

    const res = await fetch(
      `${API_BASE}/athlete/activities?${params.toString()}`,
      { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
    );
    if (res.status === 429) {
      throw new Error("Strava rate limit exceeded — try again shortly.");
    }
    if (!res.ok) {
      throw new Error(`Strava activities fetch failed: HTTP ${res.status}`);
    }
    const batch = (await res.json()) as StravaActivity[];
    all.push(...batch);
    if (batch.length < perPage) break;
  }
  return all;
}

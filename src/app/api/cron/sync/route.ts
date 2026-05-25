import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncLyfta } from "@/lib/workouts/lyfta/sync";
import { syncStrava } from "@/lib/cardio/strava/sync";

export const maxDuration = 300;

// Nightly sync of every connected provider for every user. Triggered by Vercel
// Cron (see vercel.json) and guarded by CRON_SECRET. Strava also syncs in near
// real-time via webhook; this is the backfill safety net.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: creds } = await supabase
    .from("api_credentials")
    .select("user_id, provider")
    .in("provider", ["lyfta", "strava"]);

  const results: Record<string, unknown> = {};
  for (const { user_id, provider } of creds ?? []) {
    const key = `${provider}:${user_id}`;
    try {
      results[key] =
        provider === "lyfta"
          ? await syncLyfta(supabase, user_id)
          : await syncStrava(supabase, user_id);
    } catch (err) {
      results[key] = {
        ok: false,
        message: err instanceof Error ? err.message : "sync error",
      };
    }
  }

  return NextResponse.json({ synced: Object.keys(results).length, results });
}

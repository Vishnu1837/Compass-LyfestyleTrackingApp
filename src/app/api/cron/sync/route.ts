import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncLyfta } from "@/lib/workouts/lyfta/sync";

export const maxDuration = 60;

// Nightly Lyfta sync for every connected user. Triggered by Vercel Cron
// (see vercel.json) and guarded by CRON_SECRET.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data: creds } = await supabase
    .from("api_credentials")
    .select("user_id")
    .eq("provider", "lyfta");

  const results: Record<string, unknown> = {};
  for (const { user_id } of creds ?? []) {
    try {
      results[user_id] = await syncLyfta(supabase, user_id);
    } catch (err) {
      results[user_id] = {
        ok: false,
        message: err instanceof Error ? err.message : "sync error",
      };
    }
  }

  return NextResponse.json({ synced: Object.keys(results).length, results });
}

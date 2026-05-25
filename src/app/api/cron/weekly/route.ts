import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeAccountability } from "@/lib/accountability/score";
import { isEmailConfigured, sendWeeklyEmail } from "@/lib/email/weekly";
import type { CoachReview } from "@/lib/ai/types";

export const maxDuration = 300;

// Sunday-night job: compute + persist each user's weekly accountability score,
// then email a summary (with the latest AI review) if Resend is configured.
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Week start = Monday of the current week (UTC).
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sun
  const diffToMonday = (day + 6) % 7;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - diffToMonday);
  const weekStartStr = weekStart.toISOString().slice(0, 10);

  const { data: users } = await supabase.from("users").select("id, email");
  const emailOn = isEmailConfigured();
  const results: Record<string, unknown> = {};

  for (const u of users ?? []) {
    try {
      const summary = await computeAccountability(supabase, u.id);

      await supabase.from("accountability_score").upsert(
        {
          user_id: u.id,
          week_start: weekStartStr,
          workouts_score: summary.subscores.workout,
          cardio_score: summary.subscores.cardio,
          nutrition_score: summary.subscores.nutrition,
          sleep_score: summary.subscores.sleep,
          supplements_score: summary.subscores.supplements,
          total_score: summary.total,
        },
        { onConflict: "user_id,week_start" },
      );

      let emailed = false;
      if (emailOn && u.email) {
        const { data: lastReview } = await supabase
          .from("ai_reviews")
          .select("response")
          .eq("user_id", u.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const review = (lastReview?.response as CoachReview | undefined) ?? null;
        const sent = await sendWeeklyEmail(u.email, summary, review);
        emailed = sent.ok;
      }

      results[u.id] = { score: summary.total, emailed };
    } catch (err) {
      results[u.id] = {
        error: err instanceof Error ? err.message : "failed",
      };
    }
  }

  return NextResponse.json({ weekStart: weekStartStr, users: Object.keys(results).length, results });
}

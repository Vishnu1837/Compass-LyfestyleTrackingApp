import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { computeAccountability } from "@/lib/accountability/score";

export const accountabilityRouter = router({
  // Live-computed current-week score, subscores, and habit streaks.
  summary: protectedProcedure.query(async ({ ctx }) => {
    return computeAccountability(ctx.supabase, ctx.user.id);
  }),

  // Persisted weekly scores (written by the weekly cron).
  history: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(52).default(12) }).default({ limit: 12 }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("accountability_score")
        .select("week_start, total_score")
        .eq("user_id", ctx.user.id)
        .order("week_start", { ascending: true })
        .limit(input.limit);
      return data ?? [];
    }),
});

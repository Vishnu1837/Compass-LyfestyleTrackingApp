import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

// Steps are manually logged today. When the mobile app lands (Phase 11),
// Health Connect (Android) / HealthKit (iOS) will write into this same
// daily_steps table — the UI and queries below stay unchanged.
export const stepsRouter = router({
  // Last N days of step entries, oldest first (for charts/heatmap).
  range: protectedProcedure
    .input(
      z.object({ days: z.number().min(1).max(366).default(120) }).default({
        days: 120,
      }),
    )
    .query(async ({ ctx, input }) => {
      const from = new Date();
      from.setUTCDate(from.getUTCDate() - input.days);
      const { data } = await ctx.supabase
        .from("daily_steps")
        .select("date, step_count, distance_meters, active_minutes, calories_burned")
        .eq("user_id", ctx.user.id)
        .gte("date", from.toISOString().slice(0, 10))
        .order("date", { ascending: true });
      return data ?? [];
    }),

  upsertDay: protectedProcedure
    .input(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        stepCount: z.number().int().min(0).max(200000),
        distanceMeters: z.number().min(0).optional(),
        activeMinutes: z.number().int().min(0).optional(),
        caloriesBurned: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("daily_steps").upsert(
        {
          user_id: ctx.user.id,
          date: input.date,
          step_count: input.stepCount,
          distance_meters: input.distanceMeters ?? null,
          active_minutes: input.activeMinutes ?? null,
          calories_burned: input.caloriesBurned ?? null,
        },
        { onConflict: "user_id,date" },
      );
      if (error) return { ok: false as const, message: error.message };
      return { ok: true as const };
    }),
});

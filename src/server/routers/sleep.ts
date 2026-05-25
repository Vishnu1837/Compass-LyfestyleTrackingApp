import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const sleepRouter = router({
  list: protectedProcedure
    .input(
      z.object({ days: z.number().min(1).max(365).default(30) }).default({
        days: 30,
      }),
    )
    .query(async ({ ctx, input }) => {
      const from = new Date();
      from.setUTCDate(from.getUTCDate() - input.days);
      const { data } = await ctx.supabase
        .from("sleep_logs")
        .select("id, date, bedtime, wake_time, duration_minutes, quality_rating, notes")
        .eq("user_id", ctx.user.id)
        .gte("date", from.toISOString().slice(0, 10))
        .order("date", { ascending: true });
      return data ?? [];
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        bedtime: z.string().datetime(),
        wakeTime: z.string().datetime(),
        quality: z.number().int().min(1).max(5).optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const bed = new Date(input.bedtime);
      const wake = new Date(input.wakeTime);
      const durationMinutes = Math.max(
        0,
        Math.round((wake.getTime() - bed.getTime()) / 60000),
      );
      const date = wake.toISOString().slice(0, 10); // morning you woke up

      const { error } = await ctx.supabase.from("sleep_logs").upsert(
        {
          user_id: ctx.user.id,
          date,
          bedtime: input.bedtime,
          wake_time: input.wakeTime,
          duration_minutes: durationMinutes,
          quality_rating: input.quality ?? null,
          notes: input.notes ?? null,
          source: "manual",
        },
        { onConflict: "user_id,date" },
      );
      if (error) return { ok: false as const, message: error.message };
      return { ok: true as const, durationMinutes };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from("sleep_logs")
        .delete()
        .eq("user_id", ctx.user.id)
        .eq("id", input.id);
      return { ok: true };
    }),
});

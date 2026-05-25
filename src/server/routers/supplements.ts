import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const supplementsRouter = router({
  // Active supplements with how many times each was taken today.
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data: supps } = await ctx.supabase
      .from("supplements")
      .select("id, name, dose, unit, frequency_per_day, notes, active")
      .eq("user_id", ctx.user.id)
      .eq("active", true)
      .order("created_at", { ascending: true });

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const { data: logs } = await ctx.supabase
      .from("supplement_logs")
      .select("supplement_id")
      .eq("user_id", ctx.user.id)
      .gte("taken_at", startOfDay.toISOString());

    const counts = new Map<string, number>();
    for (const l of logs ?? []) {
      counts.set(l.supplement_id, (counts.get(l.supplement_id) ?? 0) + 1);
    }

    return (supps ?? []).map((s) => ({
      ...s,
      takenToday: counts.get(s.id) ?? 0,
    }));
  }),

  add: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        dose: z.number().min(0).optional(),
        unit: z.string().max(20).optional(),
        frequencyPerDay: z.number().int().min(1).max(20).default(1),
        notes: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.supabase.from("supplements").insert({
        user_id: ctx.user.id,
        name: input.name,
        dose: input.dose ?? null,
        unit: input.unit ?? null,
        frequency_per_day: input.frequencyPerDay,
        notes: input.notes ?? null,
        active: true,
      });
      if (error) return { ok: false as const, message: error.message };
      return { ok: true as const };
    }),

  logTaken: protectedProcedure
    .input(z.object({ supplementId: z.string().uuid(), doseTaken: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase.from("supplement_logs").insert({
        user_id: ctx.user.id,
        supplement_id: input.supplementId,
        dose_taken: input.doseTaken ?? null,
      });
      return { ok: true };
    }),

  // Undo the most recent "taken" today for a supplement.
  undoLast: protectedProcedure
    .input(z.object({ supplementId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const { data: last } = await ctx.supabase
        .from("supplement_logs")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("supplement_id", input.supplementId)
        .gte("taken_at", startOfDay.toISOString())
        .order("taken_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (last?.id) {
        await ctx.supabase.from("supplement_logs").delete().eq("id", last.id);
      }
      return { ok: true };
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from("supplements")
        .update({ active: false })
        .eq("user_id", ctx.user.id)
        .eq("id", input.id);
      return { ok: true };
    }),
});

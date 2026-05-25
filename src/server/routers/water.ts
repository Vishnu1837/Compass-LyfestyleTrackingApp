import { z } from "zod";
import { protectedProcedure, router } from "../trpc";

export const waterRouter = router({
  // Today's total ml + this week's daily totals.
  summary: protectedProcedure.query(async ({ ctx }) => {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - 7);
    const { data } = await ctx.supabase
      .from("water_logs")
      .select("date, amount_ml")
      .eq("user_id", ctx.user.id)
      .gte("date", from.toISOString().slice(0, 10));

    const today = new Date().toISOString().slice(0, 10);
    const byDate = new Map<string, number>();
    let todayTotal = 0;
    for (const r of data ?? []) {
      const amt = Number(r.amount_ml) || 0;
      byDate.set(r.date, (byDate.get(r.date) ?? 0) + amt);
      if (r.date === today) todayTotal += amt;
    }
    return {
      todayMl: todayTotal,
      week: Array.from(byDate.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, ml]) => ({ date, ml })),
    };
  }),

  add: protectedProcedure
    .input(z.object({ amountMl: z.number().int().min(-2000).max(2000) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase.from("water_logs").insert({
        user_id: ctx.user.id,
        date: new Date().toISOString().slice(0, 10),
        amount_ml: input.amountMl,
      });
      return { ok: true };
    }),
});

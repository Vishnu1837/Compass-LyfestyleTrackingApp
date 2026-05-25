import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { syncStrava } from "@/lib/cardio/strava/sync";

export const cardioRouter = router({
  status: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("api_credentials")
      .select("last_sync_at, created_at")
      .eq("user_id", ctx.user.id)
      .eq("provider", "strava")
      .maybeSingle();
    return {
      connected: Boolean(data),
      lastSyncAt: data?.last_sync_at ?? null,
    };
  }),

  list: protectedProcedure
    .input(
      z
        .object({ limit: z.number().min(1).max(200).default(60) })
        .default({ limit: 60 }),
    )
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("cardio_activities")
        .select(
          "id, type, start_time, duration_seconds, distance_m, avg_pace, avg_hr, elevation_gain_m, calories, polyline",
        )
        .eq("user_id", ctx.user.id)
        .order("start_time", { ascending: false })
        .limit(input.limit);
      return data ?? [];
    }),

  detail: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("cardio_activities")
        .select("*")
        .eq("user_id", ctx.user.id)
        .eq("id", input.id)
        .single();
      return data;
    }),

  sync: protectedProcedure.mutation(async ({ ctx }) => {
    return syncStrava(ctx.supabase, ctx.user.id);
  }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.supabase
      .from("api_credentials")
      .delete()
      .eq("user_id", ctx.user.id)
      .eq("provider", "strava");
    return { ok: true };
  }),
});

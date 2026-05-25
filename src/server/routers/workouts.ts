import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { getWorkoutProvider } from "@/lib/workouts/get-provider";

export const workoutsRouter = router({
  // Canonical workout list, read straight from our DB (source-agnostic).
  list: protectedProcedure
    .input(
      z
        .object({ limit: z.number().min(1).max(100).default(30) })
        .default({ limit: 30 }),
    )
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("workouts")
        .select(
          "id, source, title, performed_at, body_weight, total_volume, duration_seconds",
        )
        .eq("user_id", ctx.user.id)
        .order("performed_at", { ascending: false })
        .limit(input.limit);
      return data ?? [];
    }),

  detail: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data: workout } = await ctx.supabase
        .from("workouts")
        .select("*")
        .eq("user_id", ctx.user.id)
        .eq("id", input.id)
        .single();
      if (!workout) return null;

      const { data: exercises } = await ctx.supabase
        .from("workout_exercises")
        .select("id, exercise_id, exercise_name, exercise_type, order_index")
        .eq("workout_id", input.id)
        .order("order_index", { ascending: true });

      const exerciseIds = (exercises ?? []).map((e) => e.id);
      const { data: sets } = exerciseIds.length
        ? await ctx.supabase
            .from("workout_sets")
            .select("*")
            .in("workout_exercise_id", exerciseIds)
            .order("set_number", { ascending: true })
        : { data: [] };

      return {
        workout,
        exercises: (exercises ?? []).map((e) => ({
          ...e,
          sets: (sets ?? []).filter((s) => s.workout_exercise_id === e.id),
        })),
      };
    }),

  recentPRs: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(50).default(10) }).default({
        limit: 10,
      }),
    )
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("personal_records")
        .select(
          "id, record_type, value, achieved_at, exercise_id, exercises(name)",
        )
        .eq("user_id", ctx.user.id)
        .order("achieved_at", { ascending: false })
        .limit(input.limit);
      return data ?? [];
    }),

  // Exercise progress chart — proxied live from the provider (Lyfta already
  // computes estimated 1RM), keyed by the provider's external exercise id.
  exerciseProgress: protectedProcedure
    .input(
      z.object({
        exerciseId: z.string().uuid(),
        days: z.number().min(7).max(1825).default(365),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { data: ex } = await ctx.supabase
        .from("exercises")
        .select("external_id, name")
        .eq("user_id", ctx.user.id)
        .eq("id", input.exerciseId)
        .single();
      if (!ex?.external_id) return { name: ex?.name ?? null, points: [] };

      const provider = await getWorkoutProvider(ctx.supabase, ctx.user.id);
      if (!provider) return { name: ex.name, points: [] };

      const points = await provider.getExerciseProgress(
        ex.external_id,
        input.days,
      );
      return {
        name: ex.name,
        points: points.map((p) => ({
          date: p.date.toISOString().slice(0, 10),
          value: p.value,
        })),
      };
    }),
});

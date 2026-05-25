import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { getFoodByBarcode, searchFoods } from "@/lib/nutrition/off";

const foodInput = z.object({
  barcode: z.string().nullable().optional(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  calories: z.number().nullable().optional(),
  proteinG: z.number().nullable().optional(),
  carbsG: z.number().nullable().optional(),
  fatG: z.number().nullable().optional(),
  fiberG: z.number().nullable().optional(),
  sugarG: z.number().nullable().optional(),
  sodiumMg: z.number().nullable().optional(),
});

const MEALS = ["breakfast", "lunch", "dinner", "snack"] as const;

export const nutritionRouter = router({
  // Live Open Food Facts search (per-100g macros). Not persisted until logged.
  search: protectedProcedure
    .input(z.object({ query: z.string().min(2) }))
    .query(async ({ input }) => {
      return searchFoods(input.query, 20);
    }),

  barcode: protectedProcedure
    .input(z.object({ barcode: z.string().min(4) }))
    .mutation(async ({ input }) => {
      return getFoodByBarcode(input.barcode.trim());
    }),

  // Log a food for a day. Macros stored per 100g on food_items; the log's
  // `servings` is the number of 100g units (grams / 100).
  log: protectedProcedure
    .input(
      z.object({
        food: foodInput,
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        meal: z.enum(MEALS),
        grams: z.number().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { food } = input;
      let foodId: string | null = null;

      // Reuse an existing food_items row by barcode where possible.
      if (food.barcode) {
        const { data: existing } = await ctx.supabase
          .from("food_items")
          .select("id")
          .eq("user_id", ctx.user.id)
          .eq("barcode", food.barcode)
          .maybeSingle();
        foodId = existing?.id ?? null;
      }

      if (!foodId) {
        const { data: inserted, error } = await ctx.supabase
          .from("food_items")
          .insert({
            user_id: ctx.user.id,
            barcode: food.barcode ?? null,
            name: food.name,
            brand: food.brand ?? null,
            serving_size: "100 g",
            calories: food.calories ?? null,
            protein_g: food.proteinG ?? null,
            carbs_g: food.carbsG ?? null,
            fat_g: food.fatG ?? null,
            fiber_g: food.fiberG ?? null,
            sugar_g: food.sugarG ?? null,
            sodium_mg: food.sodiumMg ?? null,
            source: "open_food_facts",
          })
          .select("id")
          .single();
        if (error || !inserted) {
          return { ok: false as const, message: error?.message ?? "insert failed" };
        }
        foodId = inserted.id;
      }

      const { error: logErr } = await ctx.supabase.from("nutrition_logs").insert({
        user_id: ctx.user.id,
        date: input.date,
        meal: input.meal,
        food_id: foodId,
        servings: input.grams / 100,
      });
      if (logErr) return { ok: false as const, message: logErr.message };
      return { ok: true as const };
    }),

  // A day's logged foods + computed macro totals.
  day: protectedProcedure
    .input(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("nutrition_logs")
        .select(
          "id, meal, servings, logged_at, food_items(name, brand, calories, protein_g, carbs_g, fat_g)",
        )
        .eq("user_id", ctx.user.id)
        .eq("date", input.date)
        .order("logged_at", { ascending: true });

      const rows = (data ?? []).map((r) => {
        const f = (r.food_items ?? {}) as {
          name?: string;
          brand?: string | null;
          calories?: number | null;
          protein_g?: number | null;
          carbs_g?: number | null;
          fat_g?: number | null;
        };
        const s = Number(r.servings) || 0;
        return {
          id: r.id as string,
          meal: r.meal as string,
          grams: Math.round(s * 100),
          name: f.name ?? "Food",
          brand: f.brand ?? null,
          calories: Math.round((f.calories ?? 0) * s),
          proteinG: Math.round((f.protein_g ?? 0) * s),
          carbsG: Math.round((f.carbs_g ?? 0) * s),
          fatG: Math.round((f.fat_g ?? 0) * s),
        };
      });

      const totals = rows.reduce(
        (t, r) => ({
          calories: t.calories + r.calories,
          proteinG: t.proteinG + r.proteinG,
          carbsG: t.carbsG + r.carbsG,
          fatG: t.fatG + r.fatG,
        }),
        { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
      );

      return { rows, totals };
    }),

  deleteLog: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.supabase
        .from("nutrition_logs")
        .delete()
        .eq("user_id", ctx.user.id)
        .eq("id", input.id);
      return { ok: true };
    }),
});

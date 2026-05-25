import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { getAIProvider, isAIConfigured } from "@/lib/ai";
import { buildCoachContext } from "@/lib/ai/context";
import { CHAT_SYSTEM, REVIEW_SCHEMA, REVIEW_SYSTEM } from "@/lib/ai/prompts";
import type { CoachReview } from "@/lib/ai/types";

export const coachRouter = router({
  status: protectedProcedure.query(() => ({ configured: isAIConfigured() })),

  reviewWeek: protectedProcedure.mutation(async ({ ctx }) => {
    const ai = getAIProvider();
    if (!ai) {
      return { ok: false as const, message: "AI is not configured (missing GEMINI_API_KEY)." };
    }

    const context = await buildCoachContext(ctx.supabase, ctx.user.id);
    let review: CoachReview;
    try {
      review = await ai.generateJSON<CoachReview>(
        REVIEW_SYSTEM,
        `Here is my last 14 days of data:\n${context}\n\nReview my recent training and habits.`,
        REVIEW_SCHEMA,
      );
    } catch (err) {
      return {
        ok: false as const,
        message: err instanceof Error ? err.message : "AI request failed.",
      };
    }

    const end = new Date();
    const start = new Date();
    start.setUTCDate(end.getUTCDate() - 14);
    await ctx.supabase.from("ai_reviews").insert({
      user_id: ctx.user.id,
      period_start: start.toISOString().slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
      model_used: ai.name,
      prompt: context,
      response: review,
    });

    return { ok: true as const, review };
  }),

  listReviews: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }).default({ limit: 5 }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.supabase
        .from("ai_reviews")
        .select("id, created_at, response, model_used")
        .eq("user_id", ctx.user.id)
        .order("created_at", { ascending: false })
        .limit(input.limit);
      return data ?? [];
    }),

  ask: protectedProcedure
    .input(z.object({ question: z.string().min(3).max(500) }))
    .mutation(async ({ ctx, input }) => {
      const ai = getAIProvider();
      if (!ai) {
        return { ok: false as const, message: "AI is not configured (missing GEMINI_API_KEY)." };
      }
      const context = await buildCoachContext(ctx.supabase, ctx.user.id);
      try {
        const answer = await ai.generateText(
          CHAT_SYSTEM,
          `My recent data:\n${context}\n\nQuestion: ${input.question}`,
        );
        return { ok: true as const, answer };
      } catch (err) {
        return {
          ok: false as const,
          message: err instanceof Error ? err.message : "AI request failed.",
        };
      }
    }),
});

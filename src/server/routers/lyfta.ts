import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import { testLyftaConnection } from "@/lib/workouts/lyfta/client";
import { encryptToken } from "@/lib/crypto";
import { syncLyfta } from "@/lib/workouts/lyfta/sync";

export const lyftaRouter = router({
  // Connection status for the setup screen.
  status: protectedProcedure.query(async ({ ctx }) => {
    const { data } = await ctx.supabase
      .from("api_credentials")
      .select("last_sync_at, created_at")
      .eq("user_id", ctx.user.id)
      .eq("provider", "lyfta")
      .maybeSingle();

    return {
      connected: Boolean(data),
      lastSyncAt: data?.last_sync_at ?? null,
      connectedAt: data?.created_at ?? null,
    };
  }),

  // Validate a key without saving it (the "test connection" button).
  testConnection: protectedProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ input }) => {
      return testLyftaConnection(input.apiKey.trim());
    }),

  // Validate, then store the key encrypted.
  connect: protectedProcedure
    .input(z.object({ apiKey: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const apiKey = input.apiKey.trim();
      const result = await testLyftaConnection(apiKey);
      if (!result.ok) {
        return { ok: false as const, message: result.message };
      }

      const { error } = await ctx.supabase.from("api_credentials").upsert(
        {
          user_id: ctx.user.id,
          provider: "lyfta",
          access_token: encryptToken(apiKey),
        },
        { onConflict: "user_id,provider" },
      );

      if (error) {
        return { ok: false as const, message: error.message };
      }
      return { ok: true as const, username: result.username };
    }),

  disconnect: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.supabase
      .from("api_credentials")
      .delete()
      .eq("user_id", ctx.user.id)
      .eq("provider", "lyfta");
    return { ok: true };
  }),

  // Manual "sync now" trigger from the UI.
  sync: protectedProcedure.mutation(async ({ ctx }) => {
    return syncLyfta(ctx.supabase, ctx.user.id);
  }),
});

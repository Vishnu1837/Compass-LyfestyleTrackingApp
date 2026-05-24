import { protectedProcedure, publicProcedure, router } from "../trpc";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),

  me: protectedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    email: ctx.user.email,
  })),
});

export type AppRouter = typeof appRouter;

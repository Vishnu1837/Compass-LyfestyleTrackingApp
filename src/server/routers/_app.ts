import { protectedProcedure, publicProcedure, router } from "../trpc";
import { lyftaRouter } from "./lyfta";
import { workoutsRouter } from "./workouts";
import { cardioRouter } from "./cardio";
import { stepsRouter } from "./steps";

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),

  me: protectedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    email: ctx.user.email,
  })),

  lyfta: lyftaRouter,
  workouts: workoutsRouter,
  cardio: cardioRouter,
  steps: stepsRouter,
});

export type AppRouter = typeof appRouter;

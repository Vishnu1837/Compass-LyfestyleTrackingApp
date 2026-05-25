import { protectedProcedure, publicProcedure, router } from "../trpc";
import { lyftaRouter } from "./lyfta";
import { workoutsRouter } from "./workouts";
import { cardioRouter } from "./cardio";
import { stepsRouter } from "./steps";
import { nutritionRouter } from "./nutrition";
import { sleepRouter } from "./sleep";
import { supplementsRouter } from "./supplements";
import { waterRouter } from "./water";
import { coachRouter } from "./coach";
import { accountabilityRouter } from "./accountability";

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
  nutrition: nutritionRouter,
  sleep: sleepRouter,
  supplements: supplementsRouter,
  water: waterRouter,
  coach: coachRouter,
  accountability: accountabilityRouter,
});

export type AppRouter = typeof appRouter;

import { router } from "@/server/trpc";
import { authRouter } from "@/server/routers/auth";
import { feedRouter } from "@/server/routers/feed";
import { swipeRouter } from "@/server/routers/swipe";

export const appRouter = router({
  auth: authRouter,
  feed: feedRouter,
  swipe: swipeRouter,
});

export type AppRouter = typeof appRouter;

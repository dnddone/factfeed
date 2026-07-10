import { router } from "@/server/trpc";
import { feedRouter } from "@/server/routers/feed";
import { swipeRouter } from "@/server/routers/swipe";

export const appRouter = router({
  feed: feedRouter,
  swipe: swipeRouter,
});

export type AppRouter = typeof appRouter;

import { protectedProcedure, router } from "@/server/trpc";

/**
 * Dev-only ping to confirm a bearer token resolves to a real `userId`
 * (mobile Phase 2 acceptance) — no product use yet.
 */
export const authRouter = router({
  whoami: protectedProcedure.query(({ ctx }): { userId: string } => {
    return { userId: ctx.userId };
  }),
});

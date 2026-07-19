import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { resolveUserId } from "@/auth";
import { db } from "@/clients/db";
import { supabase } from "@/clients/supabase";

export const createContext = async ({
  req,
}: FetchCreateContextFnOptions): Promise<{
  db: typeof db;
  userId: string | null;
}> => {
  const userId = await resolveUserId({
    supabase,
    db,
    authorizationHeader: req.headers.get("authorization"),
  });

  return { db, userId };
};

type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * ADR 0009: swipes require a real authenticated user; browsing (feed.list)
 * stays open to guests via publicProcedure.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { ...ctx, userId: ctx.userId } });
});

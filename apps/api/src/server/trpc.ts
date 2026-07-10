import { initTRPC } from "@trpc/server";
import { db } from "@/clients/db";
import { DEV_USER_ID } from "@/constants/auth.constants";

export const createContext = (): { db: typeof db; userId: string } => ({
  db,
  userId: DEV_USER_ID,
});

type Context = ReturnType<typeof createContext>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

import { PrismaClient } from "@prisma/client";
import { IS_PRODUCTION } from "@/constants/app.constants";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (!IS_PRODUCTION) {
  globalForPrisma.prisma = db;
}

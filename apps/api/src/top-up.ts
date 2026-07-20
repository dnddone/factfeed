import { DEFAULT_LOCALE } from "@factfeed/contract";
import type { db } from "@/clients/db";
import { generateFactBatch } from "@/generation";

export const shouldTopUp = ({
  poolSize,
  threshold,
}: {
  poolSize: number;
  threshold: number;
}): boolean => poolSize < threshold;

export type TopUpResult =
  | { ranGeneration: false; poolSize: number }
  | {
      ranGeneration: true;
      poolSize: number;
      created: number;
      duplicates: number;
    };

/**
 * Off the request path (ADR 0005) — feed.list never calls this. A cron
 * route is the only caller.
 */
export const runTopUp = async ({
  db: prisma,
  threshold,
  batchSize,
}: {
  db: typeof db;
  threshold: number;
  batchSize: number;
}): Promise<TopUpResult> => {
  const poolSize = await prisma.post.count();

  if (!shouldTopUp({ poolSize, threshold })) {
    return { ranGeneration: false, poolSize };
  }

  /**
   * Phase 2 bridge: top-up still tops up the default locale only. Phase 3
   * replaces this with a per-locale pool check + generation loop.
   */
  const { created, duplicates } = await generateFactBatch({
    db: prisma,
    size: batchSize,
    locale: DEFAULT_LOCALE,
  });

  return { ranGeneration: true, poolSize, created, duplicates };
};

import { LOCALES, type Locale } from "@factfeed/contract";
import type { db } from "@/clients/db";
import { generateFactBatch } from "@/generation";

export const shouldTopUp = ({
  poolSize,
  threshold,
}: {
  poolSize: number;
  threshold: number;
}): boolean => poolSize < threshold;

/**
 * ADR 0011: pool health is per locale — a healthy `en` pool must not mask an
 * exhausted `uk` one, so each locale is checked and topped up independently.
 */
export type LocaleTopUpResult =
  | { locale: Locale; ranGeneration: false; poolSize: number }
  | {
      locale: Locale;
      ranGeneration: true;
      poolSize: number;
      created: number;
      duplicates: number;
    };

export type TopUpResult = {
  results: LocaleTopUpResult[];
};

/**
 * Off the request path (ADR 0005) — feed.list never calls this. A cron
 * route is the only caller. Runs each locale sequentially to stay gentle on
 * generation rate limits; the locale set is small.
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
  const results: LocaleTopUpResult[] = [];

  for (const locale of LOCALES) {
    const poolSize = await prisma.post.count({ where: { locale } });

    if (!shouldTopUp({ poolSize, threshold })) {
      results.push({ locale, ranGeneration: false, poolSize });
      continue;
    }

    const { created, duplicates } = await generateFactBatch({
      db: prisma,
      size: batchSize,
      locale,
    });

    results.push({
      locale,
      ranGeneration: true,
      poolSize,
      created,
      duplicates,
    });
  }

  return { results };
};

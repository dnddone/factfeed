import type { Post } from "@prisma/client";
import type { db } from "@/clients/db";
import {
  AFFINITY_WEIGHT,
  CANDIDATE_POOL_SIZE,
} from "@/constants/ranking.constants";
import { sampleWeight, weightedSampleWithoutReplacement } from "@/ranking";

type DrawFeedPageParams = {
  db: typeof db;
  userId: string;
  limit: number;
};

/**
 * ADR 0010: candidate pool is a DB-fetch limit, not a rank cutoff — the page is drawn, not sliced.
 */
export const drawFeedPage = async ({
  db,
  userId,
  limit,
}: DrawFeedPageParams): Promise<Post[]> => {
  const [candidates, affinities] = await Promise.all([
    db.post.findMany({
      where: { swipes: { none: { userId } } },
      orderBy: { score: "desc" },
      take: CANDIDATE_POOL_SIZE,
    }),
    db.userCategoryAffinity.findMany({ where: { userId } }),
  ]);

  const affinityByCategory = new Map(
    affinities.map(({ category, affinity }) => [category, affinity]),
  );

  return weightedSampleWithoutReplacement({
    items: candidates,
    weightOf: (post) =>
      sampleWeight({
        score: post.score,
        affinity: affinityByCategory.get(post.category) ?? 0,
        affinityWeight: AFFINITY_WEIGHT,
      }),
    count: limit,
  });
};

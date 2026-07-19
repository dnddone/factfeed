import type { Post } from "@prisma/client";
import type { db } from "@/clients/db";
import {
  AFFINITY_WEIGHT,
  CANDIDATE_POOL_SIZE,
} from "@/constants/ranking.constants";
import { sampleWeight, weightedSampleWithoutReplacement } from "@/ranking";

type DrawFeedPageParams = {
  db: typeof db;
  userId: string | null;
  limit: number;
};

/**
 * ADR 0010: candidate pool is a DB-fetch limit, not a rank cutoff — the page is drawn, not sliced.
 * ADR 0009: a guest (userId null) has no swipe history to exclude and no affinity to weight by.
 */
export const drawFeedPage = async ({
  db,
  userId,
  limit,
}: DrawFeedPageParams): Promise<Post[]> => {
  const [candidates, affinities] = await Promise.all([
    db.post.findMany({
      where: userId ? { swipes: { none: { userId } } } : {},
      orderBy: { score: "desc" },
      take: CANDIDATE_POOL_SIZE,
    }),
    userId
      ? db.userCategoryAffinity.findMany({ where: { userId } })
      : Promise.resolve([]),
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

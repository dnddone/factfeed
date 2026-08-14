import { swipeRecordInput } from "@factfeed/contract";
import {
  nextAffinity,
  nextDecayedCounters,
  reverseAffinity,
  reverseDecayedCounters,
} from "@/ranking";
import { protectedProcedure, router } from "@/server/trpc";

export const swipeRouter = router({
  record: protectedProcedure
    .input(swipeRecordInput)
    .mutation(async ({ ctx, input }): Promise<{ ok: true }> => {
      await ctx.db.$transaction(async (tx) => {
        const existing = await tx.swipe.findUnique({
          where: {
            userId_postId: { userId: ctx.userId, postId: input.postId },
          },
        });

        /**
         * ADR 0012: re-recording the same direction (e.g. re-Skip on
         * back-nav) is always a no-op — it carries no counter/affinity
         * change and must not bump `Swipe.updatedAt`.
         */
        if (existing && existing.direction === input.direction) {
          return;
        }

        const now = new Date();
        const post = await tx.post.findUniqueOrThrow({
          where: { id: input.postId },
        });

        const [affinity, categoryStats] = await Promise.all([
          tx.userCategoryAffinity.findUnique({
            where: {
              userId_category: { userId: ctx.userId, category: post.category },
            },
          }),
          tx.categoryStats.findUnique({ where: { category: post.category } }),
        ]);

        const postCounters = existing
          ? reverseDecayedCounters({
              counters: post,
              scoreUpdatedAt: post.scoreUpdatedAt,
              now,
              oldDirection: existing.direction,
              oldEffectiveAt: existing.updatedAt,
              newDirection: input.direction,
            })
          : nextDecayedCounters({
              counters: post,
              scoreUpdatedAt: post.scoreUpdatedAt,
              now,
              direction: input.direction,
            });

        const nextAffinityValue = existing
          ? reverseAffinity({
              affinity: affinity?.affinity ?? 0,
              updatedAt: affinity?.updatedAt ?? now,
              now,
              oldDirection: existing.direction,
              oldEffectiveAt: existing.updatedAt,
              newDirection: input.direction,
            })
          : nextAffinity({
              affinity: affinity?.affinity ?? 0,
              updatedAt: affinity?.updatedAt ?? now,
              now,
              direction: input.direction,
            });

        const nextCategoryCounters = existing
          ? reverseDecayedCounters({
              counters: categoryStats ?? { likeCount: 0, dislikeCount: 0 },
              scoreUpdatedAt: categoryStats?.scoreUpdatedAt ?? now,
              now,
              oldDirection: existing.direction,
              oldEffectiveAt: existing.updatedAt,
              newDirection: input.direction,
            })
          : nextDecayedCounters({
              counters: categoryStats ?? { likeCount: 0, dislikeCount: 0 },
              scoreUpdatedAt: categoryStats?.scoreUpdatedAt ?? now,
              now,
              direction: input.direction,
            });

        await Promise.all([
          tx.swipe.upsert({
            where: {
              userId_postId: { userId: ctx.userId, postId: input.postId },
            },
            create: {
              userId: ctx.userId,
              postId: input.postId,
              direction: input.direction,
            },
            update: { direction: input.direction },
          }),
          tx.post.update({
            where: { id: input.postId },
            data: {
              likeCount: postCounters.likeCount,
              dislikeCount: postCounters.dislikeCount,
              score: postCounters.score,
              scoreUpdatedAt: now,
              /**
               * An edit re-judges a post the user has already seen — only
               * the first-ever verdict counts toward `seenCount`.
               */
              ...(existing ? {} : { seenCount: { increment: 1 } }),
            },
          }),
          tx.userCategoryAffinity.upsert({
            where: {
              userId_category: { userId: ctx.userId, category: post.category },
            },
            create: {
              userId: ctx.userId,
              category: post.category,
              affinity: nextAffinityValue,
              updatedAt: now,
            },
            update: { affinity: nextAffinityValue, updatedAt: now },
          }),
          tx.categoryStats.upsert({
            where: { category: post.category },
            create: {
              category: post.category,
              likeCount: nextCategoryCounters.likeCount,
              dislikeCount: nextCategoryCounters.dislikeCount,
              scoreUpdatedAt: now,
            },
            update: {
              likeCount: nextCategoryCounters.likeCount,
              dislikeCount: nextCategoryCounters.dislikeCount,
              scoreUpdatedAt: now,
            },
          }),
        ]);
      });

      return { ok: true };
    }),
});

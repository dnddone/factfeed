import { Prisma } from "@prisma/client";
import { swipeRecordInput } from "@factfeed/contract";
import { nextAffinity, nextDecayedCounters } from "@/ranking";
import { protectedProcedure, router } from "@/server/trpc";

export const swipeRouter = router({
  record: protectedProcedure
    .input(swipeRecordInput)
    .mutation(async ({ ctx, input }): Promise<{ ok: true }> => {
      await ctx.db.$transaction(async (tx) => {
        try {
          await tx.swipe.create({
            data: {
              userId: ctx.userId,
              postId: input.postId,
              direction: input.direction,
            },
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            return;
          }

          throw error;
        }

        const now = new Date();
        const post = await tx.post.findUniqueOrThrow({
          where: { id: input.postId },
        });

        const postCounters = nextDecayedCounters({
          counters: post,
          scoreUpdatedAt: post.scoreUpdatedAt,
          now,
          direction: input.direction,
        });

        const [affinity, categoryStats] = await Promise.all([
          tx.userCategoryAffinity.findUnique({
            where: {
              userId_category: { userId: ctx.userId, category: post.category },
            },
          }),
          tx.categoryStats.findUnique({ where: { category: post.category } }),
        ]);

        const nextAffinityValue = nextAffinity({
          affinity: affinity?.affinity ?? 0,
          updatedAt: affinity?.updatedAt ?? now,
          now,
          direction: input.direction,
        });

        const nextCategoryCounters = nextDecayedCounters({
          counters: categoryStats ?? { likeCount: 0, dislikeCount: 0 },
          scoreUpdatedAt: categoryStats?.scoreUpdatedAt ?? now,
          now,
          direction: input.direction,
        });

        await Promise.all([
          tx.post.update({
            where: { id: input.postId },
            data: {
              likeCount: postCounters.likeCount,
              dislikeCount: postCounters.dislikeCount,
              score: postCounters.score,
              scoreUpdatedAt: now,
              seenCount: { increment: 1 },
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

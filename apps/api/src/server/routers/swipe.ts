import { Prisma } from "@prisma/client";
import { swipeRecordInput } from "@factfeed/contract";
import { publicProcedure, router } from "@/server/trpc";

export const swipeRouter = router({
  record: publicProcedure
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

        await tx.post.update({
          where: { id: input.postId },
          data: {
            seenCount: { increment: 1 },
            ...(input.direction === "LIKE"
              ? { likeCount: { increment: 1 } }
              : {}),
            ...(input.direction === "DISLIKE"
              ? { dislikeCount: { increment: 1 } }
              : {}),
          },
        });
      });

      return { ok: true };
    }),
});

import { feedListInput, type FeedListOutput } from "@factfeed/contract";
import { drawFeedPage } from "@/feed";
import { publicProcedure, router } from "@/server/trpc";

export const feedRouter = router({
  list: publicProcedure
    .input(feedListInput)
    .query(async ({ ctx, input }): Promise<FeedListOutput> => {
      const posts = await drawFeedPage({
        db: ctx.db,
        userId: ctx.userId,
        limit: input.limit,
      });

      return {
        posts: posts.map(({ id, content, imageUrl, createdAt }) => ({
          id,
          content,
          imageUrl,
          createdAt: createdAt.toISOString(),
        })),
      };
    }),
});

import {
  feedListInput,
  type FeedListOutput,
  type Locale,
} from "@factfeed/contract";
import { drawFeedPage } from "@/feed";
import { publicProcedure, router } from "@/server/trpc";

export const feedRouter = router({
  list: publicProcedure
    .input(feedListInput)
    .query(async ({ ctx, input }): Promise<FeedListOutput> => {
      const posts = await drawFeedPage({
        db: ctx.db,
        userId: ctx.userId,
        locale: input.locale,
        limit: input.limit,
      });

      return {
        posts: posts.map(({ id, content, locale, imageUrl, createdAt }) => ({
          id,
          content,
          locale: locale as Locale,
          imageUrl,
          createdAt: createdAt.toISOString(),
        })),
      };
    }),
});

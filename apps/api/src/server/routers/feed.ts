import { feedListInput, type FeedListOutput } from "@factfeed/contract";
import { publicProcedure, router } from "@/server/trpc";

export const feedRouter = router({
  list: publicProcedure
    .input(feedListInput)
    .query(async ({ ctx, input }): Promise<FeedListOutput> => {
      const posts = await ctx.db.post.findMany({
        where: {
          swipes: { none: { userId: ctx.userId } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      const hasMore = posts.length > input.limit;
      const page = hasMore ? posts.slice(0, input.limit) : posts;
      const lastPost = page[page.length - 1];

      return {
        posts: page.map((post) => ({
          id: post.id,
          content: post.content,
          imageUrl: post.imageUrl,
          createdAt: post.createdAt.toISOString(),
        })),
        nextCursor: hasMore && lastPost ? lastPost.id : null,
      };
    }),
});

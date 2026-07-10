import { z } from "zod";
import type { Post } from "./post";

export const FEED_DEFAULT_LIMIT = 20;
export const FEED_MAX_LIMIT = 50;

export const feedListInput = z.object({
  limit: z
    .number()
    .int()
    .positive()
    .max(FEED_MAX_LIMIT)
    .default(FEED_DEFAULT_LIMIT),
});

export type FeedListInput = z.infer<typeof feedListInput>;

export type FeedListOutput = {
  posts: Post[];
};

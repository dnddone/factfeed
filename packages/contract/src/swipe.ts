import { z } from "zod";

export const SWIPE_DIRECTIONS = ["LIKE", "DISLIKE", "SKIP"] as const;

export const swipeDirectionSchema = z.enum(SWIPE_DIRECTIONS);

export type SwipeDirection = z.infer<typeof swipeDirectionSchema>;

export const swipeRecordInput = z.object({
  postId: z.string(),
  direction: swipeDirectionSchema,
});

export type SwipeInput = z.infer<typeof swipeRecordInput>;

import type { Post, SwipeDirection } from "@factfeed/contract";

/**
 * A post plus the user's local verdict for it (or `null` if unseen/unjudged
 * yet). Shared between `useSwipeHistory` and `SwipeDeck` — the deck reads
 * `verdict` to render the resting stamp state and decide whether a swipe-up
 * should record `SKIP`.
 */
export type CardHistoryEntry = {
  post: Post;
  verdict: SwipeDirection | null;
};

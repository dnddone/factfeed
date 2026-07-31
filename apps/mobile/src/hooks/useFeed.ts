import { useCallback, useEffect, useRef, useState } from "react";

import type { Post } from "@factfeed/contract";

import { trpc } from "@/clients/trpc";
import { getDeviceLocale } from "@/utils/locale";

/**
 * Fetch another batch once this many unseen cards remain, so the next card
 * is always ready before the user reaches the end of the loaded buffer.
 */
const PREFETCH_THRESHOLD = 5;

type UseFeedResult = {
  currentPost: Post | null;
  isLoading: boolean;
  isEmpty: boolean;
  next: () => void;
};

export const useFeed = (): UseFeedResult => {
  const utils = trpc.useUtils();
  const [posts, setPosts] = useState<Post[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);

  const fetchPage = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    try {
      const locale = getDeviceLocale();
      const { posts: newPosts } = await utils.feed.list.fetch({ locale });
      setPosts((previous) => [...previous, ...newPosts]);
    } catch (error) {
      console.error("useFeed: failed to fetch feed page", error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [utils]);

  useEffect(() => {
    const run = async () => {
      try {
        await fetchPage();
      } finally {
        setIsLoading(false);
      }
    };

    run();
    /**
     * Runs once on mount only — `fetchPage` is stable in practice (depends
     * only on the tRPC utils object), and re-running this on every render
     * would refetch the first page repeatedly.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && posts.length - index <= PREFETCH_THRESHOLD) {
      fetchPage();
    }
  }, [index, posts.length, isLoading, fetchPage]);

  const next = useCallback(() => {
    setIndex((previous) => Math.min(previous + 1, posts.length));
  }, [posts.length]);

  return {
    currentPost: posts[index] ?? null,
    isLoading,
    isEmpty: !isLoading && posts.length === 0,
    next,
  };
};

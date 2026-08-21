import { useCallback, useEffect, useRef, useState } from "react";

import type { SwipeDirection } from "@factfeed/contract";

import type { CardHistoryEntry } from "@/types/shared";
import { trpc } from "@/clients/trpc";
import { useLocaleContext } from "@/providers/LocaleProvider";

/**
 * Fetch another batch once this many unseen cards remain, so the next card
 * is always ready before the user reaches the end of the loaded buffer.
 */
const PREFETCH_THRESHOLD = 5;

type UseSwipeHistoryResult = {
  previous: CardHistoryEntry | null;
  current: CardHistoryEntry | null;
  next: CardHistoryEntry | null;
  isLoading: boolean;
  isEmpty: boolean;
  advance: () => void;
  retreat: () => void;
  setVerdict: (direction: SwipeDirection) => void;
};

/**
 * Local previous/current/next buffer for the three-card deck (design doc
 * "Interaction model"). Extends Phase 1's forward-only cursor with a back
 * cursor and a per-entry verdict, so "previous" is instant re-navigation
 * (no refetch) and a revisited card can show/replace its recorded verdict.
 */
export const useSwipeHistory = (): UseSwipeHistoryResult => {
  const utils = trpc.useUtils();
  const { locale } = useLocaleContext();
  const [entries, setEntries] = useState<CardHistoryEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isFetchingRef = useRef(false);
  const localeRef = useRef(locale);
  localeRef.current = locale;

  const fetchPage = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    const requestLocale = locale;
    try {
      const { posts } = await utils.feed.list.fetch({ locale: requestLocale });
      /**
       * A locale switch mid-fetch (Settings) can leave a stale response for
       * the old locale in flight — drop it so it never mixes into the
       * freshly-reset buffer for the new one.
       */
      if (requestLocale !== localeRef.current) {
        return;
      }
      setEntries((previousEntries) => [
        ...previousEntries,
        ...posts.map((post) => ({ post, verdict: null })),
      ]);
    } catch (error) {
      console.error("useSwipeHistory: failed to fetch feed page", error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [utils, locale]);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setEntries([]);
      setIndex(0);
      try {
        await fetchPage();
      } finally {
        setIsLoading(false);
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  useEffect(() => {
    if (!isLoading && entries.length - index <= PREFETCH_THRESHOLD) {
      fetchPage();
    }
  }, [index, entries.length, isLoading, fetchPage]);

  const advance = useCallback(() => {
    setIndex((previousIndex) => Math.min(previousIndex + 1, entries.length));
  }, [entries.length]);

  const retreat = useCallback(() => {
    setIndex((previousIndex) => Math.max(previousIndex - 1, 0));
  }, []);

  const setVerdict = useCallback(
    (direction: SwipeDirection) => {
      setEntries((previousEntries) =>
        previousEntries.map((entry, entryIndex) =>
          entryIndex === index ? { ...entry, verdict: direction } : entry,
        ),
      );
    },
    [index],
  );

  return {
    previous: index > 0 ? (entries[index - 1] ?? null) : null,
    current: entries[index] ?? null,
    next: entries[index + 1] ?? null,
    isLoading,
    isEmpty: !isLoading && entries.length === 0,
    advance,
    retreat,
    setVerdict,
  };
};

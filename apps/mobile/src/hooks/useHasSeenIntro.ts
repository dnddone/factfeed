import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { HAS_SEEN_INTRO_STORAGE_KEY } from "@/constants/storage.constants";

type UseHasSeenIntroResult = {
  isLoaded: boolean;
  hasSeenIntro: boolean;
  markSeen: () => void;
};

/**
 * Persists whether the first-launch intro splash has already played. Unlike
 * `useHasSeenCoach`, it exposes `isLoaded` because the root layout must hold
 * the native splash until the stored value is known — otherwise returning
 * users would see the intro flash on a cold start.
 */
export const useHasSeenIntro = (): UseHasSeenIntroResult => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasSeenIntro, setHasSeenIntro] = useState(true);

  useEffect(() => {
    const run = async () => {
      const stored = await AsyncStorage.getItem(HAS_SEEN_INTRO_STORAGE_KEY);
      setHasSeenIntro(stored === "true");
      setIsLoaded(true);
    };

    run();
  }, []);

  const markSeen = useCallback(() => {
    setHasSeenIntro(true);
    AsyncStorage.setItem(HAS_SEEN_INTRO_STORAGE_KEY, "true");
  }, []);

  return { isLoaded, hasSeenIntro, markSeen };
};

import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { HAS_SEEN_COACH_STORAGE_KEY } from "@/constants/storage.constants";

type UseHasSeenCoachResult = {
  hasSeenCoach: boolean;
  markSeen: () => void;
};

/**
 * Persists whether the first-run gesture coach has already played, so it
 * shows at most once per install (design doc "First-run gesture coach").
 * Defaults to `true` (don't show) until the stored value loads, so the coach
 * never flashes on a cold start before the check resolves.
 */
export const useHasSeenCoach = (): UseHasSeenCoachResult => {
  const [hasSeenCoach, setHasSeenCoach] = useState(true);

  useEffect(() => {
    const run = async () => {
      const stored = await AsyncStorage.getItem(HAS_SEEN_COACH_STORAGE_KEY);
      setHasSeenCoach(stored === "true");
    };

    run();
  }, []);

  const markSeen = useCallback(() => {
    setHasSeenCoach(true);
    AsyncStorage.setItem(HAS_SEEN_COACH_STORAGE_KEY, "true");
  }, []);

  return { hasSeenCoach, markSeen };
};

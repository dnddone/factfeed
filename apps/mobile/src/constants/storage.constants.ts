/**
 * AsyncStorage key for the first-run gesture coach flag — set once the coach
 * has played (or been dismissed by touch) so it never reappears.
 */
export const HAS_SEEN_COACH_STORAGE_KEY = "hasSeenCoach";

/**
 * AsyncStorage key for the user's chosen content/UI locale (Phase 6
 * Settings). Falls back to the device locale when unset.
 */
export const LOCALE_STORAGE_KEY = "locale";

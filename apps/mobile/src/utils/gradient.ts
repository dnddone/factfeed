import { FACT_GRADIENTS } from "@/constants/gradient.constants";

/**
 * Simple string hash (djb2-ish) — good enough for a deterministic index into
 * a small fixed palette, not for cryptographic or collision-sensitive use.
 */
export const hashString = (value: string): number => {
  let hash = 0;
  for (const character of value) {
    hash = (hash << 5) - hash + character.charCodeAt(0);
    hash |= 0;
  }
  return Math.abs(hash);
};

export const getFactGradient = (postId: string) =>
  FACT_GRADIENTS[hashString(postId) % FACT_GRADIENTS.length] ??
  FACT_GRADIENTS[0];

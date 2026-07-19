/**
 * Bulk short-form generation is cost-sensitive, not latency-sensitive —
 * Haiku is the cheap/fast tier, sufficient for one-sentence facts. Floating
 * alias (no date) — auto-tracks the latest Haiku snapshot; zod validation at
 * the generation boundary catches malformed output if a new snapshot drifts.
 */
export const GENERATION_MODEL = "claude-haiku-4-5";

export const GENERATION_MAX_TOKENS = 4096;

/**
 * Hard ceiling on facts requested per call, regardless of the caller's
 * requested size — bounds Anthropic spend per invocation.
 */
export const GENERATION_BATCH_SIZE_CAP = 30;

/**
 * ADR 0010 exploration floor: decayed like+dislike count below which a
 * category counts as low-sample and competes for the reserved floor share
 * instead of pure score weighting.
 */
export const LOW_SAMPLE_THRESHOLD = 5;

/**
 * Fraction of a batch reserved for low-sample categories, split evenly among
 * them, before the remainder is allocated by score weight across all
 * categories.
 */
export const EXPLORATION_FLOOR_SHARE = 0.3;

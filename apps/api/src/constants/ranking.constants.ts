/**
 * ADR 0010: conservative starting values, tighten once there's real swipe volume.
 */
export const HALF_LIFE_HOURS = 168;

/**
 * Virtual votes a new post's category prior contributes before any real swipe lands.
 */
export const PRIOR_WEIGHT = 3;

/**
 * Weight of a user's per-category affinity on top of a post's shared score.
 */
export const AFFINITY_WEIGHT = 0.15;

/**
 * DB-fetch size for the unseen-post candidate pool; a fetch limit, not a rank cutoff.
 */
export const CANDIDATE_POOL_SIZE = 200;

/**
 * Floor applied to sampling weights so a post never has literally zero draw odds.
 */
export const MIN_SAMPLE_WEIGHT = 0.01;

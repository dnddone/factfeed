/**
 * Fallbacks when POOL_MIN_THRESHOLD / TOP_UP_BATCH_SIZE aren't set in env.
 * "Pool" is the per-locale Post count (ADR 0011) — the threshold applies to
 * each locale independently, a simple proxy for "how deep is this language's
 * supply of facts," since the cron run has no specific user to check unseen
 * counts against.
 */
export const DEFAULT_POOL_MIN_THRESHOLD = 100;

export const DEFAULT_TOP_UP_BATCH_SIZE = 20;

import { createHash } from "node:crypto";

/**
 * Matches the Postgres md5() backfill in the contentHash migration —
 * keep both in sync if this ever changes.
 */
export const contentHash = (content: string): string =>
  createHash("md5").update(content.trim()).digest("hex");

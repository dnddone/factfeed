/**
 * Backend-only ranking/generation signal (ADR 0010) — never shown to the user.
 * A post has exactly one category; see docs/inbox for the deferred
 * multi-category discussion.
 */
export const CATEGORIES = [
  "animals",
  "food",
  "science",
  "history",
  "space",
  "human-body",
  "geography",
  "language",
  "technology",
  "psychology",
  "mythology",
  "movies-tv",
  "music",
  "literature",
  "sports",
  "inventions",
  "plants",
  "ocean",
  "dinosaurs",
  "insects",
  "weather",
  "money-economics",
  "law-crime",
  "transportation",
] as const;

export type Category = (typeof CATEGORIES)[number];

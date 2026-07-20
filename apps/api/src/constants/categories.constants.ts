/**
 * Backend-only ranking/generation signal (ADR 0010) — never shown to the user.
 * A post has exactly one category; see docs/inbox for the deferred
 * multi-category discussion.
 *
 * The category is an instruction to the generator (produce N facts for this
 * category), not a post-hoc classifier over arbitrary text, so a broad bucket
 * like "science" simply means "general science not covered by a more specific
 * category". Stored as a plain string in the DB — adding or removing a value
 * needs no migration.
 *
 * Grouped by domain purely for human scanning; order is not semantically
 * meaningful.
 */
export const CATEGORIES = [
  /**
   * Life & nature
   */
  "animals",
  "birds",
  "insects",
  "ocean",
  "plants",
  "fungi",
  "dinosaurs",
  "evolution",
  "genetics",
  "microbes",
  "ecology",
  "agriculture",

  /**
   * Human body & mind
   */
  "human-body",
  "medicine",
  "neuroscience",
  "psychology",
  "sleep-dreams",

  /**
   * Physical & earth sciences
   */
  "science",
  "physics",
  "chemistry",
  "mathematics",
  "space",
  "geology",
  "volcanoes",
  "weather",
  "climate",
  "natural-disasters",

  /**
   * Technology & innovation
   */
  "technology",
  "inventions",
  "internet-web",
  "artificial-intelligence",
  "video-games",
  "transportation",
  "aviation",

  /**
   * History & civilization
   */
  "history",
  "ancient-civilizations",
  "mythology",
  "wars-military",
  "exploration",
  "royalty",
  "law-crime",

  /**
   * Society, geography & economy
   */
  "geography",
  "cultures-traditions",
  "festivals-holidays",
  "religion",
  "philosophy",
  "politics-government",
  "money-economics",
  "business-brands",
  "education",
  "language",

  /**
   * Arts & entertainment
   */
  "art",
  "architecture",
  "literature",
  "music",
  "movies-tv",
  "theater",
  "dance",
  "photography",
  "comics-animation",
  "fashion",

  /**
   * Food & miscellaneous
   */
  "food",
  "drinks-beverages",
  "sports",
  "world-records",
  "mysteries-unexplained",
] as const;

export type Category = (typeof CATEGORIES)[number];

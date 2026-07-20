export const LOCALES = ["en", "uk"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export type Post = {
  id: string;
  content: string;
  locale: Locale;
  imageUrl: string | null;
  createdAt: string;
};

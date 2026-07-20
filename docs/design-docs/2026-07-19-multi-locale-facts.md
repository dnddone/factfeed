# Multi-locale Facts

**Date:** 2026-07-19
**Status:** Approved

## Problem

Facts should support multiple languages, starting with English and Ukrainian.
Today `Post` has no locale, generation only produces English text, and there's
no client signal for which language a user wants. Triaged from
`docs/inbox/2026-07-10-multi-locale-facts.md`.

## Design overview

- **Data model**: each locale is a fully independent `Post` row (ADR 0011) —
  own score, own swipe history, own content-hash dedupe scope. No
  translation-variant table, no shared engagement between a fact's English and
  Ukrainian versions.
- **Generation**: runs natively per locale — Claude is prompted directly in
  the target language, not translated after the fact.
- **Category taxonomy**: stays locale-agnostic. `category`,
  `UserCategoryAffinity`, and `CategoryStats` are unchanged and shared across
  locales — they're a backend-only ranking signal, never shown to the user.
- **Client locale**: derived from the same signal as UI locale
  (`react-i18next`), passed to `feed.list`. No separate content-locale
  preference in v1.
- **Contract**: `feed.list.locale` is optional; missing or unrecognized values
  fall back to `"en"` server-side rather than erroring.

## Data model changes

```
Post
  ...
  locale   String   @default("en")   -- "en" | "uk"
```

- `contentHash` uniqueness moves from a bare unique to `@@unique([locale, contentHash])`
  — dedupe is scoped per locale, matching the inbox note's "dedupe within a
  locale" resolution. (In practice hashes won't collide across languages
  anyway, but the constraint should say what's actually intended.)
- `Swipe`, `UserCategoryAffinity`, `CategoryStats` — unchanged. A user's
  category affinity and the global category stats carry across languages.

## Contract changes (`packages/contract`)

```ts
// post.ts
export const LOCALES = ["en", "uk"] as const;
export const DEFAULT_LOCALE: Locale = "en";
export type Locale = (typeof LOCALES)[number];

export type Post = {
  ...
  locale: Locale;
};

// feed.ts
export const feedListInput = z.object({
  limit: ...,
  locale: z.enum(LOCALES).default(DEFAULT_LOCALE).catch(DEFAULT_LOCALE),
});
```

`.default()` covers a missing field, `.catch()` covers a present-but-invalid
one (e.g. `"fr"`) — both resolve to `"en"` instead of a validation error.

## Generation changes (`apps/api/src/generation.ts`)

- `generateFactBatch` takes a `locale` param; the Claude prompt gets a
  language directive so facts are written natively in that language.
- Dedupe (`dedupeAgainstExisting`) and the existing-hash lookup scope to the
  same locale.
- Cold-start prior still reads `CategoryStats` (shared/global, unchanged).

## Top-up changes (`apps/api/src/top-up.ts`)

Pool health is tracked **per locale**, not globally — otherwise a healthy
English pool would mask an exhausted Ukrainian one. `runTopUp` loops over
`LOCALES`, checks `poolSize` per locale, and generates a batch for any locale
under threshold.

## Feed query changes (`apps/api/src/feed.ts`)

`drawFeedPage` gains a `locale` param and filters the candidate pool by it
before the existing unseen/weighted-sampling logic.

## Migration strategy

- New `locale` column, `NOT NULL DEFAULT 'en'` — all existing posts are
  English-only content, so backfilling `"en"` is correct, not a guess.
- Drop the bare unique on `contentHash`, add `UNIQUE(locale, contentHash)` —
  safe given every existing row is currently `"en"` (no duplicate `(locale,
hash)` pairs are created by the migration).

## Edge cases

- Missing/unsupported `locale` on `feed.list` → defaults to `"en"`, not an
  error.
- One locale's pool exhausted while another is healthy → per-locale top-up
  threshold check prevents this from being masked.
- A user switches locale mid-use → no shared "seen" state between locales
  (separate `Post` rows per design), so they may see a Ukrainian rendering of
  a fact they already swiped on in English. Accepted trade-off of Option B.

## File impact

```
packages/contract/src/post.ts        Locale type, LOCALES, DEFAULT_LOCALE, Post.locale
packages/contract/src/feed.ts        feedListInput.locale
apps/api/prisma/schema.prisma        Post.locale + locale-scoped contentHash unique
apps/api/prisma/migrations/          new migration
apps/api/src/feed.ts                 drawFeedPage locale filter
apps/api/src/generation.ts           generateFactBatch locale param + per-locale prompt/dedupe
apps/api/src/top-up.ts               runTopUp iterates locales
apps/api/prisma/seed.ts              seed per locale
apps/api/src/server/routers/feed.ts  pass input.locale through
apps/api/app/debug/page.tsx          locale column, for visibility while testing
```

## Resolved decisions

- **0011** — multi-locale facts as separate `Post` rows per locale, category
  taxonomy stays shared.

## Still open (defer)

- Explicit content-locale override independent of device/UI locale (a user
  with Ukrainian UI who also wants English facts) — deferred until requested.
- Additional locales beyond en/uk — same mechanism scales without a design
  change.

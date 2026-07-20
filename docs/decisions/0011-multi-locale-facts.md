# 0011. Multi-locale facts as separate Post rows

**Status:** Accepted
**Date:** 2026-07-19

## Context

The facts feed needs to support multiple languages, starting with English and
Ukrainian. Two ways to model it: translated variants layered on one `Post`
(e.g. a `Translation` table or per-language columns), or each locale as a
fully independent `Post` row. The choice affects dedupe scope, ranking
aggregation, and whether a swipe on one language's rendering of a fact should
count toward the other's.

## Decision

Each locale gets its own independent `Post` row — its own id, content, score,
swipe history, and content-hash dedupe scope. There is no translation-variant
table and no shared engagement signal between a fact's English and Ukrainian
versions. `category`, `UserCategoryAffinity`, and `CategoryStats` stay
locale-agnostic (shared across locales), since they're a backend-only
taxonomy/signal, never shown to the user.

## Consequences

- Fits the existing data model with minimal rework — `Post.contentHash` and
  the decayed `likeCount`/`dislikeCount` counters already assume "one row is
  one piece of content with its own engagement."
- Generation must produce facts natively per locale rather than translating
  once and storing variants — acceptable since generation is cheap and
  already batch-driven (Phase 5).
- No cross-locale learning: a fact's popularity in English doesn't inform
  Ukrainian ranking or vice versa. Each locale's pool cold-starts and grows
  independently.
- Pool health (top-up threshold) must be tracked per locale, not globally —
  a locale can run dry while another stays healthy.
- A user who switches locale has no shared "seen" state — they may encounter
  a Ukrainian rendering of a fact they already swiped on in English. Accepted
  trade-off.

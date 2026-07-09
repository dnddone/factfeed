# 0010. Trend-weighted score, per-user affinity, category-informed generation

**Status:** Proposed
**Date:** 2026-07-08

**Supersedes:** the ranking half of [0005](0005-ranking-and-cron-topup.md) (the
Vercel Cron top-up decision in that ADR is unaffected and still stands).

## Context

0005's `score = (likeCount + 1) / (likeCount + dislikeCount + 2)` has two
problems once the pool has any history:

1. **No trend.** The ratio is over all-time cumulative counts, so a post that
   got 50 likes in its first week and nothing since ranks identically to one
   getting 50 likes *this* week. A currently-resonating post can't out-rank a
   stale one with a bigger lifetime total.
2. **No personalization.** A dislike is treated as evidence the post is
   low-quality for everyone. Often it isn't — it's evidence this *user* isn't
   into this *category* (e.g. a history buff swiping left on a chemistry
   fact). Folding that into one global counter conflates "bad fact" with "not
   my taste," and every user sees the same order (flagged as an open question
   in the [backend architecture doc](../design-docs/2026-07-03-backend-architecture.md#still-open-defer)).
3. **Generation is category-blind.** `category` is stored on `Post` and never
   shown in the UI (product spec keeps category browsing/filters out of
   scope) — it exists purely as a backend signal. But nothing reads it back:
   the generation/top-up job (0005, 0006) produces a category mix with no
   feedback loop, so a category that consistently under-performs gets
   generated at the same rate as one that's thriving.

## Decision

**Decayed counters, not lifetime counters.** Replace raw cumulative
`likeCount`/`dislikeCount` with exponentially time-decayed counters, updated
incrementally on each swipe (no batch job, no stored time-series):

```
elapsedHours = hoursSince(post.scoreUpdatedAt)
decay        = 0.5 ^ (elapsedHours / HALF_LIFE_HOURS)   // e.g. HALF_LIFE_HOURS = 168 (7d)

likeCount    = likeCount    * decay + (direction === LIKE    ? 1 : 0)
dislikeCount = dislikeCount * decay + (direction === DISLIKE ? 1 : 0)
scoreUpdatedAt = now

score = (likeCount + 1) / (likeCount + dislikeCount + 2)   // same Laplace smoothing as 0005
```

Old engagement fades toward zero weight instead of sitting in the total
forever, so a recent burst moves `score` more than an equally-sized burst from
months ago — this is the "trend" signal. Laplace smoothing is kept as-is
(small samples still shouldn't read as 100%).

**Per-user category affinity, layered on top.** Add a lightweight
per-user-per-category counter, decayed the same way:

```
UserCategoryAffinity
  userId, category, affinity (float), updatedAt
  UNIQUE(userId, category)

affinityDelta = LIKE ? +1 : DISLIKE ? -1 : 0   // SKIP is neutral
affinity = affinity * decay + affinityDelta
```

**Selection is probabilistic, not a deterministic sort.** `score` is a
probability (Laplace-smoothed rate), so use it as one: each unseen post's
`score + w * affinity[post.category]` becomes its **weight** in a weighted
random draw (weighted sampling without replacement — a.k.a. roulette-wheel
selection) that fills the feed page, instead of sorting desc and taking the
top N. A post at 0.51 is only *slightly* more likely to be drawn than one at
0.5 — proportional to the score gap, not a hard rank cutoff. This also
replaces the separate fresh/random exposure slice from 0005: exposure for
new/low-score posts falls out of the weighting itself (a 0.5-score post still
has real, nonzero odds of appearing), no separate carve-out needed. Posts in
a category the user has never swiped default to `affinity = 0` (no nudge).

**Category stats, feeding both scoring and generation.** Add a third counter,
aggregated per category across all users/posts, decayed the same way:

```
CategoryStats
  category, likeCount, dislikeCount, scoreUpdatedAt

categoryScore = (likeCount + 1) / (likeCount + dislikeCount + 2)
```

Two consumers:

- **Cold-start prior.** A brand-new post currently starts at a flat
  `score = 0.5`. Instead, seed it from its category: blend a small prior
  toward `categoryScore` (e.g. treat it as a handful of "virtual" votes —
  `likeCount = categoryScore * PRIOR_WEIGHT`, `dislikeCount = (1 - categoryScore) * PRIOR_WEIGHT`
  before the first real swipe lands). A new fact in a historically strong
  category starts warmer than one in a weak category; real swipes still
  dominate quickly since `PRIOR_WEIGHT` is small.
- **Generation targeting.** The top-up job (0005/0006) picks how many facts
  to generate per category weighted by `categoryScore`, instead of an even
  spread — so the pool grows more of what's working. This needs an
  **exploration floor**: reserve a minimum share of every batch for
  low-sample or never-tried categories, otherwise a category that's merely
  new (not actually bad) never accumulates enough votes to prove itself and
  gets starved out. Same shape as the fresh/random exposure slice already in
  the feed query — apply it to generation, not just serving.

## Consequences

- **Data model**: `Post` gains `scoreUpdatedAt`. New `UserCategoryAffinity`
  table (one row per user per category they've swiped, not per post — stays
  small) and new `CategoryStats` table (one row per category — tiny, bounded
  by the number of categories, not users or posts). All three counters use
  the same decay helper, no time-series storage.
- **Compute**: still O(1) per swipe for scoring — decay is a closed-form
  multiply, not a windowed query. Generation targeting adds one aggregate
  read (`CategoryStats`) per top-up run, not per swipe.
- **Categories stay backend-only.** Nothing here proposes surfacing category
  to users (no filters/browsing) — it remains an internal signal, per the
  product spec.
- **Global score still absorbs real quality signal.** A fact that's
  genuinely wrong or boring collects dislikes from users across categories,
  which still drags `score` down and its draw weight with it. Personalization
  (`w * affinity`) only adjusts *that user's* odds on top of the shared
  weight — it doesn't let a single user's taste zero out a post for everyone,
  and it doesn't let affinity alone make a bad post likely to be drawn. If
  that split doesn't hold up in practice, it's easier to shrink `w` than to
  redesign the split itself.
- **New tunables**: `HALF_LIFE_HOURS` and `w` need real numbers, best picked
  from data once there's swipe volume — start conservative (long half-life,
  small `w`) and tighten based on observed engagement, not guessed upfront.
- **Wilson lower-bound** (flagged as a future upgrade in 0005) is still a
  valid follow-on if small-sample variance turns out to matter even with
  decay — orthogonal to this change, not replaced by it.
- **Weighted-random is confidence-blind** — a post with 1 like (score 0.67)
  and one with 100 likes/50 dislikes (score 0.66) get almost the same draw
  weight, even though the second is far more certain to actually be that
  good. **Thompson Sampling** (draw from `Beta(likeCount+1, dislikeCount+1)`
  instead of using its mean as a static weight) fixes this properly —
  flagged as a future upgrade, not built now, since vote counts are low
  across the board pre-launch and the gap won't bite yet.
- **"Trend" here means recency-weighted level, not velocity/momentum.** Decay
  answers "how is this post doing *right now*," which is what feeds the
  sampling weight. It does not detect whether engagement is *accelerating*
  (a post climbing from 0.3 to 0.55 vs one sitting flat at 0.55 look
  identical to this scheme). True momentum detection (e.g. comparing a fast
  vs a slow decay half-life, same idea as MACD) is a distinct, separate
  signal — flagged as a future upgrade, not built now.
- **Cold-start**: brand-new posts and brand-new users both start neutral
  (`score` = 0.5, `affinity` = 0), which under weighted-random sampling means
  they still have real (if unremarkable) odds of being drawn — the dedicated
  fresh/random exposure slice from 0005 is no longer needed, weighted
  sampling covers it.

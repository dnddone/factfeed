# Backend Architecture — Facts Feed

**Date:** 2026-07-03
**Status:** Approved

## Problem

Users swipe through a feed of generated facts (right = like, left = dislike,
down = next). The backend must:

1. Serve each user a feed of facts they haven't seen yet.
2. Record swipe verdicts and aggregate them into a per-post engagement score.
3. Rank the feed so higher-scoring facts surface for future users.
4. Pre-generate a pool of facts and, when a user is about to exhaust their
   unseen set, generate and persist more — without stalling the swipe.

## Design overview

- **Transport**: tRPC router in `apps/api`, consumed by the client with
  end-to-end types — no hand-written client (ADR 0004). Shared domain types +
  zod schemas live in `packages/contract`.
- **Storage**: Supabase Postgres via Prisma (ADR 0003). Supabase also provides
  Storage (images) and Auth (users, Phase 6).
- **Generation**: Claude generates fact text; images are typographic cards
  rendered with `@vercel/og` (ADR 0006). Top-up runs on a schedule via Vercel
  Cron, off the request path (ADR 0005-jobs).

See the ADRs in `docs/decisions/` for the rationale behind each choice; ADR 0001
covers the monorepo + Next.js structure.

## Data model

```
Post
  id, content, category, createdAt
  imageUrl        -- populated once at generation time
  imageSource     -- 'typographic' | 'stock' | 'ai'
  likeCount       -- decayed counter (ADR 0010), not lifetime total
  dislikeCount    -- decayed counter (ADR 0010)
  scoreUpdatedAt  -- last decay/update timestamp (ADR 0010)
  seenCount
  score           -- cached ranking value

User
  id, ...

Swipe             -- source of truth for interactions AND "seen" tracking
  id, userId, postId
  direction       -- LIKE | DISLIKE | SKIP  (right / left / down)
  createdAt
  UNIQUE(userId, postId)   -- one verdict per user per post

UserCategoryAffinity  -- per-user taste signal, layered on top of global score (ADR 0010)
  userId, category, affinity, updatedAt
  UNIQUE(userId, category)

CategoryStats  -- global per-category performance, feeds cold-start + generation (ADR 0010)
  category, likeCount, dislikeCount, scoreUpdatedAt
```

`category` is never shown to the user (no browsing/filters, per the mobile
product spec) — it's a backend-only signal.

`Swipe` does double duty: it records the vote and marks the post as seen, so the
feed query can exclude everything a user has already swiped.

## Ranking ("post rate")

Raw `likes / total` over-rewards tiny samples, and a lifetime cumulative count
can't reflect a post trending now vs one that was popular months ago. Per ADR
0010, `likeCount`/`dislikeCount` are exponentially time-decayed counters
(recomputed incrementally on each swipe, no batch job), then smoothed the same
way as before:

```
score = (likeCount + 1) / (likeCount + dislikeCount + 2)
```

On top of the global `score`, each user has a small per-category affinity
(`UserCategoryAffinity`, ADR 0010) that nudges the ordering of _their_ feed —
a dislike mostly signals "not my taste," not "bad post for everyone."

Feed query: posts the user has **not** swiped; `score` is a probability, so
it's used as a **weight for weighted random sampling** (roulette-wheel
selection), not a sort key — `score + w * affinity[category]` per post
becomes its odds of being drawn into the page. A 0.51-score post is only
slightly more likely to be picked than a 0.50 one; there's no hard rank
cutoff, and low-score/new posts still get a real (if smaller) chance, which
is what covers "fresh content exposure" — no separate random slice needed.

**Cold start**: a brand-new post doesn't start at a flat 0.5 — it's seeded
with a small prior toward its category's `CategoryStats` score (a handful of
"virtual" votes, per ADR 0010), so a fact in a historically strong category
starts warmer. Real swipes dominate quickly since the prior weight is small.

## Generation strategy

Two triggers:

1. **Seed pool** — generate an initial batch up front and persist it.
2. **Scheduled top-up** — a Vercel Cron job runs every N minutes, checks the
   size of the global unseen pool, and generates a batch when it falls below a
   threshold. Because top-up is scheduled (not fired per-user on exhaustion),
   the feed endpoint always returns immediately — it never triggers or waits on
   generation. Set the cron interval + threshold so the pool stays ahead of
   consumption (ADR 0005-jobs covers the trade-off vs event-driven runners).

**Category mix**: each batch's category split is weighted by `CategoryStats`
score (ADR 0010) — generate more of what's performing, not an even spread —
with an exploration floor reserving a minimum share for low-sample/new
categories so they aren't starved before they can prove out.

Dedupe generated facts (content hash) before persisting to avoid repeats.

## Images

Cost is **per-post, not per-view** — generate once at fact-creation time, store
the URL, and every future swipe just reads it. Total image cost ≈
(number of posts) × (price per image), a one-time trickle as the pool grows.

Strategy, cheapest first (pick per category; store `imageSource`):

1. **Typographic cards** — fact rendered on a gradient via SVG / `@vercel/og`.
   Essentially free. Recommended default to ship the loop.
2. **Stock** — Unsplash / Pexels API, free, keyword-matched.
3. **AI** — FLUX schnell (~$0.003/image) for unique illustrations on a subset.

Store assets in R2 / Vercel Blob / Supabase Storage, served via CDN.

## API surface

tRPC procedures (typed end-to-end; inputs validated with zod from
`packages/contract`):

```
feed.list      { cursor?, limit? }        -> next batch of ranked, unseen posts
swipe.record   { postId, direction }      -> records vote, bumps counters
```

Plus a plain Next.js route handler for the cron trigger (not part of the tRPC
router, secured by a cron secret):

```
POST /api/cron/top-up   -> checks pool, generates a batch if below threshold
```

## Edge cases

- **Pool exhausted mid-session** — serve what remains, trigger top-up, allow the
  client to poll/retry `/feed`.
- **Concurrent swipes on the same post** — rely on `UNIQUE(userId, postId)` +
  atomic counter increments; ignore/upsert duplicate verdicts.
- **Duplicate generated facts** — dedupe before persisting.
- **Zero-vote posts** — smoothing + the category prior keep `score`
  well-defined without ever dividing by zero.
- **Brand-new category** — no `CategoryStats` row yet, prior falls back to
  0.5 (same as today) until it accumulates its own votes.

## Phasing

The execution plan decomposes this into independently mergeable phases:
`docs/exec-plans/active/2026-07-03-backend-mvp.md`. Summary:

1. `packages/contract` — shared types + zod schemas.
2. `apps/api` skeleton + Supabase/Prisma + schema + migration + static seed.
3. tRPC `feed.list` + `swipe.record` over the static pool.
4. Laplace ranking score + unseen filtering.
5. Claude fact generation + typographic images.
6. Scheduled top-up via Vercel Cron.
7. (Later) Supabase Auth + real users.

## File impact (once implementation starts)

```
packages/contract/   Post, Swipe, feed/swipe payload types + zod schemas
apps/api/
  src/server/trpc.ts          tRPC init + context
  src/server/routers/         feed, swipe routers
  app/api/trpc/[trpc]/route.ts  tRPC HTTP handler
  app/api/cron/top-up/route.ts  cron trigger (secured)
  src/clients/db.ts            Prisma client
  src/ranking.ts               score computation
  src/generation.ts            Claude prompt + dedupe + persist
  src/image.ts                 @vercel/og typographic card
  src/feed.ts                  unseen + ranked query
  prisma/schema.prisma        schema + migrations
```

## Resolved decisions

Recorded as ADRs in `docs/decisions/`:

- **0002** — Codename now, brand later.
- **0003** — Supabase Postgres + Prisma.
- **0004** — tRPC transport (end-to-end types).
- **0005** — Vercel Cron top-up (ranking half superseded by 0010).
- **0006** — Claude fact generation + typographic images.
- **0010** — Trend-weighted (decayed) score, per-user category affinity, and
  category-informed generation targeting.

## Still open (defer)

- Fact grounding: pure LLM vs sourced/verified facts (affects dedupe + accuracy).
- Scaling: revisit a dedicated worker + queue (BullMQ/Redis) if Cron + Claude
  can't keep the pool ahead of consumption.

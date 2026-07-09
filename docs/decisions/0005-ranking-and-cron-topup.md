# 0005. Laplace-smoothed ranking + Vercel Cron top-up

**Status:** Ranking superseded by [0010](0010-trend-weighted-personalized-ranking.md); Cron top-up still Accepted
**Date:** 2026-07-03

## Context

Two related runtime decisions: how to rank posts for the feed, and how to keep
the pool of unseen posts topped up so users never run out.

**Ranking**: a raw like-ratio (`likes / total`) over-rewards posts with tiny
sample sizes — a single like reads as a perfect 100%. We want a score that is
stable for low-vote posts and converges to the true rate as votes accumulate.

**Top-up**: generation (LLM + image) takes seconds and must never block a swipe.
Options for triggering it were an event-driven runner (Inngest / Trigger.dev)
firing on per-user exhaustion, vs a scheduled Vercel Cron job polling the global
pool.

## Decision

**Ranking** — Laplace-smoothed rate:

```
score = (likeCount + 1) / (likeCount + dislikeCount + 2)
```

Feed = posts the user hasn't swiped, ordered by `score` desc, limited to N, with
a slice of fresh/random posts mixed in for exposure. Recompute on each swipe (or
a periodic job). Wilson lower-bound is a documented future upgrade if we want to
penalize low-vote uncertainty more aggressively.

**Top-up** — a **Vercel Cron** job hits a secured `/api/cron/top-up` route on an
interval; it checks the global unseen-pool size and generates a batch when below
a threshold.

## Consequences

- **Ranking**: score is always well-defined (a zero-vote post scores 0.5, not a
  divide-by-zero), and new posts aren't unfairly crushed. Cheap to compute and
  store on the `Post` row.
- **Top-up trade-off**: Cron is scheduled, not event-driven — it tops up the
  _global_ pool periodically rather than reacting to an individual user hitting
  the end. Chosen because it needs **zero extra infrastructure or dependency**
  (native to the Vercel deploy) and is simplest to ship. The cost: we must size
  the interval + threshold to stay ahead of consumption, and a sudden spike
  could briefly outrun the pool. Acceptable at early scale.
- **Revisit** with Inngest/Trigger.dev (event-driven, retries, backfill) if the
  scheduled model can't keep the pool ahead, or when generation needs
  fan-out/retry guarantees. Called out as the scaling escape hatch in ADR 0001.

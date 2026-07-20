# 0012. Editable swipes via reversible decayed-ranking updates

**Status:** Accepted
**Date:** 2026-07-20

## Context

The mobile design (`docs/design-docs/2026-07-07-mobile-swipe-feed.md`) adds
**back-nav**: swipe down to revisit the previous fact. On a revisited card the
user can **change their verdict** (Like ↔ Dislike), and re-doing a **Skip**
must be a no-op (no double effect).

`swipe.record` (`apps/api/src/server/routers/swipe.ts`) is currently
first-write-wins: `Swipe` has `@@unique([userId, postId])`, and a second
`record` call for the same pair hits `P2002`, is caught, and the handler
returns early — no ranking update runs. Editing a verdict needs that duplicate
call to actually revise `Post.{likeCount,dislikeCount,score}`,
`UserCategoryAffinity.affinity`, and `CategoryStats.{likeCount,dislikeCount}` —
all three of which use the **decayed-counter** update from ADR 0010:

```
decay    = 0.5 ^ (hoursSince(scoreUpdatedAt) / HALF_LIFE_HOURS)
value    = value * decay + delta(direction)   // delta: LIKE=+1, DISLIKE=-1 (or 0/1 per counter), SKIP=0
```

This looked lossy at first glance — once a like is folded into a decayed
running total, isolating "just that one swipe's contribution" seems impossible
without a time-series. It isn't: **exponential decay composes multiplicatively**,
so a value built from a sequence of dated events unrolls to a plain sum,
independent of update order:

```
value(t) = Σ delta_i · decay(t_i, t)     for every event i with weight delta_i at time t_i
```

That means a single past event's current contribution can be computed and
subtracted exactly, given only that event's original timestamp — no
time-series storage needed, same O(1)-per-swipe cost as today.

## Decision

**Add `updatedAt` to `Swipe`** (`@updatedAt`, Prisma-managed) — the time the
row's *current* `direction` started contributing. `createdAt` is left
untouched as the original swipe time (audit/analytics).

**`swipe.record` becomes edit-aware.** On a call for a `(userId, postId)` that
already has a row:

- **Same direction as stored** → no-op. Covers re-Skip after navigating back
  (Skip → Skip is always a no-op, and since Skip carries zero weight in every
  counter, a no-op here loses no signal either way) and a redundant re-Like/
  re-Dislike.
- **Different direction** (an edit: Like → Dislike, or vice versa) → **reverse
  the old contribution, then apply the new one**, using the formula below.
  `seenCount` is **not** incremented again — the post was already seen.

**Reversal formula**, applied identically to `Post` and `CategoryStats`
(counters) and to `UserCategoryAffinity` (affinity), all inside the existing
transaction:

```
now            = current time
oldEffectiveAt = existing Swipe.updatedAt   // when the stored direction started
decay          = decayFactor(hoursBetween(counters.scoreUpdatedAt, now))   // forward-decay to now, as today
reverseDecay   = decayFactor(hoursBetween(oldEffectiveAt, now))            // exact decay of the old contribution

likeCount      = likeCount    * decay - likeDelta(oldDirection)    * reverseDecay + likeDelta(newDirection)
dislikeCount   = dislikeCount * decay - dislikeDelta(oldDirection) * reverseDecay + dislikeDelta(newDirection)
score          = laplaceScore(likeCount, dislikeCount)
scoreUpdatedAt = now

affinity       = affinity * decay - affinityDelta(oldDirection) * reverseDecay + affinityDelta(newDirection)
```

where `likeDelta`/`dislikeDelta`/`affinityDelta` are the same per-direction
weights `nextDecayedCounters`/`nextAffinity` already use today (LIKE → like +1;
DISLIKE → dislike +1 / affinity −1; SKIP → all zero). This is exact regardless
of how many *other* users' swipes touched the aggregate between the original
swipe and the edit — decay composition (above) guarantees it.

**Skip never overwrites an existing verdict.** If a card already carries a
Like/Dislike and the user swipes up (next) past it again, the client does not
call `swipe.record` with `SKIP` — Skip only applies to a card with no prior
verdict. Explicitly changing a verdict is only done via a horizontal swipe.
This is a client-side rule (the client already holds the local verdict from its
own swipe history for the back-nav stack), backstopped by the server's
same-direction no-op if it's ever called anyway.

## Consequences

- **Schema migration**: `Swipe.updatedAt` (new column, `@updatedAt`,
  backfills to `createdAt` for existing rows). No other model changes.
- **`swipe.record` gains a branch**: no-existing-row (today's path, unchanged)
  vs. same-direction (no-op) vs. different-direction (reversal + apply). The
  reversal math is a generalization of `nextDecayedCounters`/`nextAffinity` — a
  shared helper should compute both the forward-decay and the reversal, not
  duplicate the per-direction weight logic.
- **Exact, not approximate**: unlike a naive "just re-run the decay update,"
  this produces the same counters as if the corrected direction had been
  recorded from the start (up to floating-point precision) — it doesn't drift
  regardless of how many edits happen or how much time passes between them.
- **`CategoryStats` reversal is per-swipe, not per-user** — a category
  aggregate is shared across everyone, but each individual swipe's
  contribution is still isolable by the same formula, since it only depends on
  that swipe's own `updatedAt`.
- **Ordering assumption**: this assumes edits are applied in real time
  (`oldEffectiveAt < now` for the edit being processed) and that concurrent
  edits to the *same* swipe are serialized by the existing `$transaction` +
  row lookup — no new concurrency mechanism needed beyond what's there today.
- **Does not enable arbitrary swipe history rewrites** — only a single
  "current direction, current effective time" per `(userId, postId)` is
  tracked. Good enough for "user changes their mind once in a while during
  back-nav"; not a full audit log of every edit (out of scope — nothing here
  needs one).

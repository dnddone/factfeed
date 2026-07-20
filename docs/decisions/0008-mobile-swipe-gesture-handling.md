# 0008. Hand-rolled swipe cards with Reanimated + Gesture Handler

**Status:** Accepted
**Date:** 2026-07-07 (amended 2026-07-20, 2026-07-20b)

## Context

The core interaction is a card deck driven entirely by gestures — **no
on-screen buttons**. The gesture map (see the mobile design doc, amended
2026-07-20) is:

- **swipe right** → Keep (like)
- **swipe left** → Pass (dislike)
- **swipe up** → next fact (immersive, Reels-style paging), recording `SKIP`
  when the card has no prior verdict
- **swipe down** → previous fact (back-nav, re-reads a card already swiped
  past)

On top of the raw swipe, the same foundation drives three behaviors: a
**peek-behind** depth cue (the next card sits behind the top card at
`scale(.92)` and scales to `1` as the top card clears sideways), a
**first-run gesture coach** (the top card auto-wiggles left then right with
ghosted Pass/Keep stamps to teach the swipe), and **back-nav** (swipe down
re-surfaces the previously-swiped card).

Most off-the-shelf "Tinder card" RN libraries (`react-native-deck-swiper`,
`rn-swiper-list`, etc.) only model two horizontal directions, since they're
built for dating-app UX. They don't model immersive full-screen vertical
paging, bidirectional history, the peek-behind reveal, or a scripted
onboarding wiggle, and each brings its own animation approach that would have
to be fought or replaced.

Options:

- **Prebuilt swiper library** — fast to start, but the wrong shape (two
  directions, no vertical paging / back-nav / peek / coach) and typically a
  thin, lightly-maintained wrapper we'd end up patching anyway.
- **Hand-rolled with `react-native-gesture-handler` +
  `react-native-reanimated`** — both are already the Expo-recommended,
  actively maintained foundation for any gesture-driven UI in RN, and running
  the animation on the UI thread is what keeps the swipe feeling like 60fps
  instead of laggy.

## Decision

Build the deck directly on **`react-native-gesture-handler` +
`react-native-reanimated`**. No third-party swiper package. The deck is a
hand-rolled **three-card stack** — previous / current / next — a bidirectional
vertical pager with a horizontal pan layered on the current card for the
verdict.

- **Vertical axis (paging)**: up reveals `next` (mounting a fresh card from
  the local history/pagination buffer), down reveals `previous` (re-mounting
  the card just swiped past, from local history — no network call).
- **Horizontal axis (verdict)**: only active on the *current* card. Dragging
  right/left shows the Keep/Pass stamp and, on release past threshold, records
  the verdict and advances (promoting the peeking card, same as before).
- **Re-doing an unchanged action is a no-op at the gesture layer**: swiping up
  past an already-`SKIP`ped card, or releasing a horizontal drag in the same
  direction as the card's existing verdict, doesn't re-fire `swipe.record`
  from the client (the local history already holds the verdict) — the server
  is also idempotent here as a backstop (ADR 0012).
- **Changing a verdict**: horizontal swipe on a *previously-judged* card
  (reached via back-nav) is allowed and calls `swipe.record` with the new
  direction — this is the "switch Like ↔ Dislike" case, handled server-side by
  ADR 0012's reversible ranking update. Swipe-up (next) never overwrites an
  existing verdict with `SKIP` — Skip only applies to a card with no prior
  verdict (see ADR 0012).

## Consequences

- Full control over the gesture logic and thresholds (how far/fast a drag
  counts as a commit vs. a snap-back) across all four directions, plus the
  peek-behind reveal, the onboarding coach, and back-nav — none of which a
  two-direction library supports.
- **Three mounted cards, not two** — more Reanimated shared-value bookkeeping
  than the original two-card design (previous/current/next vs.
  current/next), since the deck now needs a coherent transform for the card
  above as well as the one behind. Built this way from the start specifically
  to avoid a 2→3 retrofit once back-nav was confirmed in scope.
- Local history (the client's own swipe/browse buffer) has to retain swiped
  cards for the session so "previous" is instant and free (no re-fetch, no
  network round-trip) — this is pure client state, not a new API.
- Both dependencies are needed anyway for any future gesture-heavy UI, so this
  isn't a single-purpose addition.
- The backend correctness that makes "switch Like ↔ Dislike" safe (reversing a
  decayed ranking contribution exactly) is a separate, non-trivial decision —
  see **ADR 0012**. This ADR owns the gesture/UI shape only.

## Amendments

**2026-07-20** — the original ADR described the three directions as
right(like) / left(dislike) / **down(skip)** for a card stack floating on a
canvas. The approved mobile design changed this to an **immersive full-screen
feed** with right(Keep) / left(Pass) / **up(next)**, **gesture-only** (no
buttons), plus **peek-behind** depth and a **first-run coach**. At that point
back-nav (swipe-down) was still deferred/undecided.

**2026-07-20b** — back-nav confirmed in scope for slice 1, **with editable
verdicts** (switch Like ↔ Dislike on a revisited card) and **idempotent
re-Skip**. The deck moves from a two-card to a **three-card bidirectional
pager** (previous / current / next) from the start. The gesture-map table,
Decision, and Consequences above were rewritten accordingly; the core
technology decision — hand-rolled on gesture-handler + reanimated, no
third-party swiper — is unchanged and further reinforced.

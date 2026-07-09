# Favorite / star facts

Users should be able to save a fact to revisit or share later, separate from
the like/dislike swipe signal. Right now a "like" (swipe right) is an
engagement/ranking signal, not a personal save — once a fact is swiped it's
gone from the feed and there's no way to get back to it.

Rough shape of the idea:

- A "favorite" or "star" action, distinct from swipe-right-to-like. Could be
  a tap/long-press on the card rather than a swipe direction, since the three
  swipe directions (like/dislike/next) are likely already spoken for.
- A screen/tab to review saved facts later.
- Share a saved fact (native share sheet) — see
  [share-facts](2026-07-08-share-facts.md) for the sharing mechanism itself.
- Contract implications: new endpoint(s) to favorite/unfavorite and to list
  a user's favorites, new persisted relation (user ↔ fact), likely a new
  shared type in `packages/contract`.
- Open questions to resolve at design time:
  - Does favoriting imply/require a like, or are they fully independent
    signals?
  - Is this scoped to authenticated users only, or should anonymous/local
    users get a device-local favorites list?
  - Any cap on saved facts, or retention policy?

Not specified yet — needs a design doc in `docs/design-docs/` before
implementation. Consider whether it needs a research spike first (e.g. how
other swipe-feed apps expose "save" without colliding with the swipe
directions) or if the shape above is enough to go straight to a design doc.

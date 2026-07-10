# Report button

Users should be able to flag a fact as wrong, offensive, or low-quality,
separate from the swipe-left/dislike signal. A dislike just means "not for
me" (ranking signal, per ADR 0010); it doesn't surface facts that are
actually incorrect or need to be pulled from the pool entirely.

Rough shape of the idea:

- A report action on the card (tap/long-press menu, or a small icon) —
  needs a spot that doesn't collide with the swipe gestures or the
  favorite/star action from
  [favorite-facts](2026-07-08-favorite-facts.md).
- Report reasons: at minimum "factually incorrect," maybe "offensive,"
  "duplicate." Free-text vs. fixed categories is an open question.
- Backend: new `Report` record (userId, postId, reason, createdAt).
  Question: does a report just log for manual review, or auto-hide a post
  after N reports? Auto-hide needs a threshold and a way to un-hide after
  human review.
- Contract implications: new endpoint (`report.create` or similar), new
  shared type in `packages/contract`.
- Ties into fact grounding/accuracy, already flagged as "still open (defer)"
  in `docs/design-docs/2026-07-03-backend-architecture.md` — reports could
  become the practical signal for that instead of building verification
  upfront.
- Moderation/review surface (who looks at reports, and where) is out of
  scope for a first slice — could start as just a DB table checked
  manually.

Not specified yet — needs a design doc in `docs/design-docs/` before
implementation.

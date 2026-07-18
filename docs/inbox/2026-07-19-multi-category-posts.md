# Multi-category posts

Considered during Phase 5 planning (`docs/exec-plans/active/2026-07-03-backend-mvp.md`).
Deferred — single `category` per post stays as-is for now, with the taxonomy
expanded to 24 entries (`apps/api/src/constants/categories.constants.ts`).

Facts genuinely span domains (a Venus fact is both `space` and `science`), so
tagging isn't a bad idea in principle. Reasons to defer rather than build now:

- `category` is a backend-only ranking/generation signal (ADR 0010), not a
  user-facing browse feature — the bar is "does it improve ranking," not
  "does it model an editorial taxonomy accurately."
- `AFFINITY_WEIGHT` (0.15, `ranking.constants.ts`) is deliberately a small
  nudge, not a hard filter — a single dominant category is likely enough
  signal for what ranking currently does with it.
- With ~30–100 posts, splitting one swipe's signal across multiple
  categories makes the already-sparse cold-start data sparser, not richer —
  works against the prior/exploration-floor logic ADR 0010 already added to
  cope with sparse data.
- Real complexity if built: `Post`/category becomes a join table, `swipe.record`
  needs a rule for fanning a single vote out across a post's categories
  (inflates `CategoryStats` samples per category), and `sampleWeight` needs a
  rule for combining N affinities into one weight instead of reading one.

Revisit once real swipe volume shows single-tagging is actually costing
ranking quality — e.g. users who like `space` facts disproportionately also
liking `science`-tagged ones would be the signal that justifies it.

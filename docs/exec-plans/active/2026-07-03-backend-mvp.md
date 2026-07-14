# Backend MVP — Execution Plan

**Date:** 2026-07-03
**Design doc:** `docs/design-docs/2026-07-03-backend-architecture.md` (Approved)
**ADRs:** 0001–0006, 0010

Each phase is an independently mergeable change (think one PR) that does not
break the app when merged alone. Ship in order; each builds on the last but
leaves `main` in a working state.

Stack (per ADRs): pnpm + Turborepo monorepo, Next.js `apps/api`, tRPC,
Supabase Postgres + Prisma, Claude for fact text, `@vercel/og` typographic
images, Vercel Cron for top-up.

---

## Phase 1 — `packages/contract` (shared types + zod)

**Status:** Done

The typed spine both `api` and `mobile` import. No runtime deps beyond zod.

**Steps**

- Create `packages/contract` (`@factfeed/contract`) with its own `package.json`,
  `tsconfig.json` extending `../../tsconfig.base.json`, and `zod` dependency.
- Define the `SwipeDirection` enum (`LIKE | DISLIKE | SKIP`) and domain types:
  `Post`, `FeedListOutput`, `SwipeInput`.
- Define zod schemas for procedure inputs: `feedListInput` (`cursor?`, `limit`),
  `swipeRecordInput` (`postId`, `direction`), and infer TS types from them.
- Export everything from the package entry (no deep barrels on hot paths).

**Acceptance**

- `pnpm --filter @factfeed/contract typecheck` passes.
- Package can be imported: `import { swipeRecordInput } from "@factfeed/contract"`.

---

## Phase 2 — `apps/api` skeleton + Supabase/Prisma + schema + seed

**Status:** Done

Stand up the Next.js app, connect Postgres, define the schema, seed a static
batch of facts. No feed/swipe logic yet.

**Steps**

- Scaffold `apps/api` (`@factfeed/api`) as a Next.js app (App Router, TS),
  `tsconfig` extending the base, wired into turbo (`build`/`dev`/`lint`/
  `typecheck`).
- Add Prisma; configure `DATABASE_URL` (Supabase, pooled) + `DIRECT_URL` (direct,
  for migrations). Add `.env.example`.
- `prisma/schema.prisma`: `Post` (id, content, category, imageUrl, imageSource,
  likeCount, dislikeCount, scoreUpdatedAt, seenCount, score, createdAt), `User`
  (id, …), `Swipe` (id, userId, postId, direction, createdAt,
  `@@unique([userId, postId])`), `UserCategoryAffinity` (userId, category,
  affinity, updatedAt, `@@unique([userId, category])`), `CategoryStats`
  (category, likeCount, dislikeCount, scoreUpdatedAt, `@@unique([category])`).
- `src/clients/db.ts` — singleton Prisma client.
- First migration; `prisma/seed.ts` inserts ~30 static facts (hardcoded list)
  with `imageSource = "typographic"` and `imageUrl` null for now.

**Acceptance**

- `pnpm --filter @factfeed/api build` succeeds.
- `pnpm --filter @factfeed/api exec prisma migrate dev` applies cleanly.
- Seed populates ~30 posts; verified via `prisma studio` or a count query.

---

## Phase 3 — tRPC `feed.list` + `swipe.record` (static pool)

**Status:** Done

Wire tRPC and serve the seeded facts. Ranking is naive here (newest first);
Phase 4 replaces it.

**Steps**

- Add tRPC server: `src/server/trpc.ts` (init + context with a `userId` — a
  hardcoded/dev user until Phase 7), `src/server/routers/{feed,swipe,_app}.ts`.
- Mount the HTTP handler at `app/api/trpc/[trpc]/route.ts`.
- `feed.list` — return posts the user has **not** swiped (left-join `Swipe` on
  `userId`), newest first, `limit` + cursor pagination. Uses
  `packages/contract` input schema.
- `swipe.record` — upsert a `Swipe` (respect the unique constraint), and
  atomically bump the post's `likeCount` / `dislikeCount` / `seenCount` in a
  transaction. Idempotent on repeat swipes of the same post.
- No automated tests this phase — DB test strategy not yet decided, see
  `docs/inbox/2026-07-10-backend-test-db-strategy.md`. Verify manually
  (`prisma studio` / direct calls) before marking Done.

**Acceptance**

- `feed.list` never returns a post the user already swiped.
- `swipe.record` increments the right counter and is safe to call twice.
- `pnpm --filter @factfeed/api typecheck` passes.

---

## Phase 4 — Ranking (decayed score + affinity + category prior + weighted sampling)

**Status:** Done

Per ADR 0010: decayed counters instead of lifetime totals, a per-user
category affinity layered on top, a category-level prior for cold-start, and
probability-weighted random selection instead of a deterministic sort.

**Steps**

- `src/ranking.ts` — decay helper (`0.5 ^ (elapsedHours / HALF_LIFE_HOURS)`),
  applied to `likeCount`/`dislikeCount` before the Laplace formula:
  `score = (likeCount + 1) / (likeCount + dislikeCount + 2)`. Pure functions
  only, no DB — this is what makes the ranking math unit-testable without
  resolving the DB-test-strategy question first (see
  `docs/inbox/2026-07-10-backend-test-db-strategy.md`).
- Recompute and persist `Post.score`, `scoreUpdatedAt`, the swiping user's
  `UserCategoryAffinity` row, and the post's category `CategoryStats` row
  inside the `swipe.record` transaction.
- `priorPostCounters` (cold-start blend toward `CategoryStats` score) is
  implemented in `src/ranking.ts` but not yet wired into post creation — the
  only place posts are created today is the Phase 2 static seed, and every
  category starts with no `CategoryStats` row anyway, so it falls back to
  flat 0.5 either way. Wire it into `src/generation.ts` when Phase 5 adds the
  first real post-creation path.
- `src/feed.ts` — fetch a candidate pool of unseen posts (top N by `score`,
  a DB-fetch limit not a rank cutoff), then fill the page via weighted random
  sampling without replacement, using `score + w * affinity[category]` as
  each post's weight.
- No backfill needed — `Post.score`/`scoreUpdatedAt` already default to
  `0.5`/`now()` from the Phase 2 schema.
- `UserCategoryAffinity` switched from `@@unique([userId, category])` to
  `@@id([userId, category])` (composite primary key) while touching this
  table — it had no other identifier.
- **Contract change**: `feedListInput`/`FeedListOutput` drop `cursor`/
  `nextCursor`. Weighted-random sampling has no stable order to page
  through; `feed.list` now always draws a fresh sample of the caller's
  unseen posts. See the mobile design doc for the resulting prefetch caveat.
- Tests (`apps/api/src/__tests__/ranking.test.ts`, no DB): zero-vote in a
  fresh category → 0.5; zero-vote in a known category → prior-adjusted
  score; decay reduces stale engagement's weight over time; affinity nudges
  draw odds; a higher-score post is drawn more often across repeated
  samples, but not deterministically first every time.
- Added `vitest` to `apps/api` (first tests in the repo) — wired `pnpm test`
  at the root and a `test` task in `turbo.json`.

**Acceptance**

- Higher-scoring unseen posts get drawn more often, but selection is
  probabilistic, not a fixed order — a 0.5-score post still has real odds of
  appearing.
- A user who dislikes several posts in one category sees that category drawn
  less often in their own feed, without moving other users' odds.
- A new post in a strong category starts above 0.5; a new category still
  starts at 0.5.
- Ranking tests pass.

---

## Phase 5 — Claude fact generation + typographic images

**Status:** Not Started

**Steps**

- `src/generation.ts` — Anthropic SDK; prompt Claude for a batch of facts
  (content + category); content-hash dedupe against existing posts; persist.
- Category mix for a batch is weighted by `CategoryStats` score (ADR 0010),
  with an exploration floor reserving a minimum share for categories with no
  or low-sample `CategoryStats` rows so they aren't starved before they can
  prove out.
- `src/image.ts` — render a typographic card with `@vercel/og`; store/attach
  `imageUrl`, set `imageSource = "typographic"`.
- Replace the static seed with a generation-backed seed script.
- Add `ANTHROPIC_API_KEY` to `.env.example`. Guard cost with a batch-size cap.
- Tests: dedupe rejects a duplicate fact; generated posts validate against the
  contract; category mix respects both the score weighting and the
  exploration floor.

**Acceptance**

- Running the generator adds N new, non-duplicate posts with images.
- A strong-performing category gets more facts generated than a weak one, but
  every category still gets some minimum share.
- Feed serves generated posts identically to seeded ones.

---

## Phase 6 — Scheduled top-up via Vercel Cron

**Status:** Not Started

**Steps**

- `app/api/cron/top-up/route.ts` — verify a `CRON_SECRET` header; count the
  global unseen pool; if below `POOL_MIN_THRESHOLD`, call `generation` for a
  batch. Return a summary. Never invoked by the client.
- `vercel.json` — cron schedule hitting the route on an interval.
- Make the threshold + batch size env-configurable.
- Test the route handler: below threshold → generates; above → no-op;
  wrong/missing secret → 401.

**Acceptance**

- Cron endpoint tops up only when below threshold and rejects unauthenticated
  calls.
- Feed endpoint remains synchronous — it never triggers generation.

---

## Phase 7 — Supabase Auth + real users (later)

**Status:** Not Started

**Steps**

- Integrate Supabase Auth; derive `userId` in the tRPC context from the verified
  session instead of the dev placeholder.
- Protect `feed`/`swipe` procedures; keep the cron route on its secret.
- Migrate/associate any dev-user data as needed.

**Acceptance**

- Procedures require an authenticated user; each user gets their own unseen set
  and swipe history.

---

## Deferred (not in this plan)

- Fact grounding / source verification.
- Event-driven job runner (Inngest/Trigger.dev) + queue, if Cron can't keep up.
- Stock / AI images beyond typographic (additive via `imageSource`).
- `apps/mobile` (Expo) — frontend, tracked separately.

# Multi-locale Facts — Execution Plan

**Date:** 2026-07-19
**Design doc:** `docs/design-docs/2026-07-19-multi-locale-facts.md` (Approved)
**ADRs:** 0011

Each phase is an independently mergeable change (think one PR) that does not
break the app when merged alone. Ship in order.

---

## Phase 1 — Schema + contract + locale-aware feed read

**Status:** Done

Adds `locale` to the data model and contract, and makes the feed query and
`/debug` page locale-aware. Write paths (generation, top-up) still only ever
produce `"en"` content at the end of this phase — that's fine, since existing
behavior is unaffected and nothing is broken by an empty `"uk"` pool yet.

**Steps**

- `packages/contract/src/post.ts`: add `LOCALES = ["en", "uk"] as const`,
  `DEFAULT_LOCALE: Locale = "en"`, `Locale` type, `Post.locale`.
- `packages/contract/src/feed.ts`: add
  `locale: z.enum(LOCALES).default(DEFAULT_LOCALE).catch(DEFAULT_LOCALE)` to
  `feedListInput`.
- `prisma/schema.prisma`: add `Post.locale String @default("en")`; change the
  `contentHash` unique constraint to `@@unique([locale, contentHash])`.
  Migration backfills existing rows to `"en"` via the column default.
- `src/feed.ts` (`drawFeedPage`): add a `locale` param, filter the candidate
  pool by it.
- `src/server/routers/feed.ts`: pass `input.locale` through to `drawFeedPage`,
  include `locale` in the response mapping.
- `app/debug/page.tsx`: show each post's `locale` (small addition, same
  surface already lists `category`/`score`).

**Acceptance**

- `pnpm --filter @factfeed/api exec prisma migrate dev` applies cleanly;
  existing posts read back with `locale = "en"`.
- `feed.list` with no `locale` param, or an unrecognized one (e.g. `"fr"`),
  behaves exactly as today (defaults to `"en"`, returns existing posts).
- `feed.list` with `locale: "uk"` returns an empty page (no Ukrainian content
  yet) rather than erroring.
- `pnpm --filter @factfeed/api typecheck` passes.

---

## Phase 2 — Locale-aware generation

**Status:** Done

Generation can now actually produce Ukrainian content, scoped correctly for
dedupe.

**Steps**

- `src/generation.ts` (`generateFactBatch`): add a required `locale` param.
  Prompt includes a language directive so Claude writes facts natively in
  that language. Existing-hash lookup and `dedupeAgainstExisting` scope to
  the same locale (`where: { locale }`).
- Persisted posts include `locale` on create.
- `prisma/seed.ts`: seed both locales (one `generateFactBatch` call per
  locale in `LOCALES`).
- Update `generation.test.ts` for the locale param and locale-scoped dedupe.

**Acceptance**

- Seeding produces posts in both `"en"` and `"uk"`, each dedup-checked only
  against same-locale content.
- `pnpm --filter @factfeed/api test` passes.
- Manual check: `feed.list({ locale: "uk" })` now returns Ukrainian posts.

---

## Phase 3 — Per-locale top-up

**Status:** Done

Pool health is tracked per locale so one locale running dry isn't masked by
another staying healthy.

**Steps**

- `src/top-up.ts` (`runTopUp`): loop over `LOCALES`, check `poolSize` (now a
  per-locale `prisma.post.count({ where: { locale } })`) against the
  threshold, and generate a batch for any locale under it. Aggregate the
  per-locale results into the existing `TopUpResult` shape (or extend it to
  report per-locale — whichever keeps `app/api/cron/top-up/route.ts`
  simplest).
- Update `top-up.test.ts` for the per-locale loop.

**Acceptance**

- With one locale's pool below threshold and the other healthy, only the
  low one gets topped up.
- `pnpm --filter @factfeed/api test` passes.

---

## Deferred (not in this plan)

- Client-side locale wiring (`react-i18next` → `feed.list.locale`) — blocked
  on `apps/mobile` work starting.
- Explicit content-locale override independent of device/UI locale.
- Additional locales beyond `en`/`uk`.

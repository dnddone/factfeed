# Multi-locale facts

Facts should support multiple languages. Starting set: English and
Ukrainian.

Rough shape of the idea:

- Every fact needs a locale, and a user needs to be served facts in their
  locale(s) — open question whether a single `Post` gets translated variants
  or each locale is a fully separate `Post` row (affects dedupe, ranking
  aggregation, and whether swipes on one translation should count toward the
  others).
- Generation (Phase 5, `src/generation.ts`) would need to produce content
  per locale — either generate directly in each language or generate once
  and translate. Affects prompt design and the content-hash dedupe strategy
  (dedupe within a locale, or across locales too).
- Client-side: how the app picks/switches a user's content locale — same
  mechanism as `react-i18next` (UI strings) or a separate signal? Worth
  deciding whether content locale is always tied to device/UI locale or can
  diverge (e.g. a user with Ukrainian UI who also wants English facts).
- Category taxonomy and `CategoryStats`/`UserCategoryAffinity` — do these
  stay locale-agnostic (categories are the same concepts across languages)
  or split per locale? Leaning toward locale-agnostic since `category` is
  already a backend-only ranking signal, not shown to the user.
- Contract implications: `Post` likely gains a `locale` field; `feed.list`
  likely needs a locale filter/param.

Not specified yet — needs a design doc in `docs/design-docs/` before
implementation. Touches the data model in
`docs/design-docs/2026-07-03-backend-architecture.md` and the generation
phase of `docs/exec-plans/active/2026-07-03-backend-mvp.md` (Phase 5), so
worth resolving before Phase 5 starts rather than retrofitting after.

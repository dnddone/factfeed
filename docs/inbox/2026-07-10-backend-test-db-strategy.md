# Backend test DB strategy

No automated tests exist yet for `apps/api` — Phase 3 (`feed.list` /
`swipe.record`) shipped without them since the DB testing approach isn't
decided (see `docs/exec-plans/active/2026-07-03-backend-mvp.md`).

Options considered, deferred rather than picked:

- Live Supabase dev DB, with a dedicated test user + tagged posts created in
  `beforeAll` and cleaned up in `afterAll`. No new infra, but mutates the
  real dev DB during test runs and needs network access to pass.
- Mocked Prisma client (e.g. `vitest-mock-extended`). Fast, no DB needed,
  but only verifies we called Prisma with the right arguments — not that
  the actual SQL/transaction behaves correctly.
- Local Postgres via Docker (docker-compose or testcontainers), migrated
  and torn down per run. Closest to real behavior, no risk to the dev DB,
  but adds infra (Docker dependency, CI wiring) not otherwise needed yet.

Needs a decision before Phase 4 (ranking: decay math, weighted sampling) —
that logic is much riskier to ship untested than Phase 3's straightforward
filter/upsert. Worth a quick ADR once picked, since it'll set the pattern
for all future backend tests.

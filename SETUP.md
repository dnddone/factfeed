# Setup — accounts & API keys

External services to register with before/while implementing
`docs/exec-plans/active/2026-07-03-backend-mvp.md`. Env vars land in
`apps/api/.env.example` as each phase adds them (see phase notes below).

## Required

### Supabase — Postgres, Auth

- Create a project at supabase.com.
- **Phase 2**: `DATABASE_URL` (pooled, transaction mode, port 6543) +
  `DIRECT_URL` (for `prisma migrate`) from Project Settings → Database.
  Supabase's plain "Direct connection" host (`db.<ref>.supabase.co`) is
  IPv6-only and unreachable from IPv4-only networks — use the **Session
  pooler** string instead for `DIRECT_URL` (same pooler host as
  `DATABASE_URL`, port 5432, no `pgbouncer=true` param).
- **Phase 7** (pulled forward per ADR 0009 — swipe is auth-gated): `SUPABASE_URL`
  - `SUPABASE_ANON_KEY` (client-side session) and `SUPABASE_SERVICE_ROLE_KEY`
    (server-side session verification in the tRPC context) from Project
    Settings → API.

### Anthropic — Claude API

- Console at console.anthropic.com → API Keys.
- **Phase 5**: `ANTHROPIC_API_KEY`, used by `src/lib/generation.ts` to
  generate fact batches. Set a spend/rate limit — generation runs on a
  schedule (Phase 6), not just on-demand.

### Vercel — hosting, Cron

- Account at vercel.com, project linked to this repo (root = `apps/api`).
- **Phase 6**: no external key, but the cron route needs `CRON_SECRET` — a
  value you generate yourself (e.g. `openssl rand -hex 32`) and set both in
  Vercel's env vars and `vercel.json`'s cron config.

## Optional / deferred

### Unsplash or Pexels API

Only needed if `imageSource` moves beyond the typographic (`@vercel/og`)
default in Phase 5 to the "stock" tier mentioned in the design doc. Not
required to ship the MVP loop — skip unless/until that's picked up.

Not needed yet: `apps/mobile` (Expo/EAS account) — deferred, tracked
separately from the backend plan.

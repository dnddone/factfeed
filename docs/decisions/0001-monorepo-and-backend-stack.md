# 0001. Monorepo with pnpm + Turborepo, Next.js backend

**Status:** Accepted
**Date:** 2026-07-03

## Context

factfeed is a React Native (Expo) mobile client plus a backend that generates,
stores, ranks, and serves facts. Both ends are TypeScript. The client and
backend communicate over JSON, so they share a request/response contract.

Two structural questions had to be settled before writing code:

1. One repository or separate repos for frontend and backend?
2. Is Next.js enough for the backend, or do we need a separate Node service and
   a database?

## Decision

**Monorepo**, managed with **pnpm workspaces** + **Turborepo**:

```
apps/mobile   (Expo)     apps/api   (Next.js)
packages/contract        packages/config
```

The API contract (types + zod schemas) lives in `packages/contract` and is
imported by both `apps/api` and `apps/mobile` — never duplicated by hand. A
drift in the contract becomes a compile-time error.

**Backend = Next.js Route Handlers + Postgres + a background-job mechanism.**

- Next.js route handlers serve the request/response API (`/feed`, `/swipe`).
- **Postgres** (managed: Supabase or Neon) via Prisma or Drizzle stores posts,
  swipes, and counters. A database is mandatory regardless of framework —
  swipe counts and per-user "seen" state cannot live in memory.
- **Fact/image generation runs off the request path** as a background job
  (Inngest, Trigger.dev, or a cron), because LLM/image generation takes seconds
  and must not block a swipe.

We deliberately do **not** stand up a separate Express/Node server up front.

## Consequences

- Atomic changes across the contract boundary in a single PR; shared tooling
  (tsconfig, prettier) at the root.
- `apps/api` still deploys independently (Vercel, root = `apps/api`); mobile
  builds via EAS. Monorepo ≠ single deploy.
- Expo + Metro must be configured for workspace symlinks (`watchFolders`,
  `nodeModulesPaths`) when `apps/mobile` is scaffolded.
- A dedicated worker + queue (e.g. BullMQ/Redis) is deferred until generation
  throughput or real-time needs justify it. Revisit if we outgrow serverless
  background jobs.
- Follow-on decisions are recorded separately: ADR 0003 (Supabase + Prisma),
  ADR 0004 (tRPC), ADR 0005 (ranking + Vercel Cron), ADR 0006 (generation +
  typographic images).

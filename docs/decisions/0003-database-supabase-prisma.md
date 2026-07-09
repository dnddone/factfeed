# 0003. Supabase Postgres + Prisma

**Status:** Accepted
**Date:** 2026-07-03

## Context

The app needs durable storage for posts, per-user swipe verdicts, and
engagement counters — a relational shape with joins ("posts this user hasn't
swiped, ordered by score"). We also foreseeably need **file storage** (fact
images) and **auth** (real users, later). The choice is a database host + an ORM.

Options weighed:

- **Host**: Supabase (Postgres + Auth + Storage in one platform) vs Neon (pure
  serverless Postgres with branching, auth/storage added separately).
- **ORM**: Prisma (mature migrations, strong DX, generated type-safe client) vs
  Drizzle (SQL-first, lighter, better serverless cold-start, thinner migrations).

## Decision

**Supabase Postgres** as the database host, **Prisma** as the ORM.

## Consequences

- **Why Supabase**: it bundles the three things this app needs — Postgres,
  Storage (for generated images), and Auth (Phase 7) — behind one platform and
  one bill. Avoids stitching a separate storage bucket and auth provider onto a
  bare Postgres now. Trade-off: more platform lock-in than plain Postgres; it is
  still standard Postgres underneath, so Prisma/SQL stay portable if we leave.
- **Why Prisma**: migration workflow and DX are the priority for a small team
  moving fast; the generated client gives typed queries with little ceremony.
  Trade-off: heavier runtime and slower cold starts than Drizzle on serverless —
  acceptable at our scale; revisit if API cold-start latency becomes a problem.
- The Prisma schema is the source of truth for DB shape; app-facing domain types
  still live in `packages/contract` and are mapped at the boundary (don't leak
  Prisma model types through the API).
- Neon's branching (per-PR preview DBs) is given up; acceptable for now.

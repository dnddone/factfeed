# 0004. tRPC for client ↔ backend transport

**Status:** Accepted
**Date:** 2026-07-03

## Context

Both the backend (`apps/api`) and the mobile client (`apps/mobile`) are
TypeScript in one monorepo (ADR 0001) — which was chosen specifically so the two
could share a contract. The remaining question was how they talk: hand-written
REST endpoints with shared zod schemas, or tRPC.

## Decision

Use **tRPC**. Procedures are defined in `apps/api`; the client calls them as
typed functions with no hand-written client or response types. zod schemas in
`packages/contract` validate inputs and are reused as procedure input types.

## Consequences

- **Why**: end-to-end type safety with near-zero glue — a change to a procedure's
  input/output is a compile error at every call site immediately. This is the
  direct payoff of the monorepo decision; REST + a hand-written client would
  reintroduce the drift we co-located to avoid.
- **Trade-off accepted**: the client is coupled to tRPC. If we ever need a
  non-TS client or a public REST API, we'd add a thin REST layer then. Not a
  concern for a single first-party RN client.
- The cron trigger stays a **plain Next.js route handler** (`/api/cron/top-up`),
  not a tRPC procedure — it's machine-to-machine, secured by a shared secret,
  and doesn't benefit from the typed client.
- React Query is used on the client via tRPC's React Query integration (matches
  the "React Query for server state" convention).

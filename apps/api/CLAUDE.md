# factfeed API — Claude Instructions

Next.js backend: route handlers, jobs, DB access. Deploys independently
(root = `apps/api`). Cross-cutting conventions (commits, TypeScript, naming,
destructuring, testing, docs workflow) live in the repo-root `AGENTS.md` —
this file covers only what's specific to `apps/api`.

## API layer

- Data-access functions are async, typed, no classes.
- Object arguments use a named type — never an inline object literal in the
  signature. Keep shared request/response types in `packages/contract`.
- Validate all external input (request bodies, generation output) with the zod
  schemas from `packages/contract` at the boundary.
- Transform snake_case external data to camelCase at the boundary.

# factfeed

Swipeable facts feed — a Tinder/Reels-style app. Facts are generated on the
backend, ranked by engagement, and served to a React Native client. Swipe
right to like, left to dislike, down for the next one.

> `factfeed` is a working codename. The public brand is decided closer to
> launch (see naming notes).

## Monorepo layout

```
apps/
  mobile/       # Expo React Native app          (not scaffolded yet)
  api/          # Next.js backend (route handlers + DB)  (not scaffolded yet)
packages/
  contract/     # shared TS types + zod schemas — the API contract (not yet)
  config/       # shared tsconfig / lint config              (not yet)
```

## Tooling

- **pnpm** workspaces — package management
- **Turborepo** — task runner (`build`, `dev`, `lint`, `typecheck`)
- **TypeScript** (strict) — shared base config in `tsconfig.base.json`
- **Prettier** — formatting

## Commands

```bash
pnpm install         # install all workspaces
pnpm dev             # run all apps in dev (via turbo)
pnpm build           # build all
pnpm lint            # lint all
pnpm typecheck       # type-check all
pnpm format          # format the repo with prettier
```

## Status

Bootstrapped monorepo tooling. Apps and packages are added next.

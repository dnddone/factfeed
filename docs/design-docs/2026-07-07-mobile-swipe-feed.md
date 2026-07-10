# Mobile Swipe Feed — Design Doc

**Date:** 2026-07-07
**Status:** Draft
**Product spec:** `docs/product-specs/2026-07-07-mobile-swipe-feed.md`
**ADRs:** 0003, 0004, 0007, 0008, 0009

## Problem

Build the first slice of `apps/mobile`: a single-screen swipe feed that works
for guests (browse-only) and signed-in users (swipes persist), consuming the
existing `feed.list` / `swipe.record` tRPC contract — no contract changes.

## Design overview

- Expo (React Native) app, **Expo Router** for navigation (ADR 0007).
- **tRPC client** + its React Query bindings talk to `apps/api` (ADR 0004) —
  server state (feed pages, swipe mutation) lives in React Query's cache; no
  separate state library needed.
- **Supabase Auth** client SDK (ADR 0003) owns the session; a thin
  `useSession()` hook wraps `supabase.auth.onAuthStateChange` and exposes
  `{ status: "guest" | "authenticating" | "authed", accessToken }`. The tRPC
  client attaches `accessToken` as a header when present.
- Card stack built on `react-native-gesture-handler` + `react-native-reanimated`
  (ADR 0008), a three-way pan gesture (right/left/down).
- Guest browsing / auth-gated swipe per ADR 0009.

## Screens

```
app/
  _layout.tsx     -- root layout: mounts SessionProvider, tRPC provider
  index.tsx       -- the feed screen (only real screen in this slice)
  auth.tsx        -- sign-in/sign-up, presented as a modal
```

Auth is a **modal route**, not a separate flow the user has to navigate
through — it's summoned by the swipe gate and dismissed back into the feed on
success.

## Data flow

**On mount** — `feed.list` (no cursor) → render the top of the stack. Guest
and signed-in requests hit the same procedure; a guest request has no
`accessToken` header, so the backend context resolves no `userId` and
`feed.list` skips unseen-filtering (ADR 0009).

**Approaching the end of the loaded batch** — call `feed.list` again with the
returned cursor and append to the stack (prefetch a few cards before the user
hits the end, not on the last card).

**On swipe release:**

1. `status !== "authed"` → snap the card back, present `auth.tsx`.
2. `status === "authed"` → optimistically pop the card, fire
   `swipe.record({ postId, direction })`. On failure, no retry UI in this
   slice — the swipe already happened visually; log and move on (see Edge
   cases).

**On successful auth** (from the modal) — dismiss back to the feed; the
in-progress swipe is **not** replayed (ADR 0009 — no queueing). The user
simply swipes that card again.

## Edge cases

- **Guest exhausts the initially-loaded batch without authing** — keep
  paginating via `feed.list`; browsing never requires auth.
- **`swipe.record` fails after the card has already animated off-screen** —
  the card is gone from the stack either way (bad UX to bring it back). Fire
  the mutation, catch, log; do not block or roll back the UI. Consider a
  toast if this proves common in practice.
- **User backs out of the auth modal without completing it** — return to the
  feed with the card that triggered the gate still on top (it snapped back;
  it was never removed from the stack).
- **Token refresh mid-session** — handled by the Supabase client SDK
  internally; `useSession()` just reflects whatever it reports.

## Dependency on backend auth

This slice needs real Supabase-authenticated `userId`s in the tRPC context —
i.e. backend Phase 7 from `docs/exec-plans/active/2026-07-03-backend-mvp.md`
("Supabase Auth + real users (later)"), not the hardcoded dev-user context
Phases 1–6 use. **That plan currently sequences auth last; this design doc
needs at least a minimal slice of it much earlier.** Flagging this for a
resequencing decision rather than assuming one here — see ADR 0009
consequences.

## File impact

```
apps/mobile/                    new app (Expo, TS)
  app/_layout.tsx                root layout, providers
  app/index.tsx                  feed screen
  app/auth.tsx                   sign-in/sign-up modal
  src/hooks/useSession.ts        Supabase session -> guest/authenticating/authed
  src/hooks/useFeed.ts           feed.list pagination wrapper
  src/components/SwipeCard.tsx   single card, pan gesture + animation
  src/components/CardStack.tsx   stack rendering + swipe orchestration
  src/clients/trpc.ts             tRPC client (attaches accessToken)
  src/clients/supabase.ts         Supabase client init
```

Uses `Post`, `FeedItem`, `SwipeInput`, `SwipeDirection` from
`packages/contract` as-is — no contract changes.

## Resolved decisions

- **0003** — Supabase (Postgres + Auth).
- **0004** — tRPC transport.
- **0007** — Expo Router.
- **0008** — Hand-rolled swipe cards (gesture-handler + reanimated).
- **0009** — Guest browsing, auth-gated swiping.

## Still open (defer)

- Auth method(s) offered (email/password, magic link, social) — product spec
  "Open questions".
- Resequencing backend Phase 7 ahead of Phases 5–6, or running a minimal auth
  slice in parallel — needs a decision before implementation starts.
- Everything in the product spec's "Out of scope" section: profile/settings,
  category filters, push/sharing/monetization, onboarding walkthrough,
  guest-swipe queueing.

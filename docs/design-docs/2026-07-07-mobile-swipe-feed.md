# Mobile Swipe Feed — Design Doc

**Date:** 2026-07-07 (updated 2026-07-20)
**Status:** Approved
**Product spec:** `docs/product-specs/2026-07-07-mobile-swipe-feed.md`
**ADRs:** 0003, 0004, 0007, 0008, 0009, 0012
**Visual direction (mockup):** https://claude.ai/code/artifact/d9b6b1eb-4286-42a8-a22d-5b156bfbbca5

## Problem

Build the first slice of `apps/mobile`: an immersive, swipeable facts feed that
works for guests (browse-only) and signed-in users (swipes persist), consuming
the existing `feed.list` / `swipe.record` tRPC contract — no contract changes.

## Design overview

- Expo (React Native) app, **Expo Router** for navigation (ADR 0007).
- **Immersive, full-screen feed** — Reels/TikTok-style: each fact fills the
  screen edge-to-edge. Vertical swipe pages the feed; horizontal swipe records a
  verdict. **Gesture-only — no on-screen Keep/Pass buttons.**
- **tRPC client** + React Query bindings talk to `apps/api` (ADR 0004) — server
  state (feed pages, swipe mutation) lives in React Query's cache; no separate
  state library needed.
- **Supabase Auth** client SDK (ADR 0003) owns the session; a thin
  `useSession()` hook wraps `supabase.auth.onAuthStateChange` and exposes
  `{ status: "guest" | "authenticating" | "authed", accessToken }`. The tRPC
  client attaches `accessToken` as a header when present.
- Three-card bidirectional deck (back-nav + verdicts) built on
  `react-native-gesture-handler` + `react-native-reanimated` (ADR 0008).
  Editable verdicts are made ranking-safe by a reversible decayed-update on the
  backend (ADR 0012).
- Guest browsing / auth-gated swipe per ADR 0009.

## Interaction model

The feed is a **three-card bidirectional stack**: **previous** / **current** /
**next**, all held in local history so vertical paging never needs a network
round-trip. The **next** card additionally peeks behind the current one during
a horizontal drag.

| Gesture              | Result                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| **Swipe up**          | Next fact. Records `SKIP` when the card has no prior verdict; no auth gate. |
| **Swipe down**        | Previous fact — re-surfaces the card just swiped past, from local history. |
| **Swipe right**       | **Keep** (like). Card flies off; the peeking card becomes current. |
| **Swipe left**        | **Pass** (dislike). Same, mirrored. |

- **Peek-behind depth**: during a horizontal drag the next card scales
  `.92 → 1` and un-offsets, revealing part of it as the current card clears.
  Vertical paging does not reveal the peek — the adjacent card rises/falls as a
  full screen instead.
- **Thresholds**: a drag past the commit threshold flies the card off and
  advances; under threshold it springs back (`cubic-bezier(.22, 1.2, .36, 1)`,
  one gentle overshoot). Horizontal drag adds a subtle rotate (±9°).
- **Auto-advance after a verdict**: Keep/Pass removes the judged card and
  promotes the peeking card to current. A verdict both records and advances;
  there is no separate "next" step after judging.
- **Changing a verdict on a revisited card**: swiping down to a previously
  Kept/Passed card and then swiping horizontally **records the new
  direction** — this is how a user switches Like ↔ Dislike. Handled
  server-side by ADR 0012's reversible ranking update (exact, not
  approximate — see that ADR for the math).
- **Idempotent re-Skip**: swiping up past a card already marked `SKIP` (no
  verdict) is a no-op — the client doesn't re-fire `swipe.record` (it already
  knows the local verdict from history), and the server treats a repeated
  same-direction call as a no-op too, as a backstop.
- **Skip never overwrites an existing verdict**: if a card already has a
  Like/Dislike, swiping up past it again just navigates — the client does not
  send `SKIP` and downgrade a real verdict to neutral. Only an explicit
  horizontal swipe changes a verdict.
- **First-run gesture coach** (onboarding): on first launch the top card
  auto-animates a wiggle — left with a ghosted **Pass** stamp, then right with a
  ghosted **Keep** stamp — teaching the swipe. It dismisses on first touch and
  does not reappear (persist a `hasSeenCoach` flag locally). Respects
  `prefers-reduced-motion` (stamps fade in place instead of the card moving).

## Visual design

Dark-first, warm-classical monochrome with the fact's gradient as the only
color in the room. Futuristic, clean, minimal.

- **Card face**: **native text** — `Post.content` rendered in RN over an
  app-drawn gradient. Full typographic control, dynamic type, accessibility, and
  per-card theming. `Post.imageUrl` (the `@vercel/og` typographic card, ADR
  0006) is used only as a share/OG asset, **not** as the in-feed card face.
- **Palette**: canvas `#0B0A09` (warm near-black), text `#F7F1E7` (warm
  off-white), Keep/accent `#E9A23B` (amber), Pass `#8FA0B4` (cool slate). Amber
  and slate are semantic (verdict) colors, used sparingly — not a general accent.
- **Fact gradients**: a curated set of ~6 deep, muted gradients, selected
  **deterministically from `post.id`** (`hash(id) % N`), so a given fact always
  looks the same across sessions and devices. A filmic grain and a top/bottom
  darken overlay keep the warm-white text legible on any gradient.
- **Type**: SF system stack (`-apple-system` / `SF Pro`) — clean, futuristic,
  native on the Apple target. Fact at ~29/1.22, tight tracking; a monospace
  utility face for kickers, meta, and labels.
- **Voice**: classical, not cute — "Keep / Pass" (not NOPE / LIKE), "You're all
  caught up" (not "no more content"), "Send magic link" (the button says what
  happens).
- **Chrome is minimal by intent**: the contract has no category or source field,
  so a card is the fact, its gradient, and one small tag/meta line — nothing
  invented.

### Screen states

Immersive feed (default), Keep/Pass (with peek), first-run coach, loading
(skeleton + shimmer), empty ("You're all caught up"), auth (bottom sheet), and
the nested Settings / About screens. All mocked in the visual-direction
artifact linked above.

## Screens & navigation

The feed is immersive (no visible nav bar); a **menu button** in the overlaid
header pushes into a nested stack.

```
app/
  _layout.tsx        -- root layout: SessionProvider, tRPC provider
  index.tsx          -- immersive feed (the primary screen)
  auth.tsx           -- sign-in/sign-up, presented as a modal
  (menu)/
    settings.tsx     -- Account · Language (en/uk) · Notifications (later)
    about.tsx        -- version, Privacy, Terms
```

- **Auth** is a modal route summoned by the swipe gate, dismissed back into the
  feed on success.
- **Settings / About** are a pushed stack opened from the header menu button.
  **Feed + auth ship first (slice 1)**; the menu button and `(menu)` route group
  exist from day one so nested screens fill in incrementally rather than being a
  retrofit. Settings is the natural home for the **en/uk locale switch** the
  contract already supports (`packages/contract` `LOCALES`).

## Data flow

**On mount** — `feed.list` → render the top of the stack. Guest and signed-in
requests hit the same procedure; a guest request has no `accessToken` header, so
the backend resolves no `userId` and `feed.list` skips unseen-filtering (ADR
0009).

**Approaching the end of the loaded batch** — call `feed.list` again and append
(prefetch a few cards before the end, not on the last card). `feed.list` has no
cursor (ADR 0010: weighted-random sampling has no stable order to page through).
Known limitation: prefetching before the current batch is fully swiped can
redraw a still-on-screen card, since it's "unseen" server-side until swiped.
Acceptable for now — revisit (e.g. client-side `excludeIds`) if real usage shows
it's a problem.

**On swipe release (Keep/Pass), first time or a change of mind:**

1. `status !== "authed"` → snap the card back, present `auth.tsx`.
2. `status === "authed"` → optimistically advance (promote the peeking card),
   fire `swipe.record({ postId, direction })`. On failure, no retry UI in this
   slice — log and move on (see Edge cases). If the card already carries a
   different verdict (reached via back-nav), the server applies ADR 0012's
   reversal so ranking reflects only the new direction, not both.

**On swipe up (next)** — if the card has no prior verdict, advances and
**records a `SKIP`** for authed users so the post is marked *seen* and excluded
from future `feed.list` draws (`SKIP` is a pure seen-marker: 0 like/dislike
weight, 0 affinity delta, `seenCount++`, see `apps/api/src/ranking.ts`). If the
card already has a Like/Dislike, swiping up just navigates — no call is made
(a verdict is never downgraded to `SKIP`). Next never triggers the auth gate —
a guest simply pages without recording (repeats possible, accepted per ADR
0009). Only Keep/Pass gate on auth.

**On swipe down (previous)** — pure client-side navigation into local history;
no network call, no auth gate. The card behaves like any other current card:
its existing verdict (if any) is shown via the stamp state, and a horizontal
swipe from here can change it (see above).

**On successful auth** (from the modal) — dismiss back to the feed; the
in-progress swipe is **not** replayed (ADR 0009 — no queueing). The user swipes
that card again.

## Edge cases

- **Guest exhausts the initially-loaded batch without authing** — keep
  paginating via `feed.list`; browsing never requires auth.
- **`swipe.record` fails after the card animated off-screen** — the card is gone
  either way; fire, catch, log; do not roll back the UI. Consider a toast if
  this proves common.
- **User backs out of the auth modal** — return to the feed with the triggering
  card still on top (it snapped back; it was never removed).
- **Coach interrupted** — any touch during the first-run coach cancels the
  animation immediately and hands control to the user.
- **Token refresh mid-session** — handled by the Supabase client SDK; the
  session hook just reflects whatever it reports.

## Resolved decisions (this iteration)

- **Layout** — immersive full-screen Reels-style feed; swipe up for next. No
  "next" button.
- **Depth** — next card peeks behind on horizontal swipe (`.92 → 1`).
- **Controls** — gesture-only; no on-screen Keep/Pass buttons.
- **Onboarding** — first-run gesture coach (card wiggle + ghosted stamps).
- **Skip recording** — swipe-up (next) records a `SKIP` for authed users (seen-
  marker; excludes from future feeds) but never gates on auth. Guests page
  without recording. Never overwrites an existing verdict.
- **Back-nav — in scope for slice 1**: swipe down re-surfaces the previous
  card from local history (no network call). The deck is a **three-card
  bidirectional pager** (previous/current/next) from the start, not a
  fast-follow retrofit.
- **Editable verdicts** — a revisited card's Like/Dislike can be changed via
  another horizontal swipe. Backend applies an exact reversal of the old
  decayed contribution before applying the new one (ADR 0012) — ranking stays
  correct regardless of how many times a user changes their mind.
- **Idempotent re-Skip** — re-doing Skip on an already-skipped card has no
  effect, client- and server-side.
- **Card face** — native text over a seeded gradient; `imageUrl` is share/OG
  only.
- **Auth method** — **email magic link** now (identity, not authorization;
  Supabase-native, zero provider config). **Apple & Google deferred** to a
  fast-follow (they need provider setup / redirect config).
- **Backend auth** — already complete (backend Phase 7 Done): JWT → `userId`
  resolution + `protectedProcedure` are live. Mobile just signs in and attaches
  the token; no backend auth work. Only ADR 0012 (editable swipes) is a new
  backend change.
- **Navigation** — immersive feed + header menu → nested Settings / About stack;
  shell built now, screens fill in incrementally.
- **Mood** — dark-first, warm monochrome + per-fact gradient.

## Scope changes vs. the product spec

The product spec listed these as out of scope for slice 1; this design pulls the
first two in (a settings *shell*, and onboarding) because the interaction model
now depends on them:

- **Onboarding coach** — required now that the app is gesture-only; users need to
  be taught the swipe. In scope.
- **Settings / About shell** — the header menu + `(menu)` route group are built
  now; screen *content* lands incrementally. The feed + auth remain the only
  fully-built screens in slice 1.
- Still out of scope: category filters, push/sharing/monetization, guest-swipe
  queueing.

## Related ADR updates (done)

- **ADR 0008** amended: gesture map is right(Keep)/left(Pass)/up(next)/
  down(previous); deck is a three-card bidirectional pager; peek-behind, coach,
  idempotent re-Skip, and "Skip never overwrites a verdict" are recorded there.
- **ADR 0012** (new): the reversible decayed-ranking update that makes
  editable verdicts (switch Like ↔ Dislike on a revisited card) exact — a
  `Swipe.updatedAt` schema addition plus an edit-aware `swipe.record`.

## Backend dependency

**Auth is already satisfied.** Backend Phase 7 (Supabase Auth + real users) is
Done (`docs/exec-plans/completed/2026-07-03-backend-mvp.md`): the tRPC context
resolves a real `userId` from the `Authorization: Bearer <jwt>` header via
`supabase.auth.getUser` and provisions the `User` row (`apps/api/src/auth.ts`),
and `protectedProcedure` already gates swipes on it. The mobile app only has to
sign in with Supabase (magic link) and attach the access token — **no backend
auth work required**. The one new backend change this slice needs is ADR 0012
(editable swipes), to change a verdict on a revisited card.

## File impact

```
apps/mobile/                     new app (Expo, TS)
  app/_layout.tsx                 root layout, providers
  app/index.tsx                   immersive feed screen
  app/auth.tsx                    magic-link sign-in modal
  app/(menu)/settings.tsx         settings (shell)
  app/(menu)/about.tsx            about (shell)
  src/hooks/useSession.ts         Supabase session -> guest/authenticating/authed
  src/hooks/useFeed.ts            feed.list pagination wrapper
  src/components/module/SwipeDeck.tsx    three-card bidirectional stack, gesture orchestration
  src/components/module/FactCard.tsx     single card: seeded gradient + native text
  src/components/module/GestureCoach.tsx first-run coach animation
  src/hooks/useSwipeHistory.ts    local previous/current/next buffer for back-nav
  src/clients/trpc.ts             tRPC client (attaches accessToken)
  src/clients/supabase.ts         Supabase client init
```

Uses `Post`, `FeedListOutput`, `SwipeInput`, `SwipeDirection`, `Locale` from
`packages/contract` as-is — no contract changes.

**Backend also changes** (ADR 0012, not itemized above since this doc scopes
`apps/mobile`): `apps/api/prisma/schema.prisma` (`Swipe.updatedAt`) and
`apps/api/src/server/routers/swipe.ts` (edit-aware `swipe.record`).

## Still open (defer)

- Apple / Google sign-in (fast-follow after magic link).
- Guest-swipe queueing + merge after sign-in (ADR 0009 — deferred).
- Settings/About screen *content* beyond the shell.
- How far back local history extends (e.g. cap at N cards, or the whole
  session) — a tuning detail for the exec-plan, not an architectural question.

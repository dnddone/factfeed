# Mobile Swipe Feed — Execution Plan

**Date:** 2026-07-20
**Design doc:** `docs/design-docs/2026-07-07-mobile-swipe-feed.md` (Approved)
**ADRs:** 0003, 0004, 0007, 0008, 0009, 0012
**Visual direction:** https://claude.ai/code/artifact/d9b6b1eb-4286-42a8-a22d-5b156bfbbca5

Each phase is an independently mergeable change (think one PR) that does not
break the monorepo when merged alone. Ship in order, except **Phase 4
(backend)** which is isolated and may be built any time before Phase 5.

**Testing note:** `apps/mobile` is exempt from tests during active development
(CLAUDE.md). The backend phase (Phase 4) is tested as usual. "Acceptance" for
mobile phases is manual verification in the iOS Simulator / Expo Go against a
local `apps/api` (`pnpm --filter @factfeed/api dev`).

**Env / prerequisites (Phase 0 wires these):**

- Mobile reuses the **same Supabase project** as the backend. `EXPO_PUBLIC_SUPABASE_URL`
  / `EXPO_PUBLIC_SUPABASE_ANON_KEY` = the backend's `SUPABASE_URL` / `SUPABASE_ANON_KEY`
  (anon key is the public client key).
- Deep-link scheme for magic-link return: **`factfeed://auth-callback`** — this
  must match the Redirect URL added in the Supabase dashboard (Authentication →
  URL Configuration). Confirm the exact string entered there matches before
  Phase 2.
- API base URL points at **local `apps/api`** in dev.

---

## Phase 0 — Scaffold `apps/mobile` + providers + monorepo wiring

**Status:** Not Started

A running Expo app with all shared providers mounted and a placeholder screen —
consumes nothing yet. Establishes the stack so later phases only add features.

**Steps**

- `create-expo-app` in `apps/mobile`, package name `@factfeed/mobile`, TS strict
  (extend `@factfeed/config` tsconfig; enable `noUncheckedIndexedAccess`, no
  `any`). Expo Router, typed routes.
- Install RN libs via `expo install` (so versions are Expo-SDK-compatible):
  `react-native-gesture-handler`, `react-native-reanimated`,
  `react-native-safe-area-context`, `@supabase/supabase-js`, plus
  `@tanstack/react-query`, `@trpc/client`, `@trpc/react-query`, `nativewind` +
  `tailwindcss`, `tailwind-variants`, `react-i18next` / `i18next`.
- NativeWind config (`tailwind.config.js`, babel plugin, `nativewind-env.d.ts`);
  Reanimated babel plugin last in the list.
- App scheme `factfeed` in `app.json`; register deep-link config.
- `src/clients/supabase.ts` (client SDK, `EXPO_PUBLIC_*` env, AsyncStorage
  session persistence + `detectSessionInUrl` for the deep link).
- `src/clients/trpc.ts` (tRPC client + React Query; base URL from env; header
  function stub — token attach lands in Phase 2). Import `AppRouter` type from
  `apps/api` (type-only), types from `packages/contract`.
- `app/_layout.tsx`: mount `GestureHandlerRootView`, `QueryClientProvider`,
  tRPC provider, i18n provider, `SafeAreaProvider`.
- `app/index.tsx`: placeholder screen ("factfeed" wordmark on the dark canvas).
- i18n skeleton: `en` + `uk` resource files, `t()` wired, no hardcoded strings.
- Turbo: confirm `dev`/`lint`/`typecheck` pick up the new workspace; add mobile
  scripts (`start`, `ios`, `android`).
- Root `.env.example` / `apps/mobile/.env.example` documenting `EXPO_PUBLIC_*`.

**Acceptance**

- `pnpm --filter @factfeed/mobile start` boots; app opens in iOS Simulator /
  Expo Go showing the placeholder.
- `pnpm --filter @factfeed/mobile typecheck` and `pnpm lint` pass; root
  `pnpm typecheck` still green across workspaces.

---

## Phase 1 — Feed read + FactCard + loading/empty states (guest)

**Status:** Not Started

Real facts on screen for a guest. Single card (no deck/gestures yet); a
temporary control advances to the next fact so the data path is exercisable.

**Steps**

- `src/hooks/useFeed.ts`: wrap `feed.list` (React Query, key `["feed", locale]`),
  append-on-exhaustion pagination (prefetch before the last card), no cursor
  (ADR 0010). Locale from device / default `"en"`.
- `src/utils/gradient.ts`: deterministic `hash(post.id) % N` → gradient index
  (the ~6-gradient set from the design doc / mockup).
- `src/components/module/FactCard.tsx`: full-bleed seeded gradient + native
  `Post.content` text, kicker, meta line, grain + darken overlays. Native text
  only; `imageUrl` unused here (ADR 0006).
- `app/index.tsx`: render the current card; loading skeleton (shimmer) and empty
  state ("You're all caught up"). Temporary "next" affordance (replaced by the
  deck in Phase 3).
- Extract expensive card render into a `memo()` component so the screen can
  early-return on loading.

**Acceptance**

- App shows real facts from local `apps/api`; gradient is stable per fact across
  reloads.
- Loading skeleton then cards; exhausting the batch shows the empty state (or
  paginates when more exist).
- Guest (no token) works — `feed.list` returns unfiltered posts.

---

## Phase 2 — Magic-link auth (session + modal + token attach)

**Status:** Not Started

Sign-in foundation. Nothing is gated yet, but sessions work and the tRPC client
sends the token — the prerequisite for verdicts in Phase 3.

**Steps**

- `src/hooks/useSession.ts`: wrap `supabase.auth.onAuthStateChange`; expose
  `{ status: "guest" | "authenticating" | "authed", accessToken }`. Depend on
  primitives.
- `src/context/SessionProvider.tsx` mounted in `_layout.tsx`.
- `app/auth.tsx`: modal route — email field + "Send magic link"
  (`supabase.auth.signInWithOtp`, `emailRedirectTo: factfeed://auth-callback`).
  "Check your inbox" confirmation state. Apple/Google shown as disabled
  "coming soon".
- Deep-link handler: `factfeed://auth-callback` completes the session and
  dismisses the modal back to the feed.
- `src/clients/trpc.ts`: attach `Authorization: Bearer <accessToken>` when
  `status === "authed"`.
- A dev-only "whoami" check (e.g. temporary `protected` ping or reuse an
  existing procedure) to confirm the token resolves to a real `userId`.

**Acceptance**

- Requesting a magic link sends the email; tapping the link opens the app,
  completes the session, dismisses the modal.
- Session persists across app restarts (AsyncStorage).
- While authed, tRPC requests carry the bearer token and the backend resolves a
  real `userId` (`apps/api/src/auth.ts`).

---

## Phase 3 — Three-card deck + gestures + coach + verdict recording

**Status:** Not Started

The heart of the app. Immersive three-card bidirectional deck built **from the
start** (previous / current / next) to avoid a 2→3 retrofit. Browse + judge.
Back-nav is read-only here (re-read a past card); *changing* a past verdict
waits for Phase 5 (needs backend Phase 4).

**Steps**

- `src/hooks/useSwipeHistory.ts`: local previous/current/next buffer over the
  loaded feed; cursor moves both directions. Retains swiped cards for the
  session so "previous" is instant (no refetch).
- `src/components/module/SwipeDeck.tsx`: three mounted cards, Reanimated shared
  values on the UI thread (ADR 0008). Gesture (gesture-handler):
  - **up** → next; if authed and the card has no prior verdict, fire
    `swipe.record({ direction: "SKIP" })`; guests just page. Never gates auth.
  - **down** → previous (from history; no network). Read-only re-read.
  - **right / left** → Keep / Pass. If `status !== "authed"` → snap back,
    present `auth.tsx`. If authed → optimistically advance + `swipe.record`.
  - **peek-behind**: next card scales `.92 → 1` during a horizontal drag.
  - thresholds / spring-back / fly-off / ±9° rotate per the design doc.
  - re-Skip on an already-skipped card is a client no-op (history knows the
    verdict); revisiting a *judged* card shows its verdict but re-swiping is a
    no-op for now (current backend is first-write-wins — safe).
- `src/components/module/GestureCoach.tsx`: first-run wiggle (left ghosted Pass,
  right ghosted Keep), dismiss on first touch, persist `hasSeenCoach`
  (AsyncStorage). Respect `prefers-reduced-motion` (stamps fade, card still).
- Replace Phase 1's temporary advance control with the deck.
- Failure of `swipe.record` after the card left screen: catch + log, no rollback
  (design doc Edge cases).

**Acceptance**

- Swipe up pages forward (Reels feel); swipe down re-reads the previous fact;
  horizontal shows the peek and Keep/Pass stamps.
- Guest horizontal swipe opens the auth modal and snaps back; backing out leaves
  the triggering card on top.
- Authed: Keep/Pass records the verdict (visible in DB / `/debug`); swipe-up
  records `SKIP` for unseen cards; skipped/judged cards don't reappear.
- First-run coach plays once, then never again.

---

## Phase 4 — Backend: editable swipes (ADR 0012)

**Status:** Not Started

Backend-only, independently mergeable, safe to merge before its consumer
(Phase 5). Makes a verdict change (Like ↔ Dislike) revise ranking exactly.

**Steps**

- `apps/api/prisma/schema.prisma`: add `Swipe.updatedAt DateTime @updatedAt`
  (migration backfills to `createdAt`).
- `apps/api/src/ranking.ts`: a reversal helper generalizing
  `nextDecayedCounters` / `nextAffinity` — given the old direction + its
  `updatedAt`, subtract its exact decayed contribution, then apply the new
  direction (formula in ADR 0012).
- `apps/api/src/server/routers/swipe.ts`: make `record` edit-aware — no existing
  row (today's path) / same direction (no-op) / different direction (reverse +
  apply, no second `seenCount++`).
- Tests (`__tests__/`): reversal is exact (edited counters == as-if-recorded-
  correctly-from-the-start), same-direction is a no-op, `SKIP` edits are inert,
  aggregate (`CategoryStats`) reversal isolates a single swipe's contribution.

**Acceptance**

- `pnpm --filter @factfeed/api exec prisma migrate dev` applies; existing rows
  backfill `updatedAt`.
- New tests pass; `pnpm --filter @factfeed/api typecheck` + `test` green.
- A second `swipe.record` with a **different** direction updates counters
  correctly; a **same** direction remains a no-op (no double count).

---

## Phase 5 — Editable verdicts on revisit (mobile)

**Status:** Not Started

Enable "change your mind." Small client change on top of Phase 3's deck, now
that the backend (Phase 4) supports it.

**Steps**

- `SwipeDeck`: allow a horizontal swipe on a **revisited, already-judged** card
  to fire `swipe.record` with the new direction (previously a no-op). Update the
  local history verdict optimistically.
- Reflect the card's current verdict in its resting stamp state so a re-judge is
  legible.
- `SKIP` still never overwrites a real verdict (client guard); only an explicit
  horizontal swipe changes it.

**Acceptance**

- Swipe down to a Kept card, swipe left → it becomes Passed; DB / `/debug` shows
  the flipped verdict and ranking reflects only the new direction (not both).
- Re-doing the same verdict is a no-op end to end.

---

## Phase 6 — Nested navigation: Settings + About

**Status:** Not Started

The navigation shell beyond the feed. Menu button → pushed stack. Content is
intentionally light (shell); the route group and entry point are the point.

**Steps**

- Header **menu button** on the immersive feed → push `(menu)` stack.
- `app/(menu)/settings.tsx`: Account (email), **Language (en/uk)** switch
  (drives `feed.list` locale + i18n), Notifications ("Soon"), About link, Sign
  out (`supabase.auth.signOut`).
- `app/(menu)/about.tsx`: app name, version, Privacy / Terms links.
- Language switch persists (AsyncStorage) and re-queries the feed for the chosen
  locale.

**Acceptance**

- Menu button pushes Settings; back returns to the feed unchanged.
- Switching en ↔ uk changes both UI strings and the feed's content locale.
- Sign out returns to guest state (feed still browsable).

---

## Done criteria

All phases `Done` → move this file to `docs/exec-plans/completed/`. At that point
`apps/mobile` ships the immersive swipe feed: guest browse, magic-link identity,
gesture-only Keep/Pass/next/previous with editable verdicts, onboarding coach,
and a Settings/About shell — consuming the existing contract plus the ADR 0012
backend change, with no other backend work.

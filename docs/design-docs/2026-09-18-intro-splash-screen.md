# Intro splash screen

**Date:** 2026-09-18
**Status:** Approved

## Problem

A user's first launch shows the default Expo splash and then the feed with no
identity. We want a short branded intro on first visit: the "FF" logo (one F
gold, one F white) written out like handwriting.

Origin: `docs/inbox/2026-07-08-animated-splash-screen.md` (triaged into this doc).

## Scope

- **In:** first-launch intro animation only.
- **Out:** a generic loading screen for auth/feed fetch. Later, if the plain
  loading state feels bad. Not needed for the intro.

## Decisions

- **Reanimated + `react-native-svg`, no Lottie.** No Lottie asset exists, and a
  stroke "write-on" is native to SVG (`strokeDashoffset`). Only
  `react-native-svg` is a new dependency (use the SDK 54 compatible version via
  `npx expo install`).
- **First visit only.** Flag in AsyncStorage (already installed), key
  `hasSeenIntro`. Set it when the animation ends, or on skip. Returning users
  never see it.
- **Handoff from the native splash.** Keep the native splash visible with
  `expo-splash-screen` (`preventAutoHideAsync`), hide it once the intro screen
  has rendered its first frame. Same background colour (`#0B0A09`) so there is
  no flash.
- **No artificial minimum duration.** The intro has a fixed length (~2s) and
  can be tapped to skip. The feed loads behind it.

## Animation sketch

1. Dark background. First F draws in white (stroke reveal, ~0.7s).
2. Second F draws in gold (~0.7s), slightly overlapping the first.
3. Short gold shimmer or glow, then fade out (~0.4s) into the feed.

Alternative to consider: fill the letters after the stroke finishes, so the
final logo is solid instead of outline.

## Component changes

- `src/components/IntroSplash.tsx` — the animation (SVG paths + Reanimated).
- `src/hooks/useHasSeenIntro.ts` — reads/writes `hasSeenIntro`.
- Root `app/_layout.tsx` — render `IntroSplash` above the routes while the
  intro is active.
- Logo paths live in a `src/constants/` file (single-stroke path data).

## Open items

- **Logo artwork.** No FF logo exists yet (`assets/icon.png` is the Expo
  placeholder). Need either the real SVG, or we hand-author a simple
  single-stroke "FF" for now and swap the path data later.
- Reduce-motion: skip the animation when the OS setting is on.
- i18n: intro has no text. If a tagline is added, it goes through `t()`.

## File impact

- New: `IntroSplash.tsx`, `useHasSeenIntro.ts`, logo path constants.
- Edit: `app/_layout.tsx`, `package.json` (`react-native-svg`, `expo-splash-screen`), `app.json` plugin config.

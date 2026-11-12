# Intro splash screen — execution plan

Design doc: `docs/design-docs/2026-09-18-intro-splash-screen.md` (Approved).

## Phase 1 — First-launch flag and native splash handoff

**Status:** Done

- Add `expo-splash-screen` (`npx expo install`) and configure the plugin in `app.json` (background `#0B0A09`).
- `src/hooks/useHasSeenIntro.ts`: read/write `hasSeenIntro` in AsyncStorage (mirrors `useHasSeenCoach`, adds `isLoaded`).
- Root `app/_layout.tsx`: call `preventAutoHideAsync`, hide the native splash once the flag is read.
- No visible change yet. Feed still shows for everyone.

## Phase 2 — Intro animation

**Status:** Done

- Add `react-native-svg` (`npx expo install`).
- `src/content/progress.content.ts`: single-stroke path data for the two F letters (hand-authored placeholder until the real SVG exists).
- `src/components/IntroSplash/`: white F draws, gold F draws (overlapping), shimmer, fade out. Reanimated + `strokeDashoffset`.
- Tap to skip. Skip entirely when reduce-motion is on.
- Calls `onFinish` when done or skipped.

## Phase 3 — Wire into the root layout

**Status:** Not Started

- `app/_layout.tsx`: when `hasSeenIntro` is false, render `IntroSplash` above the routes; on finish, set the flag and unmount it.
- Feed loads behind the intro.
- Verify on Simulator and physical Expo Go: first launch shows the intro, second launch does not, no flash between native splash and intro.
- Run `pnpm format` and `pnpm --filter @factfeed/mobile typecheck`. No tests (mobile is exempt).

## Phase 4 — Real logo (when available)

**Status:** Not Started

- Replace placeholder path data with the real FF artwork.
- Optionally update `assets/splash-icon.png` and app icon to match.

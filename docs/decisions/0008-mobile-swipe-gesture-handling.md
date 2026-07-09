# 0008. Hand-rolled swipe cards with Reanimated + Gesture Handler

**Status:** Accepted
**Date:** 2026-07-07

## Context

The core interaction is a card stack with three swipe directions — right
(like), left (dislike), down (skip). Most off-the-shelf "Tinder card" RN
libraries (`react-native-deck-swiper`, `rn-swiper-list`, etc.) only model two
directions (left/right), since they're built for dating-app UX, and each
brings its own animation approach that would have to be fought or replaced to
add a third direction.

Options:

- **Prebuilt swiper library** — fast to start, but the wrong shape (two
  directions) and typically a thin, lightly-maintained wrapper we'd end up
  patching anyway.
- **Hand-rolled with `react-native-gesture-handler` +
  `react-native-reanimated`** — both are already the Expo-recommended,
  actively maintained foundation for any gesture-driven UI in RN, and running
  the animation on the UI thread is what keeps the swipe feeling like 60fps
  instead of laggy.

## Decision

Build the card stack directly on **`react-native-gesture-handler` +
`react-native-reanimated`**. No third-party swiper package.

## Consequences

- Full control over the three-direction gesture logic and thresholds (how
  far/fast a drag counts as a commit vs. a snap-back).
- More code to write upfront than dropping in a library, but nothing to fight
  or eject from later.
- Both dependencies are needed anyway for any future gesture-heavy UI, so this
  isn't a single-purpose addition.

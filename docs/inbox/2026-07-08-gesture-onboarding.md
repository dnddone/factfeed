# Gesture onboarding demo

First-time users don't know the swipe feed's gesture vocabulary. Add an
onboarding step that demonstrates the gestures: swipe right = like, swipe
left = dislike, swipe down = next (no-op signal).

Rough shape of the idea:

- Shown once, likely on first app open (needs persisted "has seen onboarding"
  flag — local storage, since this precedes/doesn't depend on auth).
- Interactive demo (user actually performs the swipes on a mock/tutorial
  card) vs. passive animation (auto-playing arrows/animation showing each
  direction) — different build cost and effectiveness.
- Reuses the real `SwipeDeck`/gesture-handling primitives from
  [0008-mobile-swipe-gesture-handling](../decisions/0008-mobile-swipe-gesture-handling.md)
  against tutorial content, rather than a separate one-off implementation.

Open questions to resolve at design time:

- Interactive (must-complete-the-gesture) vs. passive (skippable animation)?
- Where in the startup flow does this sit relative to the
  [animated splash screen](2026-07-08-animated-splash-screen.md) and auth
  gating from
  [0009-guest-browsing-auth-gated-swipe](../decisions/0009-guest-browsing-auth-gated-swipe.md)?
- Re-triggerable later (e.g. from a settings/help menu) or strictly one-time?

Not specified yet — needs a design doc in `docs/design-docs/` before
implementation. Likely small enough to skip straight to a design doc without
a product spec, since this is a UX/polish concern rather than a new feature
with product tradeoffs.

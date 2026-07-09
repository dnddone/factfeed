# Animated splash/loading screen

While the app is fetching auth session state, initial posts, or other
blocking startup data, show an animated splash/loading screen instead of a
blank screen or a bare spinner.

Rough shape of the idea:

- Covers at least two loading phases: auth session resolution and initial
  feed fetch. Possibly others (e.g. re-auth after token refresh failure).
- Animation could be a branded loading state (logo motion, Lottie, or a
  Reanimated-driven custom animation) rather than a generic `ActivityIndicator`.
- Needs to compose cleanly with Expo Router's own splash screen
  (`expo-splash-screen`) — is this a second screen after the native splash
  hides, or an extension/replacement of it?

Open questions to resolve at design time:

- Single reusable loading screen for all async startup states, or different
  treatment per phase (session vs. posts)?
- Lottie vs. Reanimated/Skia for the animation — depends on asset source
  (does branding/design have a Lottie file, or is this built from scratch)?
- Minimum display duration to avoid a flash-of-loading-screen on fast
  networks, vs. just showing it exactly as long as the fetch takes?

Not specified yet — needs a design doc in `docs/design-docs/` before
implementation. Likely small enough to skip straight to a design doc without
a product spec, since this is a UX/polish concern rather than a new feature
with product tradeoffs.

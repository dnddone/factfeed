# 0007. Expo Router for mobile navigation

**Status:** Accepted
**Date:** 2026-07-07

## Context

`apps/mobile` needs a navigation/routing setup. The current MVP slice only has
two real states (feed, auth), but the app is expected to grow (profile,
settings, category browsing are named as deferred — not cancelled — in the
product spec), so whatever we pick now is what every future screen gets added
to.

Options:

- **Expo Router** — file-based routing, built by Expo, the current default for
  new Expo apps. Deep linking and typed routes come for free from the file
  structure.
- **React Navigation** — the older, manually-configured standard. More
  explicit, more boilerplate for the same result; Expo Router is itself built
  on top of it.

## Decision

Use **Expo Router**. It's the Expo-recommended default, gives deep linking and
typed routes without extra setup, and since it's a thin file-based layer over
React Navigation, we give up no capability by choosing it.

## Consequences

- Screens are files under `app/`; route structure is the folder structure.
- Auth gating (ADR 0009) can use Expo Router's layout/redirect conventions
  (e.g. a root layout that presents an auth modal) instead of hand-rolled
  conditional rendering.

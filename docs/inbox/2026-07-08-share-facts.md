# Share facts

Users should be able to share an individual fact outside the app (native
share sheet — Messages, WhatsApp, etc.), not just save it for themselves.
Related to [favorite-facts](2026-07-08-favorite-facts.md) but a separate
concern: sharing is about getting a fact out of the app, favoriting is about
keeping it accessible inside the app.

Rough shape of the idea:

- Share action on a fact card (tap/long-press menu, or a persistent icon —
  needs a design decision since swipe directions are already spoken for).
- Uses Expo's native share sheet (`expo-sharing` or RN `Share` API) —
  no custom UI needed for the share surface itself.
- What actually gets shared: plain text of the fact? A deep link back into
  the app to that specific fact? An image/card render of the fact
  (nicer for social, more work)?
- If sharing a deep link, need a stable per-fact URL/slug and a route that
  can load a single fact by id — doesn't exist yet, feed is swipe-driven
  with no addressable single-fact view.
- Possible engagement signal: track share count per fact for ranking,
  similar to how likes factor into the wilson score.

Open questions to resolve at design time:

- Text-only share vs. rendered image card (image is nicer but needs a
  render pipeline, e.g. `react-native-view-shot`).
- Does a shared link need to work for a logged-out recipient (implies a
  public single-fact endpoint)?
- Should shares count toward ranking/engagement, or stay a pure UX feature?

Not specified yet — needs a design doc in `docs/design-docs/` before
implementation.

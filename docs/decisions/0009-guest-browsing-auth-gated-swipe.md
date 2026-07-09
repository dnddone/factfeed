# 0009. Guest browsing, auth-gated swiping

**Status:** Accepted
**Date:** 2026-07-07

## Context

The product spec requires guests to browse without a signup wall, but a swipe
verdict (`swipe.record`) is only meaningful if it's attributable to a real,
durable user — it feeds the ranking system (ADR 0005) and any future
personalization. A verdict recorded against a throwaway/anonymous identity
would be lost on reinstall and can't later be reattached to a real account.

Options:

- **Gate at launch** — require sign-in before showing the feed at all.
  Rejected: kills the "swipe within seconds" success criterion in the product
  spec and adds friction before the user has seen any value.
- **Allow guest swipes, queue locally, merge after later sign-in** — the best
  end-state UX, but real complexity (local persistence, merge/conflict
  handling on sign-in) for a first slice. Deferred — revisit if the simpler
  gate below shows high drop-off.
- **Gate at the swipe action** — browsing stays open; the first swipe gesture
  is intercepted before it commits.

## Decision

Guests can call `feed.list` and browse freely. The **swipe gesture itself is
the gate**: on release, if there's no authenticated session, the card snaps
back instead of completing and a sign-in/sign-up screen is shown. Once
authenticated, swipes commit and call `swipe.record` normally.

## Consequences

- `swipe.record` never needs to handle an anonymous/guest identity — every
  call it receives is already from a real authenticated user. No change to
  the swipe contract.
- `feed.list` for a guest has no `userId` to filter "already seen" against —
  it serves the ranked feed without unseen-filtering until the user
  authenticates. Acceptable: a guest hasn't swiped anything yet by
  definition.
- Pulls backend Phase 7 (Supabase Auth — currently "later" in
  `docs/exec-plans/active/2026-07-03-backend-mvp.md`) forward: real auth is
  now required for this mobile slice to be useful at all, not a Phase 7
  nice-to-have. The backend exec plan should be revisited alongside this.
- No queueing/merge complexity for guest swipes (rejected option above) — a
  guest who declines to sign in simply doesn't get that swipe recorded.

# Mobile Swipe Feed — Product Spec

**Date:** 2026-07-07
**Status:** Draft

## Who this is for

Anyone who wants a quick, low-effort stream of interesting facts — the
Reels/TikTok/Tinder audience applied to trivia. Two states of the same user:

- **Guest** — opens the app and starts swiping immediately, no signup wall.
- **Signed-in** — has an account, so likes/dislikes persist and feed the
  ranking system (ADR 0005) and any future personalization.

## Problem

The backend (feed ranking, swipe recording, generation) is designed and being
built (`docs/design-docs/2026-07-03-backend-architecture.md`), but nothing
consumes it yet — `apps/mobile` doesn't exist. This spec scopes the first
slice of it.

## What success looks like

- A new user can open the app and start swiping facts within seconds — no
  forced signup before seeing value.
- A swipe verdict (like/dislike) is never silently lost: it's either recorded
  against a real account, or the user is asked to create one before it counts.
- The existing backend contract (`feed.list`, `swipe.record`) is consumed
  as-is — no backend contract changes required for this slice.

## In scope

- Single-screen swipe feed: card stack, swipe right/left/down gestures.
- Guest browsing — view the feed with no account.
- Auth-gated swiping — recording a verdict requires a signed-in user, since a
  verdict is only meaningful if it's attributable to a durable identity (it
  persists across reinstalls/devices and is what the ranking system, and any
  future personalization, is built on). Swiping is what triggers the auth
  prompt, not app launch.
- Minimal sign-in/sign-up (Supabase Auth, per ADR 0003).

## Out of scope (this slice)

- Profile / settings screen.
- Category browsing or filters.
- Push notifications, sharing, monetization.
- Onboarding tutorial / first-run walkthrough.
- Preserving a guest's pre-auth swipe (queue + merge after sign-in) — the
  first swipe just prompts auth; nothing is queued. Revisit if drop-off at
  that gate turns out to be high.

## Open questions

- Auth method(s): email/password, magic link, or social (Apple/Google)? Note
  Apple requires offering Sign in with Apple if any other social login is
  offered, on iOS (App Store Review Guideline 4.8). Left open for the design
  doc / a follow-up ADR.
- Backend `exec-plans` currently schedules Supabase Auth as Phase 7
  ("later"). This spec needs it much earlier. See the design doc for the
  resequencing implication.

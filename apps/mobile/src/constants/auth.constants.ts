/**
 * Path segment for the Supabase magic-link redirect, passed to
 * `Linking.createURL` (see `@/utils/auth-callback`) rather than hardcoded as
 * a `factfeed://` URL — custom schemes don't resolve inside Expo Go. The
 * resulting URL(s) must be added as Redirect URLs in the Supabase dashboard
 * (Authentication → URL Configuration) — see
 * `docs/exec-plans/active/2026-07-20-mobile-swipe-feed.md`.
 */
export const AUTH_CALLBACK_PATH = "auth-callback";

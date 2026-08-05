# Running `apps/mobile` on a physical device (Expo Go)

Operational procedure for connecting a physical phone to the local Expo
dev server, and specifically for getting Supabase magic-link sign-in to
work — the default setup silently breaks it.

## Prerequisite: API base URL

`EXPO_PUBLIC_API_URL` in `apps/mobile/.env` must be your Mac's LAN IP
(`ifconfig | grep "inet " | grep -v 127.0.0.1`), not `localhost` —
`localhost` on a physical device resolves to the phone itself, not your
Mac. This applies to every mode below; only the iOS Simulator can use
`localhost` (it shares the host Mac's network namespace).

This IP changes on Wi-Fi reconnects — if `useFeed`/tRPC calls start
failing with a network error after previously working, check this value
first before anything else.

## Three ways to start the dev server

Pick based on whether the session needs magic-link sign-in to work.

### 1. Default (LAN) — no magic-link auth

```bash
pnpm --filter @factfeed/mobile start
```

Advertises `exp://<mac-lan-ip>:8081` to Expo Go. Fine for everything
except signing in.

**Why sign-in breaks here:** Supabase Auth (GoTrue) has a bug where it
rejects any `redirect_to` whose host is a raw IP address, even when the
exact URL — or an `exp://**` wildcard — is present in the Redirect URLs
allow-list. The request still succeeds (200), the email still sends, but
`redirect_to` in the email silently falls back to the Supabase project's
Site URL instead of the app's callback URL, so tapping the email link
does nothing useful. Open, unfixed upstream as of writing:
[supabase/auth#2039](https://github.com/supabase/auth/issues/2039).

### 2. `.local` hostname — magic-link auth testing (preferred)

```bash
EXPO_PACKAGER_PROXY_URL=http://$(scutil --get LocalHostName).local:8081 \
  pnpm --filter @factfeed/mobile start
```

Overrides the hostname Metro advertises to the Mac's Bonjour/mDNS name
(e.g. `npmjke.local`) instead of its LAN IP. Not a dotted-decimal IP, so
it doesn't trip the GoTrue guard above, and resolves fine over the same
Wi-Fi via mDNS (built into iOS) — no tunnel needed.

**One-time Supabase setup:** add `exp://**` to Authentication → URL
Configuration → Redirect URLs (as well as `factfeed://auth-callback`, for
whenever a standalone/dev-client build is tested instead of Expo Go).
Because the pattern is a wildcard, this entry never needs updating when
the Mac's LAN IP changes.

**Note:** `EXPO_PACKAGER_PROXY_URL` is Metro's own env var, not one of
the app's `EXPO_PUBLIC_*` vars — it is not read from `.env` and must be
set on the command line each session. Run the command as written above
(don't paste it into `.env` — it's a shell prefix, not a variable
assignment for dotenv).

### 3. Tunnel — fallback if `.local` doesn't resolve on your network

```bash
pnpm --filter @factfeed/mobile start --tunnel
```

Routes through ngrok instead of the LAN; also produces a non-IP hostname,
so the same `exp://**` allow-list entry covers it. Known to be flaky in
practice — `@expo/ngrok` has intermittently failed with `remote gone
away` or a `Cannot read properties of undefined (reading 'body')` crash.
That's an ngrok-side/library issue, not a project config problem; retry,
or fall back to mode 2 above.

## Troubleshooting checklist

If a magic-link email arrives with `redirect_to` pointing at the
Supabase project's Site URL instead of the app's callback:

1. Confirm which mode started the dev server — mode 1 above always does
   this; it's not a bug to chase further, switch to mode 2 or 3.
2. Confirm `exp://**` is actually saved in Supabase's Redirect URLs list
   (Authentication → URL Configuration → Redirect URLs) — check for a
   `Reloading api with new configuration` line in Supabase's Auth Logs
   right after saving, confirming the change actually applied.
3. If using mode 2/3 and it's still falling back, check Supabase's Auth
   Logs (dashboard → Logs → Auth Logs) for the `POST /otp` request —
   these logs confirm the API request was accepted, but do **not** show
   downstream SMTP delivery outcomes; a missing email with an accepted
   request points at the email provider, not the redirect config.
4. Double-check the recipient email address for typos before assuming
   anything is broken — a typo'd address is treated as an unknown user
   (a "confirm your email" signup email instead of a magic link) and may
   bounce silently instead of erroring visibly in the app.

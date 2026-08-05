import * as Linking from "expo-linking";

import { AUTH_CALLBACK_PATH } from "@/constants/auth.constants";

export type AuthCallbackTokens = {
  accessToken: string;
  refreshToken: string;
};

/**
 * Custom URL schemes (`factfeed://...`) only resolve in a standalone or
 * dev-client build — Expo Go has no app registered for them, so tapping the
 * magic-link email does nothing. `Linking.createURL` returns the
 * environment-correct redirect instead: `exp://<lan-ip>:8081/--/auth-callback`
 * under Expo Go, `factfeed://auth-callback` in a real build. Call this
 * fresh each time rather than caching the result — the LAN IP can change
 * between sending the email and opening it.
 */
export const getAuthCallbackUrl = (): string =>
  Linking.createURL(AUTH_CALLBACK_PATH);

/**
 * Supabase's magic-link redirect appends session tokens as a URL fragment
 * (implicit flow default, e.g.
 * `factfeed://auth-callback#access_token=...&refresh_token=...`), not a query
 * string — `detectSessionInUrl` is off (no browser URL bar on RN), so this
 * parses the fragment manually instead of relying on the SDK to auto-detect it.
 */
export const parseAuthCallbackTokens = (
  url: string,
): AuthCallbackTokens | null => {
  const fragment = url.split("#")[1];

  if (!fragment) {
    return null;
  }

  const params = new URLSearchParams(fragment);
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return { accessToken, refreshToken };
};

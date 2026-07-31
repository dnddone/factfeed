export type AuthCallbackTokens = {
  accessToken: string;
  refreshToken: string;
};

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

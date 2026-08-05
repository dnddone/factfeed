import { useEffect } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";

import { supabase } from "@/clients/supabase";
import {
  getAuthCallbackUrl,
  parseAuthCallbackTokens,
} from "@/utils/auth-callback";

const completeSessionFromUrl = async (url: string) => {
  if (!url.startsWith(getAuthCallbackUrl())) {
    return;
  }

  const tokens = parseAuthCallbackTokens(url);

  if (!tokens) {
    console.error(
      "useAuthCallbackListener: auth-callback URL had no tokens",
      url,
    );
    return;
  }

  const { error } = await supabase.auth.setSession({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  if (error) {
    console.error("useAuthCallbackListener: failed to set session", error);
    return;
  }

  router.dismissTo("/");
};

/**
 * Global listener for the magic-link redirect (see `getAuthCallbackUrl`).
 * Mounted once at the app root so it catches the link whether the app was
 * cold-started by it (`getInitialURL`) or already running in the background
 * (the `url` event).
 */
export const useAuthCallbackListener = (): void => {
  useEffect(() => {
    const run = async () => {
      const initialUrl = await Linking.getInitialURL();

      if (initialUrl) {
        await completeSessionFromUrl(initialUrl);
      }
    };

    run();

    const subscription = Linking.addEventListener("url", ({ url }) => {
      completeSessionFromUrl(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);
};

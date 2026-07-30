import { AppState } from "react-native";
import type { AppRouter } from "@factfeed/api/src/server/routers/_app";
import NetInfo from "@react-native-community/netinfo";
import {
  focusManager,
  onlineManager,
  QueryClient,
} from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    "Missing EXPO_PUBLIC_API_URL — copy apps/mobile/.env.example to .env and fill in the value.",
  );
}

/**
 * React Query's browser-only defaults (`refetchOnWindowFocus`, the online
 * check via `navigator.onLine`) don't apply on RN — there's no `window`.
 * Wire the RN equivalents once, here, instead.
 */
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(Boolean(state.isConnected))),
);

AppState.addEventListener("change", (status) => {
  focusManager.setFocused(status === "active");
});

export const queryClient = new QueryClient();

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${apiUrl}/api/trpc`,
      /**
       * Bearer token attach lands in Phase 2 once session state exists.
       */
      headers: () => ({}),
    }),
  ],
});

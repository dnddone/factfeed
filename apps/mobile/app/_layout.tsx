import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { I18nextProvider } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { APP_BACKGROUND_COLOR } from "@/constants/theme.constants";
import { i18next } from "@/clients/i18n";
import { queryClient, trpc, trpcClient } from "@/clients/trpc";
import { useAuthCallbackListener } from "@/hooks/useAuthCallbackListener";
import { SessionProvider } from "@/providers/session-provider";

import "../global.css";

/**
 * Root layout. The feed is immersive, so the native header is hidden and the
 * app commits to a dark canvas (design doc: dark-first).
 */
const RootLayout: React.FC = () => {
  useAuthCallbackListener();

  return (
    /**
     * GestureHandlerRootView isn't NativeWind-interop'd, so it takes a plain
     * style prop rather than `className`, unlike the RN primitives below it.
     */
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SessionProvider>
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
          <QueryClientProvider client={queryClient}>
            <I18nextProvider i18n={i18next}>
              <SafeAreaProvider>
                <StatusBar style="light" />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: APP_BACKGROUND_COLOR },
                  }}
                >
                  <Stack.Screen
                    name="auth"
                    options={{ presentation: "modal" }}
                  />
                </Stack>
              </SafeAreaProvider>
            </I18nextProvider>
          </QueryClientProvider>
        </trpc.Provider>
      </SessionProvider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;

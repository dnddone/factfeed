import "../global.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { I18nextProvider } from "react-i18next";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { i18next } from "@/clients/i18n";
import { queryClient, trpc, trpcClient } from "@/clients/trpc";

/**
 * Root layout. The feed is immersive, so the native header is hidden and the
 * app commits to a dark canvas (design doc: dark-first). `SessionProvider`
 * mounts here too once auth lands (Phase 2).
 */
const RootLayout: React.FC = () => {
  return (
    /**
     * GestureHandlerRootView isn't NativeWind-interop'd, so it takes a plain
     * style prop rather than `className`, unlike the RN primitives below it.
     */
    <GestureHandlerRootView style={{ flex: 1 }}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18next}>
            <SafeAreaProvider>
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: "#0B0A09" },
                }}
              />
            </SafeAreaProvider>
          </I18nextProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </GestureHandlerRootView>
  );
};

export default RootLayout;

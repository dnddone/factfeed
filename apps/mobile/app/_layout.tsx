import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

/**
 * Root layout. The feed is immersive, so the native header is hidden and the
 * app commits to a dark canvas (design doc: dark-first). Providers for session,
 * tRPC/React Query, and i18n mount here in later phases.
 */
const RootLayout: React.FC = () => {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0B0A09" },
        }}
      />
    </SafeAreaProvider>
  );
};

export default RootLayout;

import React from "react";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

import { APP_BACKGROUND_COLOR, CREAM_COLOR } from "@/constants/theme.constants";

/**
 * Pushed stack for Settings/About (design doc "Screens & navigation"). Owns
 * its own headers — the root `Stack` hides headers everywhere for the
 * immersive feed, so this nested navigator opts back in.
 */
const MenuLayout: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: APP_BACKGROUND_COLOR },
        headerTintColor: CREAM_COLOR,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: APP_BACKGROUND_COLOR },
      }}
    >
      <Stack.Screen name="settings" options={{ title: t("Settings") }} />
      <Stack.Screen name="about" options={{ title: t("About") }} />
    </Stack>
  );
};

export default MenuLayout;

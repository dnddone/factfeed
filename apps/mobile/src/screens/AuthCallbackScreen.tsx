import React from "react";
import { Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { APP_BACKGROUND_COLOR } from "@/constants/theme.constants";

/**
 * Landing screen for the auth-callback deep link (see `getAuthCallbackUrl`).
 * The actual session exchange happens in `useAuthCallbackListener` (mounted
 * at the app root); this screen only exists so Expo Router has somewhere to
 * land while that resolves, instead of flashing an unmatched-route screen.
 */
export const AuthCallbackScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ backgroundColor: APP_BACKGROUND_COLOR }}
    >
      <Text className="font-mono text-xs uppercase tracking-widest text-cream opacity-60">
        {t("Signing in")}
      </Text>
    </View>
  );
};

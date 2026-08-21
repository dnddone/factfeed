import React from "react";
import { Text, View } from "react-native";
import Constants from "expo-constants";
import { useTranslation } from "react-i18next";

import { APP_BACKGROUND_COLOR } from "@/constants/theme.constants";

/**
 * About shell (Phase 6): app identity, version, and placeholder legal links
 * (no Privacy/Terms pages exist yet — "Soon", same pattern as the disabled
 * Apple/Google buttons on `AuthScreen`).
 */
export const AboutScreen: React.FC = () => {
  const { t } = useTranslation();
  const appName = Constants.expoConfig?.name ?? "factfeed";
  const version = Constants.expoConfig?.version ?? "0.0.0";

  return (
    <View
      className="flex-1 gap-8 px-6 pt-8"
      style={{ backgroundColor: APP_BACKGROUND_COLOR }}
    >
      <View className="gap-1">
        <Text className="text-xl font-semibold tracking-tight text-cream">
          {appName}
        </Text>
        <Text className="text-sm text-cream opacity-50">
          {t("Version")} {version}
        </Text>
      </View>

      <View className="gap-2">
        <Text className="text-base text-cream opacity-40">
          {t("Privacy Policy")} · {t("Soon")}
        </Text>
        <Text className="text-base text-cream opacity-40">
          {t("Terms of Service")} · {t("Soon")}
        </Text>
      </View>
    </View>
  );
};

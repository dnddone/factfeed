import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { type Locale, LOCALES } from "@factfeed/contract";

import { APP_BACKGROUND_COLOR } from "@/constants/theme.constants";
import { supabase } from "@/clients/supabase";
import { cn } from "@/utils/tailwind";
import { useLocaleContext } from "@/providers/LocaleProvider";
import { useSessionContext } from "@/providers/SessionProvider";

/**
 * Needs for i18next-scanner
 * t('EN')
 * t('UK')
 */
const LOCALE_LABEL_KEYS: Record<Locale, string> = {
  en: "EN",
  uk: "UK",
};

/**
 * Settings shell (Phase 6): Account, the en/uk locale switch the contract
 * already supports, a "Soon" Notifications placeholder, and About/Sign out.
 */
export const SettingsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { status, email } = useSessionContext();
  const { locale, setLocale } = useLocaleContext();

  return (
    <View
      className="flex-1 gap-8 px-6 pt-8"
      style={{ backgroundColor: APP_BACKGROUND_COLOR }}
    >
      <View className="gap-2">
        <Text className="font-mono text-xs uppercase tracking-widest text-cream opacity-50">
          {t("Account")}
        </Text>
        {status === "authed" ? (
          <Text className="text-base text-cream">{email}</Text>
        ) : (
          <Pressable onPress={() => router.push("/auth")}>
            <Text className="text-base text-cream underline">
              {t("Sign in")}
            </Text>
          </Pressable>
        )}
      </View>

      <View className="gap-2">
        <Text className="font-mono text-xs uppercase tracking-widest text-cream opacity-50">
          {t("Language")}
        </Text>
        <View className="flex-row gap-2">
          {LOCALES.map((option) => (
            <Pressable
              key={option}
              onPress={() => setLocale(option)}
              className={cn(
                "rounded-lg border border-cream/20 px-4 py-2",
                option === locale && "bg-cream",
              )}
            >
              <Text
                className={cn(
                  "font-mono text-xs uppercase tracking-widest text-cream",
                  option === locale && "text-[#0B0A09]",
                )}
              >
                {t(LOCALE_LABEL_KEYS[option])}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="font-mono text-xs uppercase tracking-widest text-cream opacity-50">
          {t("Notifications")}
        </Text>
        <Text className="text-base text-cream opacity-40">{t("Soon")}</Text>
      </View>

      <Pressable onPress={() => router.push("/about")}>
        <Text className="text-base text-cream">{t("About")}</Text>
      </Pressable>

      {status === "authed" && (
        <Pressable
          onPress={() => supabase.auth.signOut()}
          className="mt-auto mb-8"
        >
          <Text className="text-base text-cream opacity-70">
            {t("Sign out")}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

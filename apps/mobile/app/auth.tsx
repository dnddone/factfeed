import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";

import { APP_BACKGROUND_COLOR } from "@/constants/theme.constants";
import { useMagicLinkSignIn } from "@/hooks/useMagicLinkSignIn";

/**
 * Magic-link sign-in modal (ADR 0009: the swipe gesture is the auth gate, not
 * app launch). Apple/Google are shown disabled — "coming soon" — until those
 * providers are wired up.
 */
const AuthScreen: React.FC = () => {
  const { t } = useTranslation();
  const { email, setEmail, status, sendMagicLink } = useMagicLinkSignIn();

  const canSend = status === "idle" && email.includes("@");

  return (
    <View
      className="flex-1 justify-center gap-6 px-8"
      style={{ backgroundColor: APP_BACKGROUND_COLOR }}
    >
      {status === "sent" ? (
        <>
          <Text className="text-xl font-semibold tracking-tight text-[#F7F1E7]">
            {t("Check your inbox")}
          </Text>
          <Text className="text-sm text-[#F7F1E7] opacity-60">
            {t("We sent a sign-in link to")} {email}
          </Text>
        </>
      ) : (
        <>
          <Text className="text-xl font-semibold tracking-tight text-[#F7F1E7]">
            {t("Sign in to keep swiping")}
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t("Email")}
            placeholderTextColor="rgba(247,241,231,0.4)"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            className="rounded-lg border border-[#F7F1E7]/20 px-4 py-3 text-[#F7F1E7]"
          />
          <Pressable
            disabled={!canSend}
            onPress={sendMagicLink}
            className="rounded-lg bg-[#F7F1E7] px-4 py-3"
            style={{ opacity: canSend ? 1 : 0.4 }}
          >
            <Text className="text-center font-semibold text-[#0B0A09]">
              {status === "sending" ? t("Sending…") : t("Send magic link")}
            </Text>
          </Pressable>
          <View className="gap-3">
            <Pressable
              disabled
              className="rounded-lg border border-[#F7F1E7]/10 px-4 py-3"
            >
              <Text className="text-center text-[#F7F1E7] opacity-40">
                {t("Continue with Apple — coming soon")}
              </Text>
            </Pressable>
            <Pressable
              disabled
              className="rounded-lg border border-[#F7F1E7]/10 px-4 py-3"
            >
              <Text className="text-center text-[#F7F1E7] opacity-40">
                {t("Continue with Google — coming soon")}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
};

export default AuthScreen;

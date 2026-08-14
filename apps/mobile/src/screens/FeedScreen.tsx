import React from "react";
import { Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HAS_SEEN_COACH_STORAGE_KEY } from "@/constants/storage.constants";
import { APP_BACKGROUND_COLOR } from "@/constants/theme.constants";
import { trpc } from "@/clients/trpc";
import { useSessionContext } from "@/providers/session-provider";

import { SwipeDeck } from "@/components/SwipeDeck";

/**
 * Immersive gesture-only feed (Phase 3). The top-right "Sign in" affordance
 * and dev-only uid readout are a manual entry point alongside the swipe
 * gate — the deck's horizontal swipe is the primary auth trigger (ADR 0009).
 */
export const FeedScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { status } = useSessionContext();
  const whoami = trpc.auth.whoami.useQuery(undefined, {
    enabled: __DEV__ && status === "authed",
  });

  return (
    <View className="flex-1" style={{ backgroundColor: APP_BACKGROUND_COLOR }}>
      {status === "guest" && (
        <Pressable
          onPress={() => router.push("/auth")}
          className="absolute right-6 z-10"
          style={{ top: insets.top + 12 }}
        >
          <Text className="font-mono text-xs uppercase tracking-widest text-cream opacity-70">
            {t("Sign in")}
          </Text>
        </Pressable>
      )}
      {__DEV__ && whoami.data && (
        <View
          className="absolute right-6 z-10"
          style={{ top: insets.top + 12 }}
        >
          <Text className="font-mono text-[10px] text-cream opacity-50">
            uid: {whoami.data.userId}
          </Text>
        </View>
      )}
      {__DEV__ && (
        <Pressable
          onPress={() => AsyncStorage.removeItem(HAS_SEEN_COACH_STORAGE_KEY)}
          className="absolute left-6 z-10"
          style={{ top: insets.top + 12 }}
        >
          <Text className="font-mono text-[10px] text-cream opacity-50">
            {t("Reset coach")}
          </Text>
        </Pressable>
      )}
      <SwipeDeck />
    </View>
  );
};

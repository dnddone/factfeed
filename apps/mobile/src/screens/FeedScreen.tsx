import React from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { APP_BACKGROUND_COLOR } from "@/constants/theme.constants";
import { trpc } from "@/clients/trpc";
import { useFeed } from "@/hooks/useFeed";
import { useSessionContext } from "@/providers/session-provider";

import { FactCard } from "@/components/FactCard";

/**
 * Guest feed read (Phase 1). A single card with a temporary tap-to-advance
 * control — the gesture deck replaces this control in Phase 3. The top-right
 * "Sign in" affordance and dev-only uid readout are likewise temporary —
 * Phase 3's swipe gesture becomes the real auth gate (ADR 0009).
 */
export const FeedScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentPost, isLoading, isEmpty, next } = useFeed();
  const { status } = useSessionContext();
  const whoami = trpc.auth.whoami.useQuery(undefined, {
    enabled: __DEV__ && status === "authed",
  });

  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center">
          <Text className="font-mono text-xs uppercase tracking-widest text-cream opacity-60">
            {t("Loading")}
          </Text>
        </View>
      );
    }

    if (isEmpty || !currentPost) {
      return (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-xl font-semibold tracking-tight text-cream">
            {t("You're all caught up")}
          </Text>
          <Text className="text-center text-sm text-cream opacity-60">
            {t("New facts are brewing. Check back in a bit.")}
          </Text>
        </View>
      );
    }

    return (
      <Pressable className="flex-1" onPress={next}>
        <FactCard post={currentPost} />
      </Pressable>
    );
  };

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
      {renderContent()}
    </View>
  );
};

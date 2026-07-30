import React from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

import { APP_BACKGROUND_COLOR } from "@/constants/theme.constants";
import { useFeed } from "@/hooks/useFeed";

import { FactCard } from "@/components/module/FactCard";

/**
 * Guest feed read (Phase 1). A single card with a temporary tap-to-advance
 * control — the gesture deck replaces this control in Phase 3.
 */
const FeedScreen: React.FC = () => {
  const { t } = useTranslation();
  const { currentPost, isLoading, isEmpty, next } = useFeed();

  return (
    <View className="flex-1" style={{ backgroundColor: APP_BACKGROUND_COLOR }}>
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="font-mono text-xs uppercase tracking-widest text-[#F7F1E7] opacity-60">
            {t("Loading")}
          </Text>
        </View>
      ) : isEmpty || !currentPost ? (
        <View className="flex-1 items-center justify-center gap-4 px-8">
          <Text className="text-xl font-semibold tracking-tight text-[#F7F1E7]">
            {t("You're all caught up")}
          </Text>
          <Text className="text-center text-sm text-[#F7F1E7] opacity-60">
            {t("New facts are brewing. Check back in a bit.")}
          </Text>
        </View>
      ) : (
        <Pressable className="flex-1" onPress={next}>
          <FactCard post={currentPost} />
        </Pressable>
      )}
    </View>
  );
};

export default FeedScreen;

import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { APP_BACKGROUND_COLOR } from "@/constants/theme.constants";

/**
 * Placeholder feed screen. The immersive swipe deck replaces this in the feed
 * phase; for now it verifies the app boots and the dark canvas renders. The
 * "factfeed" wordmark is the brand mark, not UI copy — it stays literal
 * across locales, unlike the tagline below it.
 */
const FeedScreen: React.FC = () => {
  const { t } = useTranslation();

  return (
    <View style={styles.screen}>
      <Text style={styles.wordmark}>
        fact<Text style={styles.accent}>feed</Text>
      </Text>
      <Text style={styles.tagline}>{t("feed.tagline")}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: APP_BACKGROUND_COLOR,
    gap: 10,
  },
  wordmark: {
    color: "#F7F1E7",
    fontSize: 30,
    fontWeight: "600",
    letterSpacing: -0.5,
  },
  accent: {
    color: "#E9A23B",
  },
  tagline: {
    color: "rgba(247,241,231,0.52)",
    fontSize: 14,
    fontFamily: "monospace",
  },
});

export default FeedScreen;

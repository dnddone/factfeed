import React from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * Placeholder feed screen. The immersive swipe deck replaces this in the feed
 * phase; for now it verifies the app boots and the dark canvas renders.
 */
const FeedScreen: React.FC = () => {
  return (
    <View style={styles.screen}>
      <Text style={styles.wordmark}>
        fact<Text style={styles.accent}>feed</Text>
      </Text>
      <Text style={styles.tagline}>a quiet stream of facts</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0B0A09",
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

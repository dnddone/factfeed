import { useEffect } from "react";
import { Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TOAST_TRANSITION_MS = 220;
const TOAST_OFFSCREEN_TRANSLATE_Y = 24;

type Props = {
  visible: boolean;
  onPress: () => void;
};

/**
 * Non-blocking stand-in for the sign-in modal when a guest swipes Keep/Pass
 * (ADR 0009's gate stays the same — only the prompt's presentation changed
 * to stop covering the card and forcing a dismiss). Stays up across repeat
 * swipe attempts instead of auto-dismissing; tapping it opens `/auth`.
 */
export const AuthToast: React.FC<Props> = ({ visible, onPress }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: TOAST_TRANSITION_MS,
    });
  }, [visible, progress]);

  const toastStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: (1 - progress.value) * TOAST_OFFSCREEN_TRANSLATE_Y,
      },
    ],
  }));

  return (
    <Animated.View
      className="absolute inset-x-6 z-10"
      style={[{ bottom: insets.bottom + 20 }, toastStyle]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center justify-center gap-2 rounded-full bg-cream/95 px-5 py-3"
      >
        <Ionicons name="log-in-outline" size={16} color="#0B0A09" />
        <Text className="font-mono text-xs uppercase tracking-widest text-[#0B0A09]">
          {t("Sign in to keep swiping")}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

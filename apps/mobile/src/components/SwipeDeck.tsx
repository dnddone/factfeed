import { useCallback } from "react";
import { Text, useWindowDimensions, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import type { SwipeDirection } from "@factfeed/contract";

import {
  AXIS_LOCK_DEADZONE,
  CARD_SHRINK_SCALE,
  COMMIT_VELOCITY,
  FLY_OFF_DURATION_MS,
  HORIZONTAL_COMMIT_THRESHOLD,
  MAX_CARD_RADIUS,
  MAX_ROTATION_DEG,
  PEEK_SCALE_SETTLED,
  PEEK_SCALE_START,
  STAMP_BADGE_SIZE,
  STAMP_ICON_SIZE,
  SWIPE_SPRING_CONFIG,
  VERTICAL_COMMIT_THRESHOLD,
} from "@/constants/swipe-deck.constants";
import { APP_BACKGROUND_COLOR } from "@/constants/theme.constants";
import { trpc } from "@/clients/trpc";
import { useHasSeenCoach } from "@/hooks/useHasSeenCoach";
import { useSwipeHistory } from "@/hooks/useSwipeHistory";
import { useSessionContext } from "@/providers/session-provider";

import { FactCard } from "@/components/FactCard";
import { GestureCoach } from "@/components/GestureCoach";

/**
 * Three-card bidirectional deck: previous/current/next mounted together
 * (design doc "Interaction model"), a single gesture-handler `Pan` on the
 * current card drives all four directions. Horizontal past threshold
 * records Keep/Pass (gated on auth) and flies the card off, revealing the
 * peeking next card. Vertical up/down pages the loaded history without a
 * peek — the adjacent card rises/falls full-screen instead.
 */
export const SwipeDeck: React.FC = () => {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const { status } = useSessionContext();
  const {
    previous,
    current,
    next,
    isLoading,
    isEmpty,
    advance,
    retreat,
    setVerdict,
  } = useSwipeHistory();
  const { hasSeenCoach, markSeen } = useHasSeenCoach();
  const recordSwipe = trpc.swipe.record.useMutation();

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const passStampOverrideOpacity = useSharedValue(0);
  const keepStampOverrideOpacity = useSharedValue(0);
  const lockedAxis = useSharedValue<"none" | "horizontal" | "vertical">("none");

  const recordVerdict = useCallback(
    (postId: string, direction: SwipeDirection) => {
      recordSwipe.mutate(
        { postId, direction },
        {
          onError: (error) => {
            console.error("SwipeDeck: failed to record swipe", error);
          },
        },
      );
    },
    [recordSwipe],
  );

  const presentAuthGate = useCallback(() => {
    router.push("/auth");
  }, []);

  const resetPosition = useCallback(() => {
    translateX.value = 0;
    translateY.value = 0;
  }, [translateX, translateY]);

  const commitKeepPass = useCallback(
    (direction: SwipeDirection) => {
      if (!current) {
        return;
      }
      recordVerdict(current.post.id, direction);
      setVerdict(direction);
      advance();
      resetPosition();
    },
    [current, recordVerdict, setVerdict, advance, resetPosition],
  );

  const commitNext = useCallback(() => {
    if (!current) {
      return;
    }
    if (status === "authed" && !current.verdict) {
      recordVerdict(current.post.id, "SKIP");
      setVerdict("SKIP");
    }
    advance();
    resetPosition();
  }, [current, status, recordVerdict, setVerdict, advance, resetPosition]);

  const commitPrevious = useCallback(() => {
    retreat();
    resetPosition();
  }, [retreat, resetPosition]);

  const markCoachSeen = useCallback(() => {
    if (!hasSeenCoach) {
      markSeen();
    }
  }, [hasSeenCoach, markSeen]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(passStampOverrideOpacity);
      cancelAnimation(keepStampOverrideOpacity);
      translateX.value = 0;
      translateY.value = 0;
      passStampOverrideOpacity.value = 0;
      keepStampOverrideOpacity.value = 0;
      lockedAxis.value = "none";
      runOnJS(markCoachSeen)();
    })
    .onUpdate((event) => {
      if (lockedAxis.value === "none") {
        const distance = Math.max(
          Math.abs(event.translationX),
          Math.abs(event.translationY),
        );

        if (distance > AXIS_LOCK_DEADZONE) {
          const isHorizontal =
            Math.abs(event.translationX) >= Math.abs(event.translationY);
          lockedAxis.value = isHorizontal ? "horizontal" : "vertical";
          if (isHorizontal) {
            translateY.value = 0;
          } else {
            translateX.value = 0;
          }
        }
      }

      if (lockedAxis.value !== "vertical") {
        translateX.value = event.translationX;
      }
      if (lockedAxis.value !== "horizontal") {
        translateY.value = event.translationY;
      }
    })
    .onEnd((event) => {
      if (lockedAxis.value === "none") {
        translateX.value = withSpring(0, SWIPE_SPRING_CONFIG);
        translateY.value = withSpring(0, SWIPE_SPRING_CONFIG);
        return;
      }

      if (lockedAxis.value === "horizontal") {
        const committed =
          Math.abs(event.translationX) > width * HORIZONTAL_COMMIT_THRESHOLD ||
          Math.abs(event.velocityX) > COMMIT_VELOCITY;

        if (!committed) {
          translateX.value = withSpring(0, SWIPE_SPRING_CONFIG);
          translateY.value = withSpring(0, SWIPE_SPRING_CONFIG);
          return;
        }

        if (status !== "authed") {
          translateX.value = withSpring(0, SWIPE_SPRING_CONFIG);
          translateY.value = withSpring(0, SWIPE_SPRING_CONFIG);
          runOnJS(presentAuthGate)();
          return;
        }

        const direction: SwipeDirection =
          event.translationX > 0 ? "LIKE" : "DISLIKE";
        const targetX = event.translationX > 0 ? width * 1.5 : -width * 1.5;

        translateX.value = withTiming(
          targetX,
          { duration: FLY_OFF_DURATION_MS },
          (finished) => {
            if (finished) {
              runOnJS(commitKeepPass)(direction);
            }
          },
        );
        return;
      }

      const committed =
        Math.abs(event.translationY) > height * VERTICAL_COMMIT_THRESHOLD ||
        Math.abs(event.velocityY) > COMMIT_VELOCITY;

      if (!committed) {
        translateX.value = withSpring(0, SWIPE_SPRING_CONFIG);
        translateY.value = withSpring(0, SWIPE_SPRING_CONFIG);
        return;
      }

      if (event.translationY < 0) {
        if (!next) {
          translateX.value = withSpring(0, SWIPE_SPRING_CONFIG);
          translateY.value = withSpring(0, SWIPE_SPRING_CONFIG);
          return;
        }
        translateY.value = withTiming(
          -height * 1.1,
          { duration: FLY_OFF_DURATION_MS },
          (finished) => {
            if (finished) {
              runOnJS(commitNext)();
            }
          },
        );
        return;
      }

      if (!previous) {
        translateX.value = withSpring(0, SWIPE_SPRING_CONFIG);
        translateY.value = withSpring(0, SWIPE_SPRING_CONFIG);
        return;
      }
      translateY.value = withTiming(
        height * 1.1,
        { duration: FLY_OFF_DURATION_MS },
        (finished) => {
          if (finished) {
            runOnJS(commitPrevious)();
          }
        },
      );
    });

  const currentCardStyle = useAnimatedStyle(() => {
    const rotateDeg = interpolate(
      translateX.value,
      [-width, width],
      [-MAX_ROTATION_DEG, MAX_ROTATION_DEG],
      Extrapolation.CLAMP,
    );
    const borderRadius = interpolate(
      Math.abs(translateX.value),
      [0, width * HORIZONTAL_COMMIT_THRESHOLD],
      [0, MAX_CARD_RADIUS],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, width * HORIZONTAL_COMMIT_THRESHOLD],
      [1, CARD_SHRINK_SCALE],
      Extrapolation.CLAMP,
    );
    return {
      borderRadius,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotateZ: `${rotateDeg}deg` },
        { scale },
      ],
    };
  });

  const previousCardStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value - height }],
  }));

  const nextCardStyle = useAnimatedStyle(() => {
    const isVerticalDrag =
      translateY.value < 0 &&
      Math.abs(translateY.value) >= Math.abs(translateX.value);

    if (isVerticalDrag) {
      return {
        transform: [
          { translateY: height + translateY.value },
          { scale: PEEK_SCALE_SETTLED },
        ],
      };
    }

    const dragProgress = Math.min(Math.abs(translateX.value) / width, 1);
    return {
      transform: [
        { translateY: 0 },
        {
          scale:
            PEEK_SCALE_START +
            dragProgress * (PEEK_SCALE_SETTLED - PEEK_SCALE_START),
        },
      ],
    };
  });

  const passStampStyle = useAnimatedStyle(() => {
    const dragOpacity = interpolate(
      translateX.value,
      [-width * HORIZONTAL_COMMIT_THRESHOLD, -width * 0.12, 0],
      [1, 0, 0],
      Extrapolation.CLAMP,
    );
    return { opacity: Math.max(dragOpacity, passStampOverrideOpacity.value) };
  });

  const keepStampStyle = useAnimatedStyle(() => {
    const dragOpacity = interpolate(
      translateX.value,
      [0, width * 0.12, width * HORIZONTAL_COMMIT_THRESHOLD],
      [0, 0, 1],
      Extrapolation.CLAMP,
    );
    return { opacity: Math.max(dragOpacity, keepStampOverrideOpacity.value) };
  });

  const renderCoach = () => {
    if (!current || hasSeenCoach) {
      return null;
    }
    return (
      <GestureCoach
        isActive
        translateX={translateX}
        passStampOverrideOpacity={passStampOverrideOpacity}
        keepStampOverrideOpacity={keepStampOverrideOpacity}
      />
    );
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="font-mono text-xs uppercase tracking-widest text-cream opacity-60">
          {t("Loading")}
        </Text>
      </View>
    );
  }

  if (isEmpty || !current) {
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
    <View className="flex-1">
      {previous && (
        <Animated.View
          key={previous.post.id}
          className="absolute inset-0"
          style={previousCardStyle}
          pointerEvents="none"
        >
          <FactCard post={previous.post} />
        </Animated.View>
      )}
      {next && (
        <Animated.View
          key={next.post.id}
          className="absolute inset-0"
          style={nextCardStyle}
          pointerEvents="none"
        >
          <FactCard post={next.post} />
        </Animated.View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View
          key={current.post.id}
          className="absolute inset-0 overflow-hidden"
          style={currentCardStyle}
        >
          <FactCard post={current.post} />
          <Animated.View
            className="bg-pass absolute left-1/2 top-1/2 items-center justify-center rounded-full"
            style={[
              passStampStyle,
              {
                width: STAMP_BADGE_SIZE,
                height: STAMP_BADGE_SIZE,
                marginLeft: -STAMP_BADGE_SIZE / 2,
                marginTop: -STAMP_BADGE_SIZE / 2,
              },
            ]}
          >
            <Ionicons
              name="close"
              size={STAMP_ICON_SIZE}
              color={APP_BACKGROUND_COLOR}
            />
          </Animated.View>
          <Animated.View
            className="bg-keep absolute left-1/2 top-1/2 items-center justify-center rounded-full"
            style={[
              keepStampStyle,
              {
                width: STAMP_BADGE_SIZE,
                height: STAMP_BADGE_SIZE,
                marginLeft: -STAMP_BADGE_SIZE / 2,
                marginTop: -STAMP_BADGE_SIZE / 2,
              },
            ]}
          >
            <Ionicons
              name="heart"
              size={STAMP_ICON_SIZE}
              color={APP_BACKGROUND_COLOR}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
      {renderCoach()}
    </View>
  );
};

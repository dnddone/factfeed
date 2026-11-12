import { useEffect } from "react";
import { Pressable } from "react-native";
import { useTranslation } from "react-i18next";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg from "react-native-svg";

import {
  APP_BACKGROUND_COLOR,
  CREAM_COLOR,
  KEEP_COLOR,
} from "@/constants/theme.constants";
import {
  goldFStrokes,
  logoViewBox,
  whiteFStrokes,
} from "@/content/progress.content";

import { IntroStroke } from "@/components/IntroSplash/IntroStroke";

const LETTER_DRAW_MS = 700;

/**
 * The gold F starts before the white F ends, so the two read as one
 * continuous signature rather than two separate steps.
 */
const GOLD_F_DELAY_MS = 550;

const GLOW_STEP_MS = 200;
const FADE_OUT_MS = 400;
const SKIP_FADE_OUT_MS = 200;

const GLOW_START_MS = GOLD_F_DELAY_MS + LETTER_DRAW_MS;
const FADE_OUT_START_MS = GLOW_START_MS + GLOW_STEP_MS * 2;

const LOGO_WIDTH = 180;
const GLOW_SCALE = 1.04;
const GLOW_SHADOW_RADIUS = 18;

/**
 * Pairs each stroke with where it starts inside its letter, so one shared
 * "drawn length" value can drive every stroke of the letter in order.
 */
const withStartOffsets = (strokes: typeof whiteFStrokes) =>
  strokes.map((stroke, index) => ({
    ...stroke,
    startAt: strokes
      .slice(0, index)
      .reduce((total, { length }) => total + length, 0),
  }));

const getTotalLength = (strokes: typeof whiteFStrokes) =>
  strokes.reduce((total, { length }) => total + length, 0);

const WHITE_F = withStartOffsets(whiteFStrokes);
const GOLD_F = withStartOffsets(goldFStrokes);
const WHITE_F_LENGTH = getTotalLength(whiteFStrokes);
const GOLD_F_LENGTH = getTotalLength(goldFStrokes);

type Props = {
  onFinish: () => void;
};

/**
 * First-launch intro (intro splash design doc): the white F writes itself,
 * the gold F follows over it, a short gold glow, then the whole screen
 * fades out over the feed. Tap anywhere to skip. With reduce-motion on it
 * does not play at all. `onFinish` fires exactly once, after the fade-out
 * (or right away for reduce-motion), so the caller can set the
 * `hasSeenIntro` flag and unmount it.
 */
export const IntroSplash: React.FC<Props> = ({ onFinish }) => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const whiteDrawnLength = useSharedValue(0);
  const goldDrawnLength = useSharedValue(0);
  const glow = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion) {
      onFinish();
      return;
    }

    whiteDrawnLength.value = withTiming(WHITE_F_LENGTH, {
      duration: LETTER_DRAW_MS,
    });
    goldDrawnLength.value = withDelay(
      GOLD_F_DELAY_MS,
      withTiming(GOLD_F_LENGTH, { duration: LETTER_DRAW_MS }),
    );
    glow.value = withDelay(
      GLOW_START_MS,
      withSequence(
        withTiming(1, { duration: GLOW_STEP_MS }),
        withTiming(0, { duration: GLOW_STEP_MS }),
      ),
    );
    /**
     * `finished` is false when a skip cancels this fade, so only the skip's
     * own fade calls `onFinish` in that case.
     */
    opacity.value = withDelay(
      FADE_OUT_START_MS,
      withTiming(0, { duration: FADE_OUT_MS }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSkip = () => {
    cancelAnimation(whiteDrawnLength);
    cancelAnimation(goldDrawnLength);
    cancelAnimation(glow);
    cancelAnimation(opacity);
    opacity.value = withTiming(
      0,
      { duration: SKIP_FADE_OUT_MS },
      (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      },
    );
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  /**
   * iOS draws the shadow from the strokes' own shape, which gives the glow.
   * Android has no shadow on a transparent view, so there it is only the
   * small scale pulse.
   */
  const logoStyle = useAnimatedStyle(() => ({
    shadowOpacity: glow.value,
    transform: [{ scale: 1 + (GLOW_SCALE - 1) * glow.value }],
  }));

  if (reduceMotion) {
    return null;
  }

  return (
    <Animated.View
      className="absolute inset-0 z-50"
      style={[{ backgroundColor: APP_BACKGROUND_COLOR }, containerStyle]}
    >
      <Pressable
        className="flex-1 items-center justify-center"
        onPress={handleSkip}
        accessibilityRole="button"
        accessibilityLabel={t("Skip intro")}
      >
        <Animated.View
          style={[
            {
              shadowColor: KEEP_COLOR,
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: GLOW_SHADOW_RADIUS,
            },
            logoStyle,
          ]}
        >
          <Svg
            width={LOGO_WIDTH}
            height={(LOGO_WIDTH * logoViewBox.height) / logoViewBox.width}
            viewBox={`0 0 ${logoViewBox.width} ${logoViewBox.height}`}
          >
            {WHITE_F.map(({ d, length, startAt }) => (
              <IntroStroke
                key={d}
                d={d}
                length={length}
                startAt={startAt}
                color={CREAM_COLOR}
                drawnLength={whiteDrawnLength}
              />
            ))}
            {GOLD_F.map(({ d, length, startAt }) => (
              <IntroStroke
                key={d}
                d={d}
                length={length}
                startAt={startAt}
                color={KEEP_COLOR}
                drawnLength={goldDrawnLength}
              />
            ))}
          </Svg>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
};

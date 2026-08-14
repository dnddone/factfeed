import { useEffect } from "react";
import {
  type SharedValue,
  useReducedMotion,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const WIGGLE_DISTANCE = 46;
const LEG_DURATION_MS = 480;
const HOLD_DURATION_MS = 300;

/**
 * How long the wiggled-out card and its ghosted stamp linger at full
 * opacity before returning to center — without this the stamp barely
 * registers before fading again.
 */
const STAMP_HOLD_MS = 420;

type Props = {
  isActive: boolean;
  translateX: SharedValue<number>;
  passStampOverrideOpacity: SharedValue<number>;
  keepStampOverrideOpacity: SharedValue<number>;
};

/**
 * First-run onboarding: wiggles the top card left (ghosted Pass) then right
 * (ghosted Keep) to teach the swipe gesture (design doc "First-run gesture
 * coach"). Renders nothing itself — it drives shared values that
 * `SwipeDeck`'s existing card/stamp styles already read.
 *
 * The stamp fade is driven directly (`passStampOverrideOpacity` /
 * `keepStampOverrideOpacity`) rather than derived from the wiggle's
 * `translateX`, same as the reduced-motion path — a wiggle small enough to
 * feel like a nudge rather than a real drag stays well under the stamp's
 * normal drag-distance fade-in threshold, so deriving opacity from position
 * would leave the ghosted stamp invisible. `SwipeDeck` owns interruption
 * (cancels these on first touch) and persistence (`useHasSeenCoach`).
 */
export const GestureCoach: React.FC<Props> = ({
  isActive,
  translateX,
  passStampOverrideOpacity,
  keepStampOverrideOpacity,
}) => {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!isActive) {
      return;
    }

    passStampOverrideOpacity.value = withDelay(
      HOLD_DURATION_MS,
      withSequence(
        withTiming(1, { duration: LEG_DURATION_MS }),
        withDelay(STAMP_HOLD_MS, withTiming(0, { duration: LEG_DURATION_MS })),
      ),
    );
    keepStampOverrideOpacity.value = withDelay(
      HOLD_DURATION_MS * 2 + LEG_DURATION_MS * 2 + STAMP_HOLD_MS,
      withSequence(
        withTiming(1, { duration: LEG_DURATION_MS }),
        withDelay(STAMP_HOLD_MS, withTiming(0, { duration: LEG_DURATION_MS })),
      ),
    );

    if (reduceMotion) {
      return;
    }

    translateX.value = withSequence(
      withDelay(
        HOLD_DURATION_MS,
        withTiming(-WIGGLE_DISTANCE, { duration: LEG_DURATION_MS }),
      ),
      withDelay(STAMP_HOLD_MS, withTiming(0, { duration: LEG_DURATION_MS })),
      withDelay(
        HOLD_DURATION_MS,
        withTiming(WIGGLE_DISTANCE, { duration: LEG_DURATION_MS }),
      ),
      withDelay(STAMP_HOLD_MS, withTiming(0, { duration: LEG_DURATION_MS })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, reduceMotion]);

  return null;
};

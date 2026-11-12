import Animated, {
  type SharedValue,
  useAnimatedProps,
} from "react-native-reanimated";
import { Path } from "react-native-svg";

import { logoStrokeWidth } from "@/content/progress.content";

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  d: string;
  length: number;
  color: string;
  /**
   * Where this stroke starts within its letter, in path-length units.
   */
  startAt: number;
  /**
   * How much of the whole letter the pen has drawn so far, in path-length
   * units. Shared by all strokes of one letter, so the pen keeps one speed
   * and each stroke starts only when the one before it ends.
   */
  drawnLength: SharedValue<number>;
};

/**
 * One pen stroke of the intro logo, revealed with `strokeDashoffset`.
 */
export const IntroStroke: React.FC<Props> = ({
  d,
  length,
  color,
  startAt,
  drawnLength,
}) => {
  const animatedProps = useAnimatedProps(() => {
    const visibleLength = Math.min(
      Math.max(drawnLength.value - startAt, 0),
      length,
    );

    return {
      strokeDashoffset: length - visibleLength,
      /**
       * A round cap still paints a dot on a zero-length dash, so hide the
       * stroke until the pen actually reaches it.
       */
      strokeOpacity: visibleLength > 0 ? 1 : 0,
    };
  });

  return (
    <AnimatedPath
      d={d}
      stroke={color}
      strokeWidth={logoStrokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={[length, length]}
      animatedProps={animatedProps}
    />
  );
};

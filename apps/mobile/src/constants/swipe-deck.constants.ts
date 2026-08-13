/**
 * Fraction of screen width/height a drag must cross to commit (fly off /
 * page) instead of springing back.
 */
export const HORIZONTAL_COMMIT_THRESHOLD = 0.3;
export const VERTICAL_COMMIT_THRESHOLD = 0.2;

/**
 * A fast flick commits even under the distance threshold (px/s, matches
 * gesture-handler's velocity units).
 */
export const COMMIT_VELOCITY = 800;

/**
 * Distance (px) a drag must travel on one axis before the gesture locks to
 * it — below this, movement is too ambiguous to tell a horizontal drag from
 * a vertical one. Once locked, the other axis stops moving entirely for the
 * rest of the gesture, so a slightly diagonal drag can't smear into both a
 * Keep/Pass tilt and a page transition at once.
 */
export const AXIS_LOCK_DEADZONE = 8;

/**
 * Max card rotation at a full-width horizontal drag (design doc: ±9°).
 */
export const MAX_ROTATION_DEG = 9;

/**
 * Peek-behind scale range for the next card during a horizontal drag
 * (design doc: depth cue as the current card clears). Starts *larger* than
 * the viewport and settles to exactly `1` — shrinking down instead of
 * growing up from below `1` means the card always fully covers the screen,
 * so no canvas background ever shows around its edges mid-drag.
 */
export const PEEK_SCALE_START = 1.06;
export const PEEK_SCALE_SETTLED = 1;

/**
 * Spring used for both the release snap-back and the reset after a
 * committed swipe — one gentle overshoot (design doc:
 * `cubic-bezier(.22, 1.2, .36, 1)`).
 */
export const SWIPE_SPRING_CONFIG = {
  damping: 16,
  stiffness: 180,
  mass: 0.9,
};

/**
 * Duration of the fly-off animation once a swipe commits.
 */
export const FLY_OFF_DURATION_MS = 240;

/**
 * Corner radius the current card animates toward as a horizontal drag
 * approaches the commit threshold — `0` at rest, so the feed stays
 * full-bleed (design doc "edge-to-edge") until the user actually starts a
 * Keep/Pass gesture.
 */
export const MAX_CARD_RADIUS = 28;

/**
 * Uniform scale the current card shrinks toward as a horizontal drag
 * approaches the commit threshold — `1` at rest. A proportional shrink (not
 * a height-only squeeze) so the text scales down with the card instead of
 * getting distorted. Springs back to `1` with the rest of the card on
 * release if the drag doesn't commit.
 */
export const CARD_SHRINK_SCALE = 0.7;

/**
 * Size of the circular Keep/Pass stamp badge and its icon, centered on the
 * card.
 */
export const STAMP_BADGE_SIZE = 112;
export const STAMP_ICON_SIZE = 56;

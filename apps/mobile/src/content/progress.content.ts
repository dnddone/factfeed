/**
 * Placeholder single-stroke "FF" logo, hand-authored until the real artwork
 * exists (intro splash exec plan, Phase 4 swaps this data). Coordinates are
 * in `logoViewBox` units.
 *
 * Each letter is a list of pen strokes, drawn in order. `length` is the
 * stroke's total path length: the write-on reveal needs it for
 * `strokeDasharray`, so keep it in sync when `d` changes (round up — a
 * slightly long value is harmless, a short one leaves a gap).
 */
export const logoViewBox = { width: 118, height: 102 };

export const logoStrokeWidth = 7;

export const whiteFStrokes = [
  { d: "M22 88 L34 14 L66 14", length: 107 },
  { d: "M28 52 L54 52", length: 26 },
];

/**
 * Offset right of the white F so its stem crosses the white F's top bar —
 * the overlap is part of the mark (design doc "Animation sketch").
 */
export const goldFStrokes = [
  { d: "M52 88 L64 14 L96 14", length: 107 },
  { d: "M58 52 L84 52", length: 26 },
];

/**
 * Curated set of deep, muted gradients a fact card can be seeded with
 * (design doc: "Fact gradients"). Colors run start → middle → end along the
 * card's diagonal; `locations` places the middle stop.
 */
export const FACT_GRADIENTS = [
  { colors: ["#3a2a5e", "#7b3f6e", "#b06a4e"], locations: [0, 0.55, 1] },
  { colors: ["#123b3a", "#245b52", "#7d8f52"], locations: [0, 0.5, 1] },
  { colors: ["#402036", "#7a2f43", "#c07a3e"], locations: [0, 0.55, 1] },
  { colors: ["#1c2b4a", "#3a4d74", "#8a7ba0"], locations: [0, 0.55, 1] },
  { colors: ["#3d2118", "#7a3d2c", "#c98a4e"], locations: [0, 0.55, 1] },
  { colors: ["#232a3a", "#3b4a5e", "#6f8a92"], locations: [0, 0.5, 1] },
] as const;

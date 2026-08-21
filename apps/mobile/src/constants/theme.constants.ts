/**
 * Dark canvas background shared by the root layout and screens (design
 * doc: dark-first). Single source so `_layout.tsx`'s screen options and a
 * screen's own styles never drift apart.
 */
export const APP_BACKGROUND_COLOR = "#0B0A09";

/**
 * Raw hex twin of the `cream` NativeWind color, for the handful of RN APIs
 * that aren't NativeWind-interop'd and take a plain color prop instead of a
 * `className` (e.g. `Stack.Screen`'s `headerTintColor`).
 */
export const CREAM_COLOR = "#F7F1E7";

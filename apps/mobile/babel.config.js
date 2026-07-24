/**
 * Babel config for the Expo app. `babel-preset-expo` covers Expo Router;
 * `jsxImportSource: "nativewind"` routes JSX through NativeWind's runtime.
 * The worklets plugin (Reanimated 4's workletization, formerly the
 * `react-native-reanimated/plugin`) must stay last in the plugins list.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: ["react-native-worklets/plugin"],
  };
};

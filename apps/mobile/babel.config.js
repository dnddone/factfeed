/**
 * Babel config for the Expo app. `babel-preset-expo` covers Expo Router.
 * The Reanimated plugin (added with the gesture deck in a later phase) must be
 * listed last once it lands.
 */
module.exports = function (api) {
  api.cache(true);

  return {
    presets: ["babel-preset-expo"],
  };
};

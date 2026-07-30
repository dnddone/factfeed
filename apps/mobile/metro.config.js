/**
 * Metro config tuned for the pnpm monorepo: watch the workspace root so shared
 * packages (e.g. @factfeed/contract) hot-reload, and resolve modules from both
 * the app's and the root's node_modules. Wrapped with `withNativeWind` so
 * Metro processes `global.css` into the NativeWind runtime.
 */
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./global.css" });

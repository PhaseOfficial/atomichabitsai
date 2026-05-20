// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const { transformer, resolver } = config;

config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};

config.resolver = {
  ...resolver,
  assetExts: [...resolver.assetExts.filter((ext) => ext !== "svg"), "wasm"],
  sourceExts: [...resolver.sourceExts, "svg", "wasm"],
  // Force Metro to resolve the CJS version by prioritizing 'main' and 'require'
  resolverMainFields: ["react-native", "main"],
  unstable_conditionNames: ["require", "react-native"],
};

module.exports = config;

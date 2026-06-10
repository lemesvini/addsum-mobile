module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      /**
       * `nativewind/babel` (css-interop) already adds `react-native-worklets/plugin` last.
       * Disable expo preset from injecting `worklets/plugin` OR `reanimated/plugin` (Reanimated 4 must use worklets plugin only — see expo babel-preset-expo source).
       */
      ["babel-preset-expo", { jsxImportSource: "nativewind", reanimated: false }],
      "nativewind/babel",
    ],
  };
};

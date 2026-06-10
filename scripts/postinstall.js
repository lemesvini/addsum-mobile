#!/usr/bin/env node
/**
 * Applies small compatibility patches to installed dependencies.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(path.dirname(process.argv[1]), "..");

function patchReactNativeCssInterop() {
  const filePath = path.join(
    ROOT,
    "node_modules",
    "react-native-css-interop",
    "dist",
    "metro",
    "index.js",
  );

  if (!fs.existsSync(filePath)) {
    console.log(
      "postinstall: react-native-css-interop not found, skipping patch.",
    );
    return;
  }

  const original = fs.readFileSync(filePath, "utf8");

  const oldCode = `haste.emit("change", {
                eventsQueue: [
                    {
                        filePath,
                        metadata: {
                            modifiedTime: Date.now(),
                            size: 1,
                            type: "virtual",
                        },
                        type: "change",
                    },
                ],
            });`;

  const newCode = `haste.emit("change", {
                changes: {
                    addedFiles: [],
                    modifiedFiles: [],
                    removedFiles: [],
                },
                rootDir: "",
            });`;

  if (original.includes(newCode)) {
    console.log(
      "postinstall: react-native-css-interop already patched, skipping.",
    );
    return;
  }

  if (!original.includes(oldCode)) {
    console.warn(
      "postinstall: react-native-css-interop patch target not found — the package may have changed. Skipping.",
    );
    return;
  }

  fs.writeFileSync(filePath, original.replace(oldCode, newCode), "utf8");
  console.log("postinstall: react-native-css-interop patched successfully.");
}

function patchExpoUiTsconfig() {
  const expoUiTsconfigPath = path.join(
    ROOT,
    "node_modules",
    "@expo",
    "ui",
    "tsconfig.json",
  );

  if (!fs.existsSync(expoUiTsconfigPath)) {
    console.log("postinstall: @expo/ui not found, skipping tsconfig patch.");
    return;
  }

  const expoUiTsconfig = fs.readFileSync(expoUiTsconfigPath, "utf8");
  const expoUiOldExtends = '"extends": "expo-module-scripts/tsconfig.base"';
  const expoUiNewExtends = '"extends": "expo/tsconfig.base"';

  if (expoUiTsconfig.includes(expoUiNewExtends)) {
    console.log("postinstall: @expo/ui tsconfig already patched, skipping.");
    return;
  }

  if (!expoUiTsconfig.includes(expoUiOldExtends)) {
    console.warn(
      "postinstall: @expo/ui tsconfig patch target not found — the package may have changed. Skipping.",
    );
    return;
  }

  fs.writeFileSync(
    expoUiTsconfigPath,
    expoUiTsconfig.replace(expoUiOldExtends, expoUiNewExtends),
    "utf8",
  );
  console.log("postinstall: @expo/ui tsconfig patched successfully.");
}

patchReactNativeCssInterop();
patchExpoUiTsconfig();

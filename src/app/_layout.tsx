import {
  DarkTheme,
  // DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { colorScheme as nwColorScheme } from "nativewind";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { DatabaseProvider } from "@/db/use-db";

nwColorScheme.set("dark");

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <DatabaseProvider>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen
              name="debug-database"
              options={{ presentation: "modal", title: "Debug Database" }}
            />
          </Stack>
        </DatabaseProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

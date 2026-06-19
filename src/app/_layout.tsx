import {
  DarkTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { colorScheme as nwColorScheme } from "nativewind";
import React, { useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import "../global.css";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { queryClient } from "@/lib/query-client";

nwColorScheme.set("dark");

export default function RootLayout() {
  // Bridge React Native's AppState to React Query's focus tracking so stale
  // queries refetch when the app returns to the foreground (RN has no browser
  // "window focus" event, so this is off by default).
  useEffect(() => {
    const onChange = (status: AppStateStatus) => {
      focusManager.setFocused(status === "active");
    };
    const sub = AppState.addEventListener("change", onChange);
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <QueryClientProvider client={queryClient}>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

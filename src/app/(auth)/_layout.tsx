import { Stack } from "expo-router";
import { Platform } from "react-native";

/**
 * Auth screens. On iOS they present as a transparent form-sheet over the
 * welcome screen (each screen paints its own solid background). Android doesn't
 * support the transparent form-sheet the same way — it would render the screen
 * transparently over the welcome screen — so there we fall back to a normal
 * full-screen card (the screen's own `bg-background` keeps it solid).
 */
const AUTH_SHEET_OPTIONS =
  Platform.OS === "ios"
    ? {
        presentation: "formSheet" as const,
        sheetGrabberVisible: true,
        sheetAllowedDetents: [0.5, 1],
        contentStyle: { backgroundColor: "transparent" },
      }
    : undefined;

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" options={AUTH_SHEET_OPTIONS} />
      <Stack.Screen name="register" options={AUTH_SHEET_OPTIONS} />
      <Stack.Screen name="forgot-password" options={AUTH_SHEET_OPTIONS} />
      <Stack.Screen name="reset-password" options={AUTH_SHEET_OPTIONS} />
    </Stack>
  );
}

import { Stack } from "expo-router";

/**
 * Auth form-sheets. The sheet container is transparent; each screen paints its
 * own solid background (theme-aware) so it reads clearly over the welcome
 * screen behind it.
 */
const AUTH_SHEET_OPTIONS = {
  presentation: "formSheet" as const,
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.5, 1],
  contentStyle: { backgroundColor: "transparent" },
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="sign-in" options={AUTH_SHEET_OPTIONS} />
      <Stack.Screen name="register" options={AUTH_SHEET_OPTIONS} />
    </Stack>
  );
}

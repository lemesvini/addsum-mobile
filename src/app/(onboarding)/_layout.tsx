import { useRequireAuthUser } from "@/features/auth/auth-store";
import { Redirect, Stack, type Href } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function OnboardingLayout() {
  const { isHydrated, user } = useRequireAuthUser();

  if (!isHydrated) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href={"/(auth)/sign-in" as Href} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

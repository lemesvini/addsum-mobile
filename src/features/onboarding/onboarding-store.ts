import {
  getAuthUserFromToken,
  useAuthStore,
} from "@/features/auth/auth-store";
import type { Href } from "expo-router";
import * as SecureStore from "expo-secure-store";

const onboardingKey = (userId: string) => `onboarding-completed-${userId}`;

export async function hasCompletedOnboarding(userId: string): Promise<boolean> {
  try {
    const value = await SecureStore.getItemAsync(onboardingKey(userId));
    return value === "true";
  } catch {
    return false;
  }
}

export async function markOnboardingCompleted(userId: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(onboardingKey(userId), "true");
  } catch (error) {
    console.error(error);
  }
}

export async function resetOnboarding(userId: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(onboardingKey(userId));
  } catch (error) {
    console.error(error);
  }
}

export async function getPostAuthRoute(token: string): Promise<Href> {
  const user = getAuthUserFromToken(token);
  if (!user) {
    useAuthStore.getState().removeAuthenticatedUser();
    return "/(auth)/sign-in" as Href;
  }
  const done = await hasCompletedOnboarding(user._id);
  return (done ? "/(app)" : "/(onboarding)") as Href;
}

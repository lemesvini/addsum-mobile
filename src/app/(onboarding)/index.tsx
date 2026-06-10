import { useAuthUser } from "@/features/auth/auth-store";
import { OnboardingPager } from "@/features/onboarding/components/onboarding-pager";
import { markOnboardingCompleted } from "@/features/onboarding/onboarding-store";
import { Redirect, useRouter, type Href } from "expo-router";
import { useCallback } from "react";

export default function OnboardingScreen() {
  const user = useAuthUser();
  const router = useRouter();

  const handleComplete = useCallback(async () => {
    if (!user) {
      router.replace("/(auth)/sign-in" as Href);
      return;
    }
    await markOnboardingCompleted(user._id);
    router.replace("/(app)" as Href);
  }, [router, user]);

  if (!user) {
    return <Redirect href={"/(auth)/sign-in" as Href} />;
  }

  return <OnboardingPager onComplete={handleComplete} />;
}

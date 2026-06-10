import { isAuthTokenValid, useAuthStore } from "@/features/auth/auth-store";
import { getPostAuthRoute } from "@/features/onboarding/onboarding-store";
import { Redirect, type Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function Index() {
  const [ready, setReady] = useState(false);
  const [destination, setDestination] = useState<Href | null>(null);

  useEffect(() => {
    let mounted = true;

    useAuthStore
      .getState()
      .hydrate()
      .then(async () => {
        const token = useAuthStore.getState().accessToken;
        let href: Href = "/(auth)/welcome" as Href;
        if (isAuthTokenValid(token)) {
          href = await getPostAuthRoute(token);
        }
        if (mounted) {
          setDestination(href);
          setReady(true);
          SplashScreen.hideAsync();
        }
      })
      .catch(() => {
        if (mounted) {
          setDestination("/(auth)/welcome" as Href);
          setReady(true);
          SplashScreen.hideAsync();
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (!ready || !destination) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}

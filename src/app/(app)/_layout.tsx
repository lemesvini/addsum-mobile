import { useRequireAuthUser } from "@/features/auth/auth-store";
import { Redirect, Stack, type Href } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function AppLayout() {
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
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="group/[id]/index" />
        <Stack.Screen
          name="group/[id]/new-expense"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="group/[id]/expense/[expenseId]"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen
          name="(modals)/profile-modal"
          options={{ presentation: "modal", title: "Perfil" }}
        />
        <Stack.Screen
          name="(modals)/reset-password"
          options={{ presentation: "modal", title: "Redefinir senha" }}
        />
        <Stack.Screen
          name="(modals)/edit-profile-modal"
          options={{ presentation: "modal", title: "Editar perfil" }}
        />
        <Stack.Screen
          name="(modals)/create-group-modal"
          options={{ presentation: "modal", title: "Novo grupo" }}
        />
        <Stack.Screen
          name="(modals)/edit-group-modal"
          options={{ presentation: "modal", title: "Editar grupo" }}
        />
        <Stack.Screen
          name="(modals)/join-group-modal"
          options={{ presentation: "modal", title: "Entrar em um grupo" }}
        />
        <Stack.Screen
          name="(modals)/share-group-modal"
          options={{
            presentation: "formSheet",
            title: "Convidar um amigo",
            sheetGrabberVisible: true,
            sheetAllowedDetents: [0.5, 1],
          }}
        />
      </Stack>
    </>
  );
}

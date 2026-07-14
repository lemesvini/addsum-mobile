import { Text } from "@/components/ui/text";
import { useRouter, type Href } from "expo-router";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="bg-background flex-1 px-6">
      <View className="flex-1 items-center justify-center gap-5">
        <Image
          source={require("../../../assets/epicora-full.png")}
          style={{ width: 120, height: 120 }}
          contentFit="contain"
        />
        <View className="items-center gap-2">
          <Text className="text-foreground text-4xl font-extrabold tracking-tight">
            Addsum
          </Text>
          <Text className="text-muted-foreground text-center text-base leading-6">
            Divida despesas com seus grupos e acerte as contas sem complicação.
          </Text>
        </View>
      </View>

      <View className="gap-3 pb-4">
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(auth)/register" as Href);
          }}
          className="bg-primary h-14 items-center justify-center rounded-2xl active:opacity-90"
        >
          <Text className="text-primary-foreground text-base font-bold">
            Criar conta
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(auth)/sign-in" as Href);
          }}
          className="h-12 flex-row items-center justify-center gap-1.5 active:opacity-70"
        >
          <Text className="text-muted-foreground">Já tem uma conta?</Text>
          <Text className="text-primary font-bold">Entrar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

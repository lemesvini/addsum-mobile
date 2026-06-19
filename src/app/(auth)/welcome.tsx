import { Text } from "@/components/ui/text";
import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { Pressable, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-black p-4">
      <View style={{ flex: 1 }} />
      <Image
        source={require("@/assets/epicora.png")}
        style={{ width: 280, height: 280, alignSelf: "center" }}
        contentFit="contain"
      />
      <View style={{ flex: 2 }} className="justify-end gap-2">
        <TouchableOpacity
          className="bg-primary p-4 rounded-lg"
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(auth)/register" as Href);
          }}
        >
          <Text className="text-white text-center font-bold">Criar conta</Text>
        </TouchableOpacity>
        <Pressable
          className="w-full items-end"
          onPress={() => {
            Haptics.selectionAsync();
            router.push("/(auth)/sign-in" as Href);
          }}
        >
          <Text className="px-4 text-primary font-bold">Já tem uma conta?</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

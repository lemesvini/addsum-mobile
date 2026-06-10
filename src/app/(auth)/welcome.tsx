import { Text } from "@/components/ui/text";
import { useRouter, type Href } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-primary p-4 justify-end gap-2">
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push("/(auth)/register" as Href);
        }}
        style={({ pressed }) => ({
          backgroundColor: "#fff",
          borderRadius: 16,
          paddingVertical: 18,
          alignItems: "center",
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <Text style={{ color: "#10B981", fontSize: 17, fontWeight: "700" }}>
          Criar conta
        </Text>
      </Pressable>
      <Pressable
        className="w-full items-end"
        onPress={() => {
          Haptics.selectionAsync();
          router.push("/(auth)/sign-in" as Href);
        }}
      >
        <Text className="px-4 font-bold">Já tem uma conta?</Text>
      </Pressable>
    </SafeAreaView>
  );
}

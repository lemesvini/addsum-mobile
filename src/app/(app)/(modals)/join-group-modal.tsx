import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { AuthTextField } from "@/features/auth/components/auth-text-field";
import { useGroupsMutations } from "@/features/groups/hooks/use-groups-mutations";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function JoinGroupModal() {
  const { joinGroup } = useGroupsMutations();

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onJoin = async () => {
    if (code.trim().length < 4) {
      setError("Código inválido");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await joinGroup(code.trim());
      router.back();
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível entrar no grupo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-foreground text-xl font-bold">
          Entrar em um grupo
        </Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <X size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <AuthTextField
          label="Código de convite"
          placeholder="Ex: ABC123"
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
        />
        {error ? (
          <Text className="text-destructive mb-2 text-sm">{error}</Text>
        ) : null}
        <Pressable
          className="bg-primary py-3 rounded-lg items-center rounded-full"
          disabled={busy}
          onPress={onJoin}
        >
          <Text className="text-primary-foreground font-semibold">
            {busy ? "Entrando..." : "Entrar"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

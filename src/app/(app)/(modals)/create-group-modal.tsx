import { Button } from "@/components/ui/button";
import { GroupCoverField } from "@/components/ui/form/group-cover-field";
import { Text } from "@/components/ui/text";
import { AuthTextField } from "@/features/auth/components/auth-text-field";
import { useGroupsMutations } from "@/features/groups/hooks/use-groups-mutations";
import { router, type Href } from "expo-router";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CreateGroupModal() {
  const { createGroup } = useGroupsMutations();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    if (!name.trim()) {
      setError("Informe um nome");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await createGroup({
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl || undefined,
      });
      router.back();
      router.push(`/group/${id}` as Href);
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível criar o grupo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-foreground text-xl font-bold">Novo grupo</Text>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <X size={24} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <GroupCoverField
          value={imageUrl}
          onChange={setImageUrl}
          disabled={busy}
        />
        <AuthTextField
          label="Nome"
          placeholder="Ex: Apartamento Centro"
          value={name}
          onChangeText={setName}
        />
        <AuthTextField
          label="Descrição (opcional)"
          placeholder="Despesas do mês"
          value={description}
          onChangeText={setDescription}
        />
        {error ? (
          <Text className="text-destructive mb-2 text-sm">{error}</Text>
        ) : null}
        <Pressable
          disabled={busy}
          onPress={onCreate}
          className="bg-primary py-3 rounded-lg items-center rounded-full"
        >
          <Text className="text-primary-foreground font-semibold">
            {busy ? "Criando..." : "Criar grupo"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

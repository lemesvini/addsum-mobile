import { Button } from "@/components/ui/button";
import { GroupCoverField } from "@/components/ui/form/group-cover-field";
import { Text } from "@/components/ui/text";
import { AuthTextField } from "@/features/auth/components/auth-text-field";
import { useAuthUser } from "@/features/auth/auth-store";
import { useGroup } from "@/features/groups/hooks/use-group";
import { useGroupsMutations } from "@/features/groups/hooks/use-groups-mutations";
import { router, useLocalSearchParams } from "expo-router";
import { X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CloseButton from "@/components/close-button";

export default function EditGroupModal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { group } = useGroup(id);
  const { updateGroup } = useGroupsMutations();
  const authUser = useAuthUser();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill once the group loads.
  useEffect(() => {
    if (group && !hydrated) {
      setName(group.name);
      setDescription(group.description ?? "");
      setImageUrl(group.imageUrl ?? "");
      setHydrated(true);
    }
  }, [group, hydrated]);

  const isAdmin = !!group && !!authUser && group.adminUserId === authUser._id;

  const onSave = async () => {
    if (!id) return;
    if (!name.trim()) {
      setError("Informe um nome");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateGroup(id, {
        name: name.trim(),
        description: description.trim() || undefined,
        imageUrl: imageUrl || undefined,
      });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível salvar o grupo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1">
      <View className="flex-row items-center justify-between px-5 py-3">
        <Text className="text-foreground text-xl font-bold">Editar grupo</Text>
        <CloseButton />
      </View>

      <ScrollView
        className="px-5 flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {!isAdmin && hydrated ? (
          <Text className="text-muted-foreground mb-2 text-sm">
            Apenas o administrador do grupo pode editar.
          </Text>
        ) : null}
        <GroupCoverField
          value={imageUrl}
          onChange={setImageUrl}
          disabled={busy || !isAdmin}
        />
        <AuthTextField
          label="Nome"
          placeholder="Ex: Apartamento Centro"
          value={name}
          onChangeText={setName}
          editable={isAdmin}
        />
        <AuthTextField
          label="Descrição (opcional)"
          placeholder="Despesas do mês"
          value={description}
          onChangeText={setDescription}
          editable={isAdmin}
        />
        {error ? (
          <Text className="text-destructive mb-2 text-sm">{error}</Text>
        ) : null}
      </ScrollView>

      <View className="px-5 py-3">
        <Pressable
          className="w-full bg-primary rounded-full items-center justify-center py-3"
          disabled={busy || !isAdmin}
          onPress={onSave}
        >
          <Text className="text-primary-foreground font-semibold">
            {busy ? "Salvando..." : "Salvar"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

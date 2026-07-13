import { Text } from "@/components/ui/text";
import { deleteMyAccount } from "@/features/profile/hooks/use-profile-api";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useTheme } from "@/hooks/use-theme";
import { router, type Href } from "expo-router";
import { TriangleAlert, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DeleteAccountModal() {
  const theme = useTheme();
  const { logout } = useLogout();
  const [isDeleting, setIsDeleting] = useState(false);

  const runDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMyAccount();
      await logout();
      router.dismissAll();
      router.replace("/(auth)/welcome" as Href);
    } catch (e) {
      Alert.alert(
        "Não foi possível excluir a conta",
        e instanceof Error ? e.message : "Tente novamente.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      "Excluir conta?",
      "Esta ação é permanente e não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Excluir conta", style: "destructive", onPress: runDelete },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background pt-4" edges={["top", "bottom"]}>
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <View className="flex-1 items-center">
          <Text className="font-bold text-card-foreground">Excluir conta</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          className="absolute right-4 h-8 w-8 items-center justify-center rounded-full bg-muted"
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        >
          <X size={16} color={theme.cardForeground} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4 gap-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center gap-3 py-4">
          <View
            className="h-16 w-16 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.destructive + "22" }}
          >
            <TriangleAlert size={30} color={theme.destructive} />
          </View>
          <Text className="text-foreground text-xl font-bold text-center">
            Essa ação é permanente
          </Text>
        </View>

        <View className="rounded-2xl border border-border bg-card p-4 gap-2">
          <Text className="text-card-foreground text-sm">
            Ao excluir sua conta, seus dados de acesso e sua participação nos
            grupos serão removidos permanentemente.
          </Text>
          <Text className="text-muted-foreground text-sm">
            Você precisa excluir ou transferir os grupos que administra e quitar
            seus pagamentos pendentes antes de excluir a conta.
          </Text>
        </View>

        <Pressable
          disabled={isDeleting}
          onPress={confirmDelete}
          className="h-12 items-center justify-center rounded-xl bg-destructive"
          accessibilityRole="button"
          accessibilityLabel="Excluir minha conta"
        >
          {isDeleting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">
              Excluir minha conta
            </Text>
          )}
        </Pressable>

        <Pressable
          disabled={isDeleting}
          onPress={() => router.back()}
          className="h-12 items-center justify-center rounded-xl border border-border bg-card"
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
        >
          <Text className="text-base font-medium text-card-foreground">
            Cancelar
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

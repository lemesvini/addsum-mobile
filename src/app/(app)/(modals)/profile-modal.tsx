import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { useAuthUser } from "@/features/auth/auth-store";
import { useLogout } from "@/features/auth/hooks/use-logout";
import { useProfile } from "@/features/profile/hooks/use-profile";
import { useTheme } from "@/hooks/use-theme";
import { router, type Href } from "expo-router";
import {
  ChevronRight,
  FileText,
  KeyRound,
  LogOut,
  Shield,
  User,
  X,
  type LucideIcon,
} from "lucide-react-native";
import {
  Alert,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";

// Endereços públicos — substituir pelos links definitivos quando existirem.
const PRIVACY_URL = "https://addsum.app/privacidade";
const TERMS_URL = "https://addsum.app/termos";

function Row({
  icon: Icon,
  label,
  onPress,
  destructive = false,
  showDivider = true,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  showDivider?: boolean;
}) {
  const theme = useTheme();
  const iconColor = destructive ? theme.destructive : theme.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn(
        "flex-row items-center gap-3 px-4 py-4",
        showDivider && "border-b border-border",
      )}
    >
      <View className="h-9 w-9 px-2 items-center justify-center rounded-lg bg-muted">
        <Icon size={18} color={iconColor} />
      </View>
      <Text
        className={cn(
          "flex-1 text-base font-medium",
          destructive ? "text-destructive" : "text-foreground",
        )}
      >
        {label}
      </Text>
      <ChevronRight size={18} color={theme.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function ProfileModal() {
  const theme = useTheme();
  const authUser = useAuthUser();
  const { profile } = useProfile();
  const { logout } = useLogout();

  const displayName = profile?.fullName ?? authUser?.email ?? "Usuário";
  const email = profile?.email ?? authUser?.email ?? "";
  const avatarUrl = profile?.avatarUrl?.trim() ?? "";
  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase() || "U";

  const openUrl = (url: string) => {
    void Linking.openURL(url).catch(() => {
      Alert.alert("Ops", "Não foi possível abrir o link.");
    });
  };

  const onLogout = () => {
    Alert.alert("Sair", "Deseja realmente sair?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Sair",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/welcome" as Href);
        },
      },
    ]);
  };

  return (
    <SafeAreaView
      className="flex-1 bg-background pt-4"
      edges={["top", "bottom"]}
    >
      <View className="flex-row items-center px-4 pb-2 pt-4">
        <View className="flex-1 items-center">
          <Text className="font-bold text-card-foreground">Perfil</Text>
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
        contentContainerClassName="px-5 pb-8 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-8 items-center">
          <View className="bg-primary mb-4 h-24 w-24 items-center justify-center overflow-hidden rounded-full">
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 96, height: 96 }}
                contentFit="cover"
              />
            ) : (
              <Text className="text-primary-foreground text-3xl font-bold">
                {initials}
              </Text>
            )}
          </View>
          <Text className="text-foreground text-2xl font-bold">
            {displayName}
          </Text>
          {email ? (
            <Text className="text-muted-foreground mt-1">{email}</Text>
          ) : null}
        </View>

        <View className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
          <Row
            icon={Shield}
            label="Política de Privacidade"
            onPress={() => openUrl(PRIVACY_URL)}
          />
          <Row
            icon={FileText}
            label="Termos de Uso"
            onPress={() => openUrl(TERMS_URL)}
            showDivider={false}
          />
        </View>

        <View className="overflow-hidden rounded-xl border border-border bg-card">
          <Row
            icon={User}
            label="Editar perfil"
            onPress={() => router.push("(modals)/edit-profile-modal" as Href)}
          />
          <Row
            icon={KeyRound}
            label="Alterar senha"
            onPress={() => router.push("(modals)/reset-password" as Href)}
          />
          <Row
            icon={LogOut}
            label="Sair"
            onPress={onLogout}
            destructive
            showDivider={false}
          />
        </View>
      </ScrollView>

      <View className="absolute bottom-8 w-full">
        <Text className="text-muted-foreground text-center text-xs">
          Versão 1.0.0
        </Text>
      </View>
    </SafeAreaView>
  );
}

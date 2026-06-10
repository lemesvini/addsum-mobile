import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useTabScreenTopPadding } from "@/hooks/use-tab-screen-top-padding";
import {
  useDebtSummaries,
  type DebtItem,
} from "@/features/expenses/hooks/use-debt-summaries";
import { useUsers } from "@/features/users/hooks/use-users";
import { useMemo } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useAuthUser } from "@/features/auth/auth-store";
import { useUser } from "@/features/users/hooks/use-user";
import { DollarSign, Scale, User, Wallet } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { router, type Href } from "expo-router";
import { Image } from "expo-image";
import { useTheme } from "@/hooks/use-theme";

function formatBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function DebtRow({
  item,
  userName,
  owed,
}: {
  item: DebtItem;
  userName: string;
  owed: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync();
        router.push(`/group/${item.groupId}` as Href);

        setTimeout(() => {
          router.push(
            `/group/${item.groupId}/expense/${item.expenseId}` as Href,
          );
        }, 500);
      }}
      className="border-border flex-row items-center justify-between border-b py-3 active:opacity-70"
    >
      <View className="flex-1 pr-3">
        <Text className="text-foreground font-medium">{item.description}</Text>
        <Text className="text-muted-foreground text-sm">
          {owed ? `${userName} deve a você` : `Você deve a ${userName}`}
          {item.status === "PAID" ? " · aguardando confirmação" : ""}
        </Text>
      </View>
      <Text
        className={
          owed ? "text-primary font-semibold" : "text-destructive font-semibold"
        }
      >
        {formatBRL(item.amount)}
      </Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const topPadding = useTabScreenTopPadding();
  const { iOwe, owedToMe, totalIOwe, totalOwedToMe, net } = useDebtSummaries();
  const { users } = useUsers();
  const authUser = useAuthUser();
  const { user } = useUser(authUser?._id);
  const avatarUrl = user?.avatarUrl?.trim() ?? "";
  const theme = useTheme();

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u._id, u.fullName);
    return m;
  }, [users]);

  const creditorCount = useMemo(
    () => new Set(iOwe.map((d) => d.otherUserId)).size,
    [iOwe],
  );
  const debtorCount = useMemo(
    () => new Set(owedToMe.map((d) => d.otherUserId)).size,
    [owedToMe],
  );

  const userName = (id: string) => nameById.get(id) ?? "Alguém";

  return (
    <ScrollView
      className="bg-background flex-1"
      contentContainerStyle={{ ...topPadding, paddingBottom: 32 }}
    >
      <View className="px-5">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-foreground text-3xl font-extrabold tracking-tight">
            Oi, {user?.fullName.split(" ")[0] ?? "Usuário"}
          </Text>
          <Pressable
            className="h-11 px-3 items-center justify-center overflow-hidden rounded-full bg-muted"
            onPress={() => {
              Haptics.selectionAsync();
              router.push("(modals)/profile-modal" as Href);
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                style={{ width: 44, height: 44 }}
                contentFit="cover"
              />
            ) : (
              <User size={18} color="#ffffff" />
            )}
          </Pressable>
        </View>

        <View className="mb-4 flex-row gap-4">
          <Card className="bg-transparent aspect-square flex-1 rounded-3xl">
            <View className="flex-1 justify-between px-5">
              <Text className="text-muted-foreground text-sm">
                Devem a você
              </Text>
              <Text className="text-white text-2xl font-extrabold">
                {formatBRL(totalOwedToMe)}
              </Text>
            </View>
          </Card>
          <Card className="bg-transparent aspect-square flex-1 rounded-3xl">
            <View className="flex-1 justify-between px-5">
              <Text className="text-muted-foreground text-sm">Você deve</Text>
              <Text className="text-white text-2xl font-extrabold">
                {formatBRL(totalIOwe)}
              </Text>
            </View>
          </Card>
        </View>

        <Card className="bg-transparent mb-6 py-6 px-6 rounded-3xl flex-row items-center justify-between">
          <Wallet
            size={38}
            color={net > 0 ? theme.primary : theme.destructive}
          />
          <Text
            className={`text-4xl font-extrabold ${net > 0 ? "text-primary" : "text-destructive"}`}
          >
            {formatBRL(net)}
          </Text>
        </Card>

        <Text className="text-foreground mb-2 text-lg font-semibold">
          Eu devo
        </Text>
        {iOwe.length === 0 ? (
          <Text className="text-muted-foreground mb-6">Você está em dia.</Text>
        ) : (
          <View className="mb-6">
            {iOwe.map((d) => (
              <DebtRow
                key={d.expenseId + d.otherUserId}
                item={d}
                userName={userName(d.otherUserId)}
                owed={false}
              />
            ))}
          </View>
        )}

        <Text className="text-foreground mb-2 text-lg font-semibold">
          Me devem
        </Text>
        {owedToMe.length === 0 ? (
          <Text className="text-muted-foreground">Ninguém te deve agora.</Text>
        ) : (
          <View>
            {owedToMe.map((d) => (
              <DebtRow
                key={d.expenseId + d.otherUserId}
                item={d}
                userName={userName(d.otherUserId)}
                owed
              />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

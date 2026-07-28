import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import BackButton from "@/components/back-button";
import { BalanceCard } from "@/features/expenses/components/balance-card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useFriendBalance } from "@/features/expenses/hooks/use-friend-balances";
import {
  useReminderStatus,
  useSendReminder,
} from "@/features/notifications/hooks/use-reminders";
import { useAllMemberProfiles } from "@/features/groups/hooks/use-all-member-profiles";
import { useGroups } from "@/features/groups/hooks/use-groups";
import { useTheme } from "@/hooks/use-theme";
import type { DebtItem } from "@/features/expenses/hooks/use-debt-summaries";
import { Image } from "expo-image";
import { router, useLocalSearchParams, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import { Bell, User } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

function formatBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Aguardando confirmação",
  CONFIRMED: "Confirmado",
  REJECTED: "Rejeitado",
};

type Segment = "iOwe" | "owedToMe";

const SEGMENTS = [
  { label: "Você deve", value: "iOwe" },
  { label: "Te deve", value: "owedToMe" },
];

/** Hours (rounded up) until `iso`, or 0 if already past. */
function hoursUntil(iso: string | null | undefined): number {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 3_600_000);
}

export default function FriendDetailScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const theme = useTheme();
  const { friend } = useFriendBalance(userId);
  const profiles = useAllMemberProfiles();
  const { groups } = useGroups();

  const groupName = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups) m.set(g._id, g.name);
    return m;
  }, [groups]);

  const name = profiles.get(userId ?? "")?.fullName ?? "Amigo";
  const avatarUrl = profiles.get(userId ?? "")?.avatarUrl;

  const iOweItems = friend?.iOweItems ?? [];
  const owedToMeItems = friend?.owedToMeItems ?? [];
  const net = friend?.net ?? 0;

  const [segment, setSegment] = useState<Segment>(
    net < 0 ? "iOwe" : "owedToMe",
  );

  const items = segment === "iOwe" ? iOweItems : owedToMeItems;

  const openExpense = (d: DebtItem) => {
    router.push(`/group/${d.groupId}/expense/${d.expenseId}` as Href);
  };

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <BackButton />
        <View
          className="items-center justify-center overflow-hidden rounded-full bg-muted"
          style={{ width: 40, height: 40 }}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={{ width: 40, height: 40 }}
              contentFit="cover"
            />
          ) : (
            <User size={18} color={theme.foreground} />
          )}
        </View>
        <Text
          className="text-foreground text-xl font-bold flex-1"
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>

      <ScrollView
        className="px-4"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }}
      >
        <View className="mb-6">
          <BalanceCard amount={net} />
        </View>

        <View className="mb-4">
          <SegmentedControl
            options={SEGMENTS}
            value={segment}
            onChange={(v) => setSegment(v as Segment)}
          />
        </View>

        {items.length === 0 ? (
          <Text className="text-muted-foreground mt-8 text-center">
            Nada aqui.
          </Text>
        ) : (
          items.map((d) => (
            <Pressable
              key={d.expenseId}
              onPress={() => openExpense(d)}
              className="active:opacity-80"
            >
              <Card className="mb-3 py-3">
                <View className="flex-row items-center justify-between gap-3 px-4">
                  <View className="flex-1">
                    <Text
                      className="text-foreground font-medium"
                      numberOfLines={1}
                    >
                      {d.description}
                    </Text>
                    <Text className="text-muted-foreground text-sm">
                      {groupName.get(d.groupId) ?? "Grupo"}
                      {d.status === "PAID" ? ` · ${STATUS_LABEL.PAID}` : ""}
                    </Text>
                  </View>
                  <Text
                    className={
                      segment === "owedToMe"
                        ? "text-primary font-semibold"
                        : "text-destructive font-semibold"
                    }
                  >
                    {formatBRL(d.amount)}
                  </Text>
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>

      <FooterAction
        segment={segment}
        userId={userId}
        name={name}
        hasIOwe={iOweItems.length > 0}
        hasOwedToMe={owedToMeItems.length > 0}
      />
    </SafeAreaView>
  );
}

/** Segment-dependent bottom action: nudge (Te deve) or pay (Você deve). */
function FooterAction({
  segment,
  userId,
  name,
  hasIOwe,
  hasOwedToMe,
}: {
  segment: Segment;
  userId: string | undefined;
  name: string;
  hasIOwe: boolean;
  hasOwedToMe: boolean;
}) {
  const { status } = useReminderStatus(
    segment === "owedToMe" ? userId : undefined,
  );
  const { send, isLoading } = useSendReminder();
  const insets = useSafeAreaInsets();
  const footerPaddingBottom = insets.bottom + 16;

  if (segment === "owedToMe") {
    if (!hasOwedToMe) return null;
    const canSend = status?.canSend ?? true;
    const hours = hoursUntil(status?.nextAvailableAt);
    const disabled = !canSend || isLoading;

    const onPress = async () => {
      Haptics.selectionAsync();
      const res = await send(userId!);
      if (res.sent) {
        Alert.alert("Cobrança enviada", `${name.split(" ")[0]} foi notificado.`);
      } else {
        Alert.alert(
          "Aguarde um pouco",
          "Você já cobrou este amigo recentemente.",
        );
      }
    };

    return (
      <View
        className="border-border bg-background absolute inset-x-0 bottom-0 border-t px-4 pt-3"
        style={{ paddingBottom: footerPaddingBottom }}
      >
        <Pressable
          onPress={onPress}
          disabled={disabled}
          className={`h-12 flex-row items-center justify-center gap-2 rounded-xl ${
            disabled ? "bg-muted" : "bg-primary active:opacity-90"
          }`}
        >
          <Bell size={18} color={disabled ? "#9CA3AF" : "#FFFFFF"} />
          <Text
            className={`font-semibold ${
              disabled ? "text-muted-foreground" : "text-primary-foreground"
            }`}
          >
            {canSend ? "Enviar notificação" : `Disponível em ${hours}h`}
          </Text>
        </Pressable>
      </View>
    );
  }

  // segment === "iOwe"
  if (!hasIOwe) return null;
  return (
    <View
      className="border-border bg-background absolute inset-x-0 bottom-0 border-t px-4 pt-3"
      style={{ paddingBottom: footerPaddingBottom }}
    >
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          router.push(`/friend/${userId}/pay` as Href);
        }}
        className="bg-primary h-12 items-center justify-center rounded-xl active:opacity-90"
      >
        <Text className="text-primary-foreground font-semibold">
          Acertar dívidas
        </Text>
      </Pressable>
    </View>
  );
}

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { BalanceCard } from "@/features/expenses/components/balance-card";
import { useTabScreenTopPadding } from "@/hooks/use-tab-screen-top-padding";
import { useFriendBalances } from "@/features/expenses/hooks/use-friend-balances";
import { useAllMemberProfiles } from "@/features/groups/hooks/use-all-member-profiles";
import { useTheme } from "@/hooks/use-theme";
import { Image } from "expo-image";
import { router, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import { ChevronRight, User } from "lucide-react-native";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";

function formatBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

export default function FriendsScreen() {
  const theme = useTheme();
  const topPadding = useTabScreenTopPadding();
  const { friends, net, refetch } = useFriendBalances();
  const profiles = useAllMemberProfiles();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const openFriend = (userId: string) => {
    Haptics.selectionAsync();
    router.push(`/friend/${userId}` as Href);
  };

  return (
    <View className="bg-background flex-1 px-4">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ ...topPadding, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <Text className="text-foreground text-3xl font-extrabold tracking-tight mb-4">
          Amigos
        </Text>

        <View className="mb-6">
          <BalanceCard amount={net} />
        </View>

        {friends.length === 0 ? (
          <View className="items-center justify-center pt-16">
            <Text className="text-foreground text-lg font-semibold">
              Você está em dia
            </Text>
            <Text className="text-muted-foreground mt-1 px-6 text-center">
              Ninguém te deve e você não deve a ninguém.
            </Text>
          </View>
        ) : (
          friends.map((f) => {
            const profile = profiles.get(f.userId);
            const name = profile?.fullName ?? "Alguém";
            const owed = f.net > 0; // they owe me
            return (
              <Pressable
                key={f.userId}
                onPress={() => openFriend(f.userId)}
                className="active:opacity-80"
              >
                <Card className="mb-3 py-3">
                  <View className="flex-row items-center gap-3 px-3">
                    <View
                      className="items-center justify-center overflow-hidden rounded-full bg-muted"
                      style={{ width: 44, height: 44 }}
                    >
                      {profile?.avatarUrl ? (
                        <Image
                          source={{ uri: profile.avatarUrl }}
                          style={{ width: 44, height: 44 }}
                          contentFit="cover"
                        />
                      ) : (
                        <User size={20} color={theme.foreground} />
                      )}
                    </View>
                    <View className="flex-1">
                      <Text
                        className="text-foreground font-medium"
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                      <Text className="text-muted-foreground text-sm">
                        {owed ? "te deve" : "você deve"}
                      </Text>
                    </View>
                    <Text
                      className={
                        owed
                          ? "text-primary font-semibold"
                          : "text-destructive font-semibold"
                      }
                    >
                      {formatBRL(Math.abs(f.net))}
                    </Text>
                    <ChevronRight size={18} color={theme.mutedForeground} />
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

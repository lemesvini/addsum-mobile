import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import {
  useNotifications,
  useNotificationsMutations,
} from "@/features/notifications/hooks/use-notifications";
import type { AppNotification } from "@/features/notifications/api/notifications-api";
import { useTheme } from "@/hooks/use-theme";
import { router, type Href } from "expo-router";
import { Bell, Check, Receipt, Users, Wallet, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";

function iconForType(type: string) {
  switch (type) {
    case "EXPENSE_ADDED":
      return Receipt;
    case "PAYMENT_DECLARED":
      return Wallet;
    case "PAYMENT_CONFIRMED":
      return Check;
    case "PAYMENT_REJECTED":
      return X;
    case "GROUP_JOINED":
    case "GROUP_LEFT":
      return Users;
    default:
      return Bell;
  }
}

/** Short relative time in pt-BR. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.max(0, Math.floor((Date.now() - then) / 60000));
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD} d`;
}

function targetHref(n: AppNotification): Href | null {
  const groupId = n.data?.groupId;
  const expenseId = n.data?.expenseId;
  if (groupId && expenseId)
    return `/group/${groupId}/expense/${expenseId}` as Href;
  if (groupId) return `/group/${groupId}` as Href;
  return null;
}

export default function NotificationsScreen() {
  const theme = useTheme();
  const { notifications, isLoading, refetch } = useNotifications();
  const { markAllRead } = useNotificationsMutations();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  // Mark everything read when the screen is opened.
  useEffect(() => {
    if (!isLoading && notifications.some((n) => !n.read)) {
      void markAllRead();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  return (
    <View className="bg-background flex-1 px-4">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {notifications.length === 0 ? (
          <View className="flex-1 items-center justify-center pt-24">
            <Bell size={40} color={theme.mutedForeground} />
            <Text className="text-muted-foreground mt-3">
              Nenhuma notificação ainda.
            </Text>
          </View>
        ) : (
          notifications.map((n) => {
            const Icon = iconForType(n.type);
            const href = targetHref(n);
            return (
              <Pressable
                key={n._id}
                disabled={!href}
                onPress={() => href && router.push(href)}
                className="active:opacity-80"
              >
                <Card className="mb-3 flex-row items-center gap-3 py-3 px-4">
                  <View className="bg-muted h-10 w-10 items-center justify-center rounded-full">
                    <Icon size={20} color={theme.foreground} />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground font-semibold">
                      {n.title}
                    </Text>
                    <Text
                      className="text-muted-foreground text-sm"
                      numberOfLines={2}
                    >
                      {n.body}
                    </Text>
                  </View>
                  <Text className="text-muted-foreground text-xs">
                    {relativeTime(n.createdAt)}
                  </Text>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

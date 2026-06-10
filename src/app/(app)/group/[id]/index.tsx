import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useGroup } from "@/features/groups/hooks/use-group";
import { useGroupMembers } from "@/features/groups/hooks/use-group-members";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { categoryColor } from "@/features/categories/constants";
import { useExpenses } from "@/features/expenses/hooks/use-expenses";
import { useExpenseParticipants } from "@/features/expenses/hooks/use-expense-participants";
import { useUsers } from "@/features/users/hooks/use-users";
import { useAuthUser } from "@/features/auth/auth-store";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Link, router, useLocalSearchParams, type Href } from "expo-router";
import {
  ArrowLeft,
  Check,
  Pencil,
  Plus,
  QrCode,
  Users,
} from "lucide-react-native";
import { useMemo } from "react";
import { Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { PieChart } from "react-native-gifted-charts";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/use-theme";
import BackButton from "@/components/back-button";

const HERO_HEIGHT = 300;

/** Donut slice colors: paid (green), awaiting confirmation (amber), to pay (gray). */
const CHART_PAID = "#22C55E";
const CHART_AWAITING = "#F59E0B";

function formatBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

/** Short relative time in pt-BR, e.g. "agora", "há 5 min", "há 3 d". */
function createdAtRelative(iso: string | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (diffSec < 60) return "agora";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `há ${diffHour} h`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `há ${diffDay} d`;
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

type ExpenseSplit = {
  confirmed: number;
  awaiting: number;
  toPay: number;
  total: number;
  paidCount: number;
  count: number;
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { group } = useGroup(id);
  const { members } = useGroupMembers(id);
  const { expenses } = useExpenses(id);
  const expenseIds = useMemo(() => expenses.map((e) => e._id), [expenses]);
  const { participants } = useExpenseParticipants(undefined, expenseIds);
  const { categories } = useCategories(id);
  const { users } = useUsers();
  const authUser = useAuthUser();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const isAdmin = !!group && !!authUser && group.adminUserId === authUser._id;

  const headerHeight = insets.top + 52;

  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // Hero parallax + pull-to-stretch
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [-HERO_HEIGHT, 0, HERO_HEIGHT],
          [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.6],
        ),
      },
      {
        scale: interpolate(scrollY.value, [-HERO_HEIGHT, 0], [2.2, 1], {
          extrapolateRight: Extrapolation.CLAMP,
        }),
      },
    ],
  }));

  // Title overlay fades out as the hero scrolls away
  const heroOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, HERO_HEIGHT - headerHeight - 40],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Sticky header fades in once the hero is scrolled past
  const stickyHeaderStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [HERO_HEIGHT - headerHeight - 40, HERO_HEIGHT - headerHeight],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  const categoryName = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categories) m.set(c._id, c.name);
    return m;
  }, [categories]);

  const userName = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u._id, u.fullName);
    return m;
  }, [users]);

  // Aggregate each expense's participants into paid / awaiting / to-pay.
  const splitByExpense = useMemo(() => {
    const m = new Map<string, ExpenseSplit>();
    for (const p of participants) {
      let s = m.get(p.expenseId);
      if (!s) {
        s = {
          confirmed: 0,
          awaiting: 0,
          toPay: 0,
          total: 0,
          paidCount: 0,
          count: 0,
        };
        m.set(p.expenseId, s);
      }
      if (p.status === "CONFIRMED") {
        s.confirmed += p.amountOwed;
        s.paidCount += 1;
      } else if (p.status === "PAID") s.awaiting += p.amountOwed;
      else s.toPay += p.amountOwed; // PENDING + REJECTED
      s.total += p.amountOwed;
      s.count += 1;
    }
    return m;
  }, [participants]);

  // A finished expense is one whose every participant has CONFIRMED.
  const isCompleted = (expenseId: string) => {
    const s = splitByExpense.get(expenseId);
    return !!s && s.count > 0 && s.paidCount === s.count;
  };

  const activeExpenses = useMemo(
    () => expenses.filter((e) => !isCompleted(e._id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, splitByExpense],
  );
  const completedExpenses = useMemo(
    () => expenses.filter((e) => isCompleted(e._id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expenses, splitByExpense],
  );

  // One expense row, shared by both listings. `indicator` is the leading
  // visual (donut chart for active, green check for completed history).
  const renderExpenseRow = (
    e: (typeof expenses)[number],
    indicator: React.ReactNode,
  ) => (
    <Pressable
      key={e._id}
      onPress={() => router.push(`/group/${id}/expense/${e._id}` as Href)}
      className="active:opacity-80"
    >
      <Card className="mb-3 py-4">
        <View className="flex-row items-center justify-between px-3">
          <View className="flex-1 flex-row items-center gap-3">
            {indicator}
            <View className="flex-1">
              <Text className="text-foreground font-medium">
                {e.description}
              </Text>
              <Text className="text-muted-foreground text-sm">
                {categoryName.get(e.categoryId) ?? "Categoria"} ·{" "}
                {createdAtRelative(e.createdAt)}
              </Text>
            </View>
          </View>
          <Text className="text-foreground font-semibold">
            {formatBRL(e.totalAmount)}
          </Text>
        </View>
      </Card>
    </Pressable>
  );

  return (
    <View className="bg-background flex-1">
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero */}
        <View style={{ height: HERO_HEIGHT, overflow: "hidden" }}>
          <Animated.View style={[StyleSheet.absoluteFill, heroStyle]}>
            <Link.AppleZoomTarget>
              {group?.imageUrl ? (
                <Image
                  source={{ uri: group.imageUrl }}
                  style={{ width: "100%", height: HERO_HEIGHT }}
                  contentFit="cover"
                />
              ) : (
                <View className="bg-primary h-full w-full" />
              )}
            </Link.AppleZoomTarget>
          </Animated.View>

          <LinearGradient
            colors={["transparent", theme.background]}
            locations={[0.35, 1]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          <Animated.View
            style={heroOverlayStyle}
            className="absolute inset-x-0 bottom-0 items-start px-5 pb-5"
            pointerEvents="none"
          >
            <Text
              className="text-foreground text-left text-3xl font-extrabold"
              numberOfLines={2}
            >
              {group?.name ?? "Grupo"}
            </Text>
            <View className="mt-2 flex-row items-center justify-start gap-2">
              <Users size={16} color="#6B7280" />
              <Text className="text-muted-foreground text-sm font-medium">
                {members.length} {members.length === 1 ? "membro" : "membros"}
                {group?.inviteCode ? ` · ${group.inviteCode}` : ""}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Content */}
        {/* <View className="px-5 pt-5">
          <Card className="flex-row items-center justify-center gap-2 px-6 py-4 bg-primary rounded-full">
            <Plus size={20} color="#FFFFFF" />
            <Text className="font-bold">Nova Despesa</Text>
          </Card>
        </View> */}
        <View className="bg-background px-5 pt-5">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-foreground text-lg font-semibold">
              Em aberto
            </Text>
          </View>

          {activeExpenses.length === 0 ? (
            <Card className="items-center py-10">
              <Text className="text-muted-foreground px-6 text-center">
                {expenses.length === 0
                  ? "Nenhuma despesa ainda. Adicione a primeira!"
                  : "Tudo certo! Nenhuma despesa pendente."}
              </Text>
            </Card>
          ) : (
            activeExpenses.map((e) => {
              const split = splitByExpense.get(e._id);
              const indicator =
                split && split.total > 0 ? (
                  <PieChart
                    donut
                    radius={20}
                    innerRadius={15}
                    innerCircleColor={theme.card}
                    data={[
                      { value: split.confirmed, color: CHART_PAID },
                      { value: split.awaiting, color: CHART_AWAITING },
                      { value: split.toPay, color: theme.mutedForeground },
                    ].filter((d) => d.value > 0)}
                  />
                ) : null;
              return renderExpenseRow(e, indicator);
            })
          )}
        </View>

        {/* Histórico — expenses where every payment is confirmed */}
        {completedExpenses.length > 0 ? (
          <View className="bg-background px-5 pt-5">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-foreground text-lg font-semibold">
                Histórico
              </Text>
            </View>

            {completedExpenses.map((e) =>
              renderExpenseRow(
                e,
                <View
                  className="items-center justify-center rounded-full"
                  style={{ width: 40, height: 40, backgroundColor: CHART_PAID }}
                >
                  <Check size={22} color="#FFFFFF" strokeWidth={3} />
                </View>,
              ),
            )}
          </View>
        ) : null}
      </Animated.ScrollView>

      {/* Sticky header (non-interactive bar; fades in on scroll) */}
      <Animated.View
        style={[
          stickyHeaderStyle,
          {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: headerHeight,
            paddingTop: insets.top,
          },
        ]}
        pointerEvents="none"
        className="bg-background border-border flex-row items-center justify-center border-b"
      >
        <Text
          className="text-foreground px-16 text-lg font-bold"
          numberOfLines={1}
        >
          {group?.name ?? "Grupo"}
        </Text>
      </Animated.View>

      {/* Floating controls (always tappable, over image and header) */}
      <View
        style={{ top: insets.top + 6 }}
        className="absolute left-4 right-4 flex-row items-center justify-between"
      >
        <BackButton />
        <View className="flex-row items-center gap-3">
          {isAdmin ? (
            <TouchableOpacity
              onPress={() =>
                router.push(`(modals)/edit-group-modal?id=${id}` as Href)
              }
              hitSlop={8}
              className="h-10 w-10 items-center justify-center rounded-full"
              style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
            >
              <Pencil size={20} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={() =>
              router.push(`(modals)/share-group-modal?id=${id}` as Href)
            }
            hitSlop={8}
            className="h-10 w-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
          >
            <QrCode size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="absolute bottom-8 right-5">
        <Pressable
          className="bg-primary p-4 flex flex-row items-center gap-2 rounded-full"
          onPress={() => router.push(`/group/${id}/new-expense` as any)}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text className="text-primary-foreground font-semibold">
            Nova despesa
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

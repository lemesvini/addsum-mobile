import { useMemo, useState } from "react";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { router, type Href } from "expo-router";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import { Receipt, Search as SearchIcon, Users, X } from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { useTabScreenTopPadding } from "@/hooks/use-tab-screen-top-padding";
import { useGroups } from "@/features/groups/hooks/use-groups";
import { useAllExpenses } from "@/features/expenses/hooks/use-all-expenses";
import { useTheme } from "@/hooks/use-theme";

function formatBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

export default function SearchScreen() {
  const theme = useTheme();
  const topPadding = useTabScreenTopPadding();
  const [query, setQuery] = useState("");

  const { groups } = useGroups();
  const { expenses } = useAllExpenses();

  const term = query.trim().toLowerCase();

  const groupName = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups) m.set(g._id, g.name);
    return m;
  }, [groups]);

  const matchedGroups = useMemo(() => {
    if (!term) return [];
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        (g.description?.toLowerCase().includes(term) ?? false),
    );
  }, [groups, term]);

  const matchedExpenses = useMemo(() => {
    if (!term) return [];
    return expenses.filter((e) => e.description.toLowerCase().includes(term));
  }, [expenses, term]);

  const openGroup = (groupId: string) => {
    router.push(`/group/${groupId}` as Href);
  };

  const openExpense = (groupId: string, expenseId: string) => {
    Haptics.impactAsync();
    router.push(`/group/${groupId}` as Href);

    setTimeout(() => {
      router.push(`/group/${groupId}/expense/${expenseId}` as Href);
    }, 500);
  };

  const hasQuery = term.length > 0;
  const hasResults = matchedGroups.length > 0 || matchedExpenses.length > 0;

  return (
    <View className="bg-background flex-1 px-4">
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ ...topPadding, paddingBottom: 120 }}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-foreground mb-4 text-3xl font-extrabold tracking-tight">
          Buscar
        </Text>

        <View className="border-border bg-card mb-2 flex-row items-center gap-2 rounded-2xl border px-4">
          <SearchIcon size={18} color={theme.mutedForeground} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar grupos e despesas..."
            placeholderTextColor={theme.mutedForeground}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={{
              flex: 1,
              paddingVertical: 12,
              fontSize: 15,
              color: theme.cardForeground,
            }}
          />
          {query.length > 0 ? (
            <Pressable
              onPress={() => setQuery("")}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
            >
              <X size={18} color={theme.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        {!hasQuery ? (
          <Text className="text-muted-foreground mt-12 text-center">
            
          </Text>
        ) : !hasResults ? (
          <Text className="text-muted-foreground mt-12 text-center">
            Nenhum resultado para “{query.trim()}”.
          </Text>
        ) : (
          <>
            {matchedGroups.length > 0 ? (
              <View className="mt-4">
                <Text className="text-muted-foreground mb-2 text-sm font-semibold uppercase tracking-wide">
                  Grupos
                </Text>
                {matchedGroups.map((g) => (
                  <Pressable
                    key={g._id}
                    onPress={() => openGroup(g._id)}
                    className="active:opacity-80"
                  >
                    <Card className="mb-3 py-3">
                      <View className="flex-row items-center gap-3 px-3">
                        <View
                          className="items-center justify-center overflow-hidden rounded-2xl"
                          style={{
                            width: 44,
                            height: 44,
                            backgroundColor: theme.primary,
                          }}
                        >
                          {g.imageUrl ? (
                            <Image
                              source={{ uri: g.imageUrl }}
                              style={{ width: 44, height: 44 }}
                              contentFit="cover"
                            />
                          ) : (
                            <Users size={22} color="#FFFFFF" />
                          )}
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-foreground font-medium"
                            numberOfLines={1}
                          >
                            {g.name}
                          </Text>
                          {g.description ? (
                            <Text
                              className="text-muted-foreground text-sm"
                              numberOfLines={1}
                            >
                              {g.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {matchedExpenses.length > 0 ? (
              <View className="mt-4">
                <Text className="text-muted-foreground mb-2 text-sm font-semibold uppercase tracking-wide">
                  Despesas
                </Text>
                {matchedExpenses.map((e) => (
                  <Pressable
                    key={e._id}
                    onPress={() => openExpense(e.groupId, e._id)}
                    className="active:opacity-80"
                  >
                    <Card className="mb-3 py-3">
                      <View className="flex-row items-center justify-between gap-3 px-3">
                        <View className="flex-1 flex-row items-center gap-3">
                          <View
                            className="items-center justify-center rounded-2xl"
                            style={{
                              width: 44,
                              height: 44,
                              backgroundColor: theme.muted,
                            }}
                          >
                            <Receipt size={22} color={theme.foreground} />
                          </View>
                          <View className="flex-1">
                            <Text
                              className="text-foreground font-medium"
                              numberOfLines={1}
                            >
                              {e.description}
                            </Text>
                            <Text
                              className="text-muted-foreground text-sm"
                              numberOfLines={1}
                            >
                              {groupName.get(e.groupId) ?? "Grupo"}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-foreground font-semibold">
                          {formatBRL(e.totalAmount)}
                        </Text>
                      </View>
                    </Card>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import BackButton from "@/components/back-button";
import { CopyableField } from "@/components/ui/copyable-field";
import { useFriendBalance } from "@/features/expenses/hooks/use-friend-balances";
import { useExpensesMutations } from "@/features/expenses/hooks/use-expenses-mutations";
import { useAllMemberProfiles } from "@/features/groups/hooks/use-all-member-profiles";
import { useGroups } from "@/features/groups/hooks/use-groups";
import { formatPixKey, getPixKeyLabel } from "@/common/utils/pix";
import { buildPixPayload } from "@/common/utils/pix-brcode";
import type { DebtItem } from "@/features/expenses/hooks/use-debt-summaries";
import { useTheme } from "@/hooks/use-theme";
import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronDown, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

function formatBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

/** Only unpaid rows can be declared; PAID ones are already awaiting confirmation. */
function isPayable(status: string): boolean {
  return status === "PENDING" || status === "REJECTED";
}

export default function PayFriendScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const theme = useTheme();
  const { friend } = useFriendBalance(userId);
  const profiles = useAllMemberProfiles();
  const { groups } = useGroups();
  const { declarePayment } = useExpensesMutations();
  const insets = useSafeAreaInsets();
  const footerPaddingBottom = insets.bottom + 16;

  const profile = profiles.get(userId ?? "");
  const name = profile?.fullName ?? "Amigo";
  const pix = profile?.pix?.trim() ?? "";

  const groupName = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups) m.set(g._id, g.name);
    return m;
  }, [groups]);

  const items = friend?.iOweItems ?? [];

  // Group the expenses I owe by group.
  const byGroup = useMemo(() => {
    const m = new Map<string, DebtItem[]>();
    for (const d of items) {
      const list = m.get(d.groupId) ?? [];
      list.push(d);
      m.set(d.groupId, list);
    }
    return Array.from(m.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items)]);

  // Selection (expenseId set) — default to all payable rows.
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const payableIds = useMemo(
    () => items.filter((d) => isPayable(d.status)).map((d) => d.expenseId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(items)],
  );
  const selectedSet = selected ?? new Set(payableIds);

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isExpanded = (gid: string) => expanded[gid] ?? true;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (expenseId: string) => {
    const next = new Set(selectedSet);
    if (next.has(expenseId)) next.delete(expenseId);
    else next.add(expenseId);
    setSelected(next);
  };

  const selectedItems = items.filter(
    (d) => isPayable(d.status) && selectedSet.has(d.expenseId),
  );
  const total = selectedItems.reduce((s, d) => s + d.amount, 0);

  const onMarkPaid = async () => {
    if (selectedItems.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      for (const d of selectedItems) {
        await declarePayment({
          groupId: d.groupId,
          expenseId: d.expenseId,
          participantId: d.participantId,
        });
      }
      router.back();
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível marcar como pago.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="bg-background flex-1" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <BackButton />
        <Text className="text-foreground text-xl font-bold flex-1" numberOfLines={1}>
          Pagar {name.split(" ")[0]}
        </Text>
      </View>

      <ScrollView
        className="px-4"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 260 }}
      >
        {items.length === 0 ? (
          <Text className="text-muted-foreground mt-8 text-center">
            Você não deve nada a {name.split(" ")[0]}.
          </Text>
        ) : (
          byGroup.map(([gid, groupItems]) => {
            const subtotal = groupItems
              .filter((d) => isPayable(d.status) && selectedSet.has(d.expenseId))
              .reduce((s, d) => s + d.amount, 0);
            return (
              <View key={gid} className="mb-3">
                <Pressable
                  onPress={() =>
                    setExpanded((e) => ({ ...e, [gid]: !isExpanded(gid) }))
                  }
                  className="flex-row items-center justify-between py-2"
                >
                  <View className="flex-row items-center gap-2">
                    {isExpanded(gid) ? (
                      <ChevronDown size={18} color={theme.mutedForeground} />
                    ) : (
                      <ChevronRight size={18} color={theme.mutedForeground} />
                    )}
                    <Text className="text-foreground font-semibold">
                      {groupName.get(gid) ?? "Grupo"}
                    </Text>
                  </View>
                  <Text className="text-muted-foreground text-sm">
                    {formatBRL(subtotal)}
                  </Text>
                </Pressable>

                {isExpanded(gid)
                  ? groupItems.map((d) => {
                      const payable = isPayable(d.status);
                      const checked = payable && selectedSet.has(d.expenseId);
                      return (
                        <Pressable
                          key={d.expenseId}
                          disabled={!payable}
                          onPress={() => toggle(d.expenseId)}
                          className="active:opacity-80"
                        >
                          <Card className="mb-2 py-3">
                            <View className="flex-row items-center gap-3 px-4">
                              <View
                                className={
                                  checked
                                    ? "bg-primary h-6 w-6 items-center justify-center rounded-md"
                                    : "border-border h-6 w-6 items-center justify-center rounded-md border"
                                }
                              >
                                {checked ? (
                                  <Check size={14} color="#FFFFFF" />
                                ) : null}
                              </View>
                              <View className="flex-1">
                                <Text
                                  className="text-foreground font-medium"
                                  numberOfLines={1}
                                >
                                  {d.description}
                                </Text>
                                {!payable ? (
                                  <Text className="text-primary text-xs">
                                    Aguardando confirmação
                                  </Text>
                                ) : null}
                              </View>
                              <Text className="text-foreground font-semibold">
                                {formatBRL(d.amount)}
                              </Text>
                            </View>
                          </Card>
                        </Pressable>
                      );
                    })
                  : null}
              </View>
            );
          })
        )}

        {error ? (
          <Text className="text-destructive mt-3 text-sm">{error}</Text>
        ) : null}
      </ScrollView>

      {/* Sticky footer: Pix + total + declare */}
      {items.length > 0 ? (
        <View
          className="border-border bg-background absolute inset-x-0 bottom-0 gap-3 border-t px-4 pt-3"
          style={{ paddingBottom: footerPaddingBottom }}
        >
          {pix ? (
            <View className="gap-2">
              <CopyableField
                label="Chave Pix"
                displayValue={formatPixKey(pix)}
                copyValue={pix}
                caption={getPixKeyLabel(pix)}
              />
              <CopyableField
                label="Pix copia e cola"
                displayValue="Toque em copiar para pagar o valor selecionado"
                copyValue={buildPixPayload({
                  pixKey: pix,
                  amount: total,
                  merchantName: name,
                })}
                caption={formatBRL(total)}
              />
            </View>
          ) : (
            <Text className="text-muted-foreground text-xs">
              {name.split(" ")[0]} ainda não cadastrou uma chave Pix.
            </Text>
          )}

          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-sm">
              Total selecionado
            </Text>
            <Text className="text-foreground text-lg font-extrabold">
              {formatBRL(total)}
            </Text>
          </View>

          <Pressable
            onPress={onMarkPaid}
            disabled={busy || selectedItems.length === 0}
            className={`h-12 items-center justify-center rounded-xl ${
              busy || selectedItems.length === 0
                ? "bg-muted"
                : "bg-primary active:opacity-90"
            }`}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text
                className={`font-semibold ${
                  selectedItems.length === 0
                    ? "text-muted-foreground"
                    : "text-primary-foreground"
                }`}
              >
                Marcar como pago ({selectedItems.length})
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

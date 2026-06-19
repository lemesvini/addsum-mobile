import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useAuthUser } from "@/features/auth/auth-store";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useExpense } from "@/features/expenses/hooks/use-expense";
import { useExpensesMutations } from "@/features/expenses/hooks/use-expenses-mutations";
import { useGroupMembers } from "@/features/groups/hooks/use-group-members";
import { useTheme } from "@/hooks/use-theme";
import { router, useLocalSearchParams } from "expo-router";
import { Image } from "expo-image";
import { Check, Image as ImageIcon, Trash2, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PieChart } from "react-native-gifted-charts";
import type { ExpenseParticipant } from "@/features/expenses/api/expenses-api";

function formatBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Aguardando confirmação",
  CONFIRMED: "Confirmado",
  REJECTED: "Rejeitado",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "text-muted-foreground",
  PAID: "text-primary",
  CONFIRMED: "text-primary",
  REJECTED: "text-destructive",
};

/** Donut slice colors: paid (green), awaiting confirmation (amber), to pay (gray). */
const CHART_PAID = "#22C55E";
const CHART_AWAITING = "#F59E0B";

export default function ExpenseDetailScreen() {
  const { id: groupId, expenseId } = useLocalSearchParams<{
    id: string;
    expenseId: string;
  }>();
  const theme = useTheme();
  const authUser = useAuthUser();
  const { expense, isLoading } = useExpense(groupId, expenseId);
  const participants = expense?.participants ?? [];
  const { members } = useGroupMembers(groupId);
  const { categories } = useCategories(groupId);
  const { declarePayment, confirmPayment, rejectPayment, deleteExpense } =
    useExpensesMutations();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false);

  const userName = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of members) m.set(u._id, u.fullName);
    return m;
  }, [members]);

  const categoryName = useMemo(
    () =>
      categories.find((c) => c._id === expense?.categoryId)?.name ??
      "Categoria",
    [categories, expense?.categoryId],
  );

  // Aggregate the split into paid / awaiting-confirmation / still-to-pay.
  const split = useMemo(() => {
    let confirmed = 0;
    let awaiting = 0;
    let toPay = 0;
    let paidCount = 0;
    for (const p of participants) {
      if (p.status === "CONFIRMED") {
        confirmed += p.amountOwed;
        paidCount += 1;
      } else if (p.status === "PAID") awaiting += p.amountOwed;
      else toPay += p.amountOwed; // PENDING + REJECTED
    }
    return {
      confirmed,
      awaiting,
      toPay,
      total: confirmed + awaiting + toPay,
      paidCount,
      count: participants.length,
    };
  }, [participants]);

  const isCreator =
    !!expense && !!authUser && expense.createdByUserId === authUser._id;

  const run = async (id: string, fn: () => Promise<void>) => {
    setError(null);
    setBusyId(id);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível atualizar o pagamento");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteExpense = () => {
    Alert.alert(
      "Excluir despesa",
      "Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpense({ groupId, expenseId });
              router.back();
            } catch (e: any) {
              Alert.alert(
                "Erro",
                e?.message ?? "Não foi possível excluir a despesa.",
              );
            }
          },
        },
      ],
    );
  };

  const header = (
    <View className="flex-row items-center justify-between px-5 py-3 mt-2">
      <Text className="text-muted-foreground text-lg font-bold">
        Detalhes da despesa
      </Text>
      {isCreator ? (
        <TouchableOpacity
          onPress={handleDeleteExpense}
          hitSlop={8}
          className="flex-row items-center gap-1.5"
        >
          <Trash2 size={20} color={theme.destructive} />
          {/* <Text className="text-destructive font-semibold">Excluir</Text> */}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <X size={24} color={theme.foreground} />
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="bg-background flex-1">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView className="bg-background flex-1">
        {header}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-muted-foreground text-center">
            Esta despesa não está mais disponível.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1">
      {header}
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
      >
        <View className="py-4 flex flex-row items-center justify-between">
          <View className="">
            <Text className="text-foreground text-3xl font-extrabold">
              {expense.description}
            </Text>
            <Text className="text-muted-foreground mt-1 text-sm">
              {categoryName}
            </Text>
            {/* <Text className="text-muted-foreground mt-1 text-sm">
              Criado por{" "}
              {userName.get(expense.createdByUserId)?.split(" ")[0] ?? "Alguém"}{" "}
              {"em "}
              {formatDate(expense.date)}
            </Text> */}
          </View>
          {split.total > 0 ? (
            <View>
              <PieChart
                donut
                radius={30}
                innerRadius={24}
                innerCircleColor={theme.card}
                data={[
                  { value: split.confirmed, color: CHART_PAID },
                  { value: split.awaiting, color: CHART_AWAITING },
                  { value: split.toPay, color: theme.mutedForeground },
                ].filter((d) => d.value > 0)}
                centerLabelComponent={() => (
                  <Text className="text-foreground text-sm font-extrabold">
                    {split.paidCount}/{split.count}
                  </Text>
                )}
              />
            </View>
          ) : null}
        </View>

        <View className="mt-6 mb-6">
          <View className="bg-transparent px-6 flex flex-row items-center justify-between">
            <Text className="text-muted-foreground">Criado por</Text>
            <Text className="">
              {userName.get(expense.createdByUserId) ?? "Alguém"}
            </Text>
          </View>
          <View className="bg-transparent mt-4 px-6 flex flex-row items-center justify-between">
            <Text className="text-muted-foreground">Criado em</Text>
            <Text className="">{formatDate(expense.date)}</Text>
          </View>
          <View className="bg-transparent mt-4 px-6 flex flex-row items-center justify-between">
            <Text className="text-muted-foreground">Valor da despesa</Text>
            <Text className="font-extrabold text-2xl text-primary">
              {formatBRL(expense.totalAmount)}
            </Text>
          </View>
        </View>

        {expense.receiptImageUrl ? (
          <Pressable
            onPress={() => setReceiptViewerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Ver comprovante"
            className="bg-secondary mt-2 h-11 flex-row items-center justify-center gap-2 rounded-md active:opacity-80"
          >
            <ImageIcon size={18} color={theme.secondaryForeground} />
            <Text className="text-secondary-foreground font-semibold">
              Ver comprovante
            </Text>
          </Pressable>
        ) : null}

        <Text className="text-foreground mb-2 mt-6 text-lg font-semibold">
          Divisão
        </Text>

        {participants.map((p) => {
          const isOwnRow = !!authUser && p.userId === authUser._id;
          const busy = busyId === p._id;
          return (
            <Card key={p._id} className="mb-3 py-3">
              <View className="px-6">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-foreground font-medium">
                      {userName.get(p.userId) ?? "Membro"}
                      {isOwnRow ? " (você)" : ""}
                    </Text>
                    <Text
                      className={`text-sm ${STATUS_CLASS[p.status] ?? "text-muted-foreground"}`}
                    >
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Text>
                  </View>
                  <Text className="text-foreground font-semibold">
                    {formatBRL(p.amountOwed)}
                  </Text>
                </View>

                <ParticipantActions
                  participant={p}
                  isOwnRow={isOwnRow}
                  isCreator={isCreator}
                  busy={busy}
                  onDeclare={() =>
                    run(p._id, () =>
                      declarePayment({
                        groupId,
                        expenseId,
                        participantId: p._id,
                      }),
                    )
                  }
                  onConfirm={() =>
                    run(p._id, () =>
                      confirmPayment({
                        groupId,
                        expenseId,
                        participantId: p._id,
                      }),
                    )
                  }
                  onReject={() =>
                    run(p._id, () =>
                      rejectPayment({
                        groupId,
                        expenseId,
                        participantId: p._id,
                      }),
                    )
                  }
                />
              </View>
            </Card>
          );
        })}

        {error ? (
          <Text className="text-destructive mt-2 text-sm">{error}</Text>
        ) : null}
      </ScrollView>

      {expense.receiptImageUrl ? (
        <Modal
          visible={receiptViewerOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setReceiptViewerOpen(false)}
        >
          <Pressable
            onPress={() => setReceiptViewerOpen(false)}
            className="flex-1 items-center justify-center"
            style={{ backgroundColor: "rgba(0,0,0,0.9)" }}
          >
            <TouchableOpacity
              onPress={() => setReceiptViewerOpen(false)}
              hitSlop={12}
              style={{ position: "absolute", top: 56, right: 20, zIndex: 1 }}
              accessibilityRole="button"
              accessibilityLabel="Fechar comprovante"
            >
              <X size={28} color="#fff" />
            </TouchableOpacity>
            <Image
              source={{ uri: expense.receiptImageUrl }}
              style={{ width: "92%", height: "80%" }}
              contentFit="contain"
            />
          </Pressable>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

/** A colored dot + label + amount, used beside the donut chart. */
function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
        }}
      />
      <View>
        <Text className="text-muted-foreground text-xs">{label}</Text>
        <Text className="text-foreground text-sm font-semibold">
          {formatBRL(value)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Role- and status-gated action row for a single participant.
 * - Own row, PENDING/REJECTED -> "Declarar pagamento".
 * - Creator viewing someone else's PAID row -> "Confirmar" / "Rejeitar".
 * - Otherwise renders nothing (just the status badge above is shown).
 */
function ParticipantActions({
  participant,
  isOwnRow,
  isCreator,
  busy,
  onDeclare,
  onConfirm,
  onReject,
}: {
  participant: ExpenseParticipant;
  isOwnRow: boolean;
  isCreator: boolean;
  busy: boolean;
  onDeclare: () => void;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const status = participant.status;

  if (
    isOwnRow &&
    !isCreator &&
    (status === "PENDING" || status === "REJECTED")
  ) {
    return (
      <Pressable
        disabled={busy}
        onPress={onDeclare}
        className={`bg-primary mt-3 h-10 flex-row items-center justify-center rounded-md active:opacity-90 ${
          busy ? "opacity-50" : ""
        }`}
      >
        <Text className="text-primary-foreground font-semibold">
          {busy
            ? "Enviando..."
            : status === "REJECTED"
              ? "Declarar novamente"
              : "Declarar pagamento"}
        </Text>
      </Pressable>
    );
  }

  if (isCreator && !isOwnRow && status === "PAID") {
    return (
      <View className="mt-3 flex-row gap-3">
        <Pressable
          disabled={busy}
          onPress={onConfirm}
          className={`bg-primary h-10 flex-1 flex-row items-center justify-center gap-1 rounded-md active:opacity-90 ${
            busy ? "opacity-50" : ""
          }`}
        >
          <Check size={16} color="#FFFFFF" />
          <Text className="text-primary-foreground font-semibold">
            Confirmar
          </Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={onReject}
          className={`bg-secondary h-10 flex-1 flex-row items-center justify-center rounded-md active:opacity-80 ${
            busy ? "opacity-50" : ""
          }`}
        >
          <Text className="text-secondary-foreground font-semibold">
            Rejeitar
          </Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

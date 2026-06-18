import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "@/features/auth/auth-store";
import {
  createExpense as apiCreateExpense,
  declarePayment as apiDeclarePayment,
  confirmPayment as apiConfirmPayment,
  rejectPayment as apiRejectPayment,
  type Expense,
} from "../api/expenses-api";
import type { ExpenseParticipantStatus } from "@/common/types/enums";
import { uploadLocalReceiptImageUrl } from "@/common/api/media-upload";
import { queryKeys } from "@/common/lib/query-keys";

type CreateExpenseInput = {
  groupId: string;
  categoryId: string;
  description: string;
  totalAmount: number;
  /** User _ids that share the expense. */
  participantUserIds: string[];
  /**
   * Explicit amount owed per user _id. When omitted the split is even.
   * When provided, the amounts must sum to `totalAmount`.
   */
  participantAmounts?: Record<string, number>;
  date?: string;
  /** Local `file://` URI of a receipt image; uploaded to S3 before POST. */
  receiptImageUrl?: string;
};

type PaymentArgs = {
  groupId: string;
  expenseId: string;
  participantId: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Splits `total` evenly across `count` participants, pushing any rounding
 * remainder onto the first share so the parts sum exactly to the total.
 */
function evenSplit(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = round2(total / count);
  const shares = Array.from({ length: count }, () => base);
  const drift = round2(total - base * count);
  shares[0] = round2(shares[0] + drift);
  return shares;
}

export function useExpensesMutations() {
  const qc = useQueryClient();
  const authUser = useAuthUser();

  const createMutation = useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const shares = input.participantAmounts
        ? input.participantUserIds.map((uid) =>
            round2(input.participantAmounts![uid] ?? 0),
          )
        : evenSplit(input.totalAmount, input.participantUserIds.length);

      const sharesSum = round2(shares.reduce((acc, s) => acc + s, 0));
      if (Math.abs(sharesSum - round2(input.totalAmount)) > 0.01) {
        throw new Error("A soma das partes não confere com o total");
      }

      const receiptImageUrl = input.receiptImageUrl
        ? await uploadLocalReceiptImageUrl(input.receiptImageUrl)
        : undefined;

      return apiCreateExpense(input.groupId, {
        categoryId: input.categoryId,
        description: input.description,
        totalAmount: input.totalAmount,
        date: input.date ?? new Date().toISOString(),
        ...(receiptImageUrl ? { receiptImageUrl } : {}),
        participants: input.participantUserIds.map((userId, i) => ({
          userId,
          amountOwed: shares[i],
        })),
      });
    },
    onSuccess: (_expense, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.groups.expenses(input.groupId),
      });
    },
  });

  const createExpense = useCallback(
    async (input: CreateExpenseInput): Promise<string> => {
      if (!authUser) throw new Error("Not authenticated");
      if (input.participantUserIds.length === 0) {
        throw new Error("Selecione ao menos um participante");
      }
      const expense = await createMutation.mutateAsync(input);
      return expense._id;
    },
    [createMutation, authUser],
  );

  // Optimistic payment-status mutation factory. Called unconditionally three
  // times below to respect the Rules of Hooks.
  const usePaymentAction = (
    apiCall: (groupId: string, participantId: string) => Promise<void>,
    nextStatus: ExpenseParticipantStatus,
  ) =>
    useMutation({
      mutationFn: ({ groupId, participantId }: PaymentArgs) =>
        apiCall(groupId, participantId),
      onMutate: async ({ groupId, expenseId, participantId }: PaymentArgs) => {
        const key = queryKeys.groups.expense(groupId, expenseId);
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData<Expense>(key);
        if (prev) {
          qc.setQueryData<Expense>(key, {
            ...prev,
            participants: prev.participants.map((p) =>
              p._id === participantId ? { ...p, status: nextStatus } : p,
            ),
          });
        }
        return { prev, key };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
      },
      onSettled: (_data, _err, vars) => {
        qc.invalidateQueries({
          queryKey: queryKeys.groups.expense(vars.groupId, vars.expenseId),
        });
        qc.invalidateQueries({
          queryKey: queryKeys.groups.expenses(vars.groupId),
        });
      },
    });

  const declareMutation = usePaymentAction(apiDeclarePayment, "PAID");
  const confirmMutation = usePaymentAction(apiConfirmPayment, "CONFIRMED");
  const rejectMutation = usePaymentAction(apiRejectPayment, "REJECTED");

  const declarePayment = useCallback(
    (args: PaymentArgs) =>
      declareMutation.mutateAsync(args).then(() => undefined),
    [declareMutation],
  );
  const confirmPayment = useCallback(
    (args: PaymentArgs) =>
      confirmMutation.mutateAsync(args).then(() => undefined),
    [confirmMutation],
  );
  const rejectPayment = useCallback(
    (args: PaymentArgs) =>
      rejectMutation.mutateAsync(args).then(() => undefined),
    [rejectMutation],
  );

  return { createExpense, declarePayment, confirmPayment, rejectPayment };
}

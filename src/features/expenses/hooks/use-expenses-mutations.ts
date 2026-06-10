import NetInfo from "@react-native-community/netinfo";
import { useCallback } from "react";
import { useDatabase } from "@/db/use-db";
import { useAuthUser } from "@/features/auth/auth-store";
import { generateObjectIdHex } from "@/common/utils/id";
import { enqueue } from "@/sync/outbox";
import { triggerCollectionSync } from "@/sync/network-monitor";
import type { ExpenseDoc } from "@/db/schemas/expense.schema";

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
  /** Local `file://` URI of a receipt image; uploaded to S3 at sync time. */
  receiptImageUrl?: string;
};

/** Rounds to 2 decimals. */
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

async function syncOnlineIfPossible(fn: () => Promise<unknown>) {
  const net = await NetInfo.fetch();
  if (net.isConnected && net.isInternetReachable !== false) {
    try {
      await fn();
    } catch (e) {
      console.error("[sync] expenseParticipants sync after mutation failed", e);
    }
  }
}

export function useExpensesMutations() {
  const { db } = useDatabase();
  const authUser = useAuthUser();

  const createExpense = useCallback(
    async (input: CreateExpenseInput): Promise<string> => {
      if (!db) throw new Error("Database not ready");
      if (!authUser) throw new Error("Not authenticated");
      if (input.participantUserIds.length === 0) {
        throw new Error("Selecione ao menos um participante");
      }

      const now = new Date().toISOString();
      const expenseId = generateObjectIdHex();
      const expense: ExpenseDoc = {
        _id: expenseId,
        groupId: input.groupId,
        createdByUserId: authUser._id,
        categoryId: input.categoryId,
        description: input.description,
        totalAmount: input.totalAmount,
        date: input.date ?? now,
        ...(input.receiptImageUrl
          ? { receiptImageUrl: input.receiptImageUrl }
          : {}),
        createdAt: now,
        updatedAt: now,
      };
      await (db.expenses as any).insert(expense);
      await enqueue(db, {
        collectionName: "expenses",
        docId: expenseId,
        operation: "create",
        payload: expense as unknown as Record<string, unknown>,
      });

      const shares = input.participantAmounts
        ? input.participantUserIds.map((uid) =>
            round2(input.participantAmounts![uid] ?? 0),
          )
        : evenSplit(input.totalAmount, input.participantUserIds.length);

      const sharesSum = round2(shares.reduce((acc, s) => acc + s, 0));
      if (Math.abs(sharesSum - round2(input.totalAmount)) > 0.01) {
        throw new Error("A soma das partes não confere com o total");
      }

      for (let i = 0; i < input.participantUserIds.length; i++) {
        const userId = input.participantUserIds[i];
        const participantId = generateObjectIdHex();
        // The creator's own share is auto-confirmed; others start pending.
        const isCreator = userId === authUser._id;
        const participant = {
          _id: participantId,
          expenseId,
          userId,
          amountOwed: shares[i],
          status: isCreator ? "CONFIRMED" : "PENDING",
          ...(isCreator ? { confirmedAt: now } : {}),
          createdAt: now,
          updatedAt: now,
        };
        await (db.expenseParticipants as any).insert(participant);
        await enqueue(db, {
          collectionName: "expenseParticipants",
          docId: participantId,
          operation: "create",
          payload: participant,
        });
      }

      const net = await NetInfo.fetch();
      if (net.isConnected && net.isInternetReachable !== false) {
        try {
          await triggerCollectionSync(db, "expenses");
          await triggerCollectionSync(db, "expenseParticipants");
        } catch (e) {
          console.error("[sync] expense sync after create failed", e);
        }
      }

      return expenseId;
    },
    [db, authUser],
  );

  const patchParticipant = useCallback(
    async (participantId: string, fields: Record<string, unknown>) => {
      if (!db) throw new Error("Database not ready");

      const doc = await (db.expenseParticipants as any)
        .findOne({ selector: { _id: participantId } })
        .exec();
      if (!doc) throw new Error("Participante não encontrado");

      const patch: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
        ...fields,
      };
      await doc.patch(patch);

      await enqueue(db, {
        collectionName: "expenseParticipants",
        docId: participantId,
        operation: "update",
        payload: { _id: participantId, ...patch },
      });

      await syncOnlineIfPossible(async () => {
        await triggerCollectionSync(db, "expenseParticipants");
      });
    },
    [db],
  );

  /** A participant declares they paid their share. PENDING/REJECTED -> PAID. */
  const declarePayment = useCallback(
    (participantId: string) =>
      patchParticipant(participantId, {
        status: "PAID",
        paidAt: new Date().toISOString(),
      }),
    [patchParticipant],
  );

  /** The expense creator confirms receipt. PAID -> CONFIRMED. */
  const confirmPayment = useCallback(
    (participantId: string) =>
      patchParticipant(participantId, {
        status: "CONFIRMED",
        confirmedAt: new Date().toISOString(),
      }),
    [patchParticipant],
  );

  /** The expense creator rejects a declared payment. PAID -> REJECTED. */
  const rejectPayment = useCallback(
    (participantId: string) =>
      patchParticipant(participantId, {
        status: "REJECTED",
      }),
    [patchParticipant],
  );

  return { createExpense, declarePayment, confirmPayment, rejectPayment };
}

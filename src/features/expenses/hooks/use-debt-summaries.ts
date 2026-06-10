import { useEffect, useMemo, useState } from "react";
import { useDatabase } from "@/db/use-db";
import { useAuthUser } from "@/features/auth/auth-store";
import type { ExpenseDoc } from "@/db/schemas/expense.schema";
import type { ExpenseParticipantDoc } from "@/db/schemas/expense-participant.schema";

export type DebtItem = {
  expenseId: string;
  groupId: string;
  description: string;
  amount: number;
  /** The counterparty: creditor when I owe, debtor when owed to me. */
  otherUserId: string;
  status: string;
};

/** Outstanding statuses count toward balances; CONFIRMED/REJECTED do not. */
const OUTSTANDING = new Set(["PENDING", "PAID"]);

/**
 * Computes the current user's balances from local expenses + participants:
 * - `iOwe`: my participant shares on expenses created by someone else.
 * - `owedToMe`: others' participant shares on expenses I created.
 * Reactive — recomputes whenever local data changes (mutation or pull).
 */
export function useDebtSummaries() {
  const { db, isReady } = useDatabase();
  const authUser = useAuthUser();
  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [participants, setParticipants] = useState<ExpenseParticipantDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!db || !isReady) return;
    const sel = { deletedAt: { $exists: false } };
    const expSub = (db.expenses as any)
      .find({ selector: sel })
      .$.subscribe((docs: any[]) => {
        setExpenses(docs.map((d) => d.toJSON() as ExpenseDoc));
        setLoaded(true);
      });
    const partSub = (db.expenseParticipants as any)
      .find({ selector: sel })
      .$.subscribe((docs: any[]) => {
        setParticipants(docs.map((d) => d.toJSON() as ExpenseParticipantDoc));
      });
    return () => {
      expSub.unsubscribe();
      partSub.unsubscribe();
    };
  }, [db, isReady]);

  return useMemo(() => {
    const me = authUser?._id;
    const expenseById = new Map(expenses.map((e) => [e._id, e]));
    const iOwe: DebtItem[] = [];
    const owedToMe: DebtItem[] = [];

    if (me) {
      for (const p of participants) {
        if (!OUTSTANDING.has(p.status)) continue;
        const expense = expenseById.get(p.expenseId);
        if (!expense) continue;
        if (p.userId === me && expense.createdByUserId !== me) {
          iOwe.push({
            expenseId: expense._id,
            groupId: expense.groupId,
            description: expense.description,
            amount: p.amountOwed,
            otherUserId: expense.createdByUserId,
            status: p.status,
          });
        } else if (p.userId !== me && expense.createdByUserId === me) {
          owedToMe.push({
            expenseId: expense._id,
            groupId: expense.groupId,
            description: expense.description,
            amount: p.amountOwed,
            otherUserId: p.userId,
            status: p.status,
          });
        }
      }
    }

    const totalIOwe = iOwe.reduce((s, d) => s + d.amount, 0);
    const totalOwedToMe = owedToMe.reduce((s, d) => s + d.amount, 0);
    return {
      iOwe,
      owedToMe,
      totalIOwe,
      totalOwedToMe,
      net: totalOwedToMe - totalIOwe,
      isLoading: !loaded,
    };
  }, [authUser, expenses, participants, loaded]);
}

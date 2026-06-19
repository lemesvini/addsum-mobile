import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useAuthUser } from "@/features/auth/auth-store";
import { listGroups } from "@/features/groups/api/groups-api";
import { listExpenses } from "../api/expenses-api";
import { queryKeys } from "@/common/lib/query-keys";

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
 * Computes the current user's balances from the user's expenses (participants
 * are embedded in each expense response):
 * - `iOwe`: my participant shares on expenses created by someone else.
 * - `owedToMe`: others' participant shares on expenses I created.
 */
export function useDebtSummaries() {
  const authUser = useAuthUser();

  const groupsQuery = useQuery({
    queryKey: queryKeys.groups.all(),
    queryFn: listGroups,
  });
  const groups = groupsQuery.data ?? [];

  const expenseQueries = useQueries({
    queries: groups.map((g) => ({
      queryKey: queryKeys.groups.expenses(g._id),
      queryFn: () => listExpenses(g._id),
    })),
  });

  const expenses = expenseQueries.flatMap((q) => q.data ?? []);
  const isLoading =
    groupsQuery.isLoading || expenseQueries.some((q) => q.isLoading);

  return useMemo(() => {
    const me = authUser?._id;
    const iOwe: DebtItem[] = [];
    const owedToMe: DebtItem[] = [];

    if (me) {
      for (const expense of expenses) {
        for (const p of expense.participants ?? []) {
          if (!OUTSTANDING.has(p.status)) continue;
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
    }

    const totalIOwe = iOwe.reduce((s, d) => s + d.amount, 0);
    const totalOwedToMe = owedToMe.reduce((s, d) => s + d.amount, 0);
    return {
      iOwe,
      owedToMe,
      totalIOwe,
      totalOwedToMe,
      net: totalOwedToMe - totalIOwe,
      isLoading,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, JSON.stringify(expenses), isLoading]);
}

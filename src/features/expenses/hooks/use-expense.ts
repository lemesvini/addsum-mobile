import { useQuery } from "@tanstack/react-query";
import { getExpense } from "../api/expenses-api";
import { queryKeys } from "@/common/lib/query-keys";

export function useExpense(
  groupId: string | undefined,
  expenseId: string | undefined,
) {
  const query = useQuery({
    queryKey:
      groupId && expenseId
        ? queryKeys.groups.expense(groupId, expenseId)
        : ["groups", "expense", "none"],
    queryFn: () => getExpense(groupId as string, expenseId as string),
    enabled: !!groupId && !!expenseId,
  });
  return { expense: query.data ?? null, isLoading: query.isLoading };
}

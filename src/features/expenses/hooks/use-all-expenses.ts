import { useQuery, useQueries } from "@tanstack/react-query";
import { listGroups } from "@/features/groups/api/groups-api";
import { listExpenses } from "../api/expenses-api";
import { queryKeys } from "@/common/lib/query-keys";

/** Every expense across all of the user's groups (newest first), for search. */
export function useAllExpenses() {
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

  return { expenses, isLoading };
}

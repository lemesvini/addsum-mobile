import { useQuery } from "@tanstack/react-query";
import { listExpenses } from "../api/expenses-api";
import { queryKeys } from "@/common/lib/query-keys";

export function useExpenses(groupId: string | undefined) {
  const query = useQuery({
    queryKey: groupId
      ? queryKeys.groups.expenses(groupId)
      : ["groups", "expenses", "none"],
    queryFn: () => listExpenses(groupId as string),
    enabled: !!groupId,
  });
  return { expenses: query.data ?? [], isLoading: query.isLoading };
}

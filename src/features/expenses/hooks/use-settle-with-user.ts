import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  settleWithUser as apiSettleWithUser,
  type SettlementResult,
} from "../api/expenses-api";
import { queryKeys } from "@/common/lib/query-keys";

/**
 * Settles all outstanding expenses with one other user. On success invalidates
 * everything under `["groups"]` so per-group expense lists (and the balances
 * derived from them) refetch.
 */
export function useSettleWithUser() {
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: (otherUserId: string) => apiSettleWithUser(otherUserId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
    },
  });

  const settle = useCallback(
    (otherUserId: string): Promise<SettlementResult> =>
      mutation.mutateAsync(otherUserId),
    [mutation],
  );

  return {
    settle,
    isLoading: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

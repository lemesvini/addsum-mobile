import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/common/lib/query-keys";
import {
  getReminderStatus,
  sendReminder,
  type ReminderResult,
} from "../api/reminders-api";

/** Cooldown status for sending a reminder to `toUserId`. */
export function useReminderStatus(toUserId: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.reminders.status(toUserId ?? "none"),
    queryFn: () => getReminderStatus(toUserId as string),
    enabled: !!toUserId,
  });
  return {
    status: query.data,
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

export function useSendReminder() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (toUserId: string) => sendReminder(toUserId),
    onSuccess: (_res, toUserId) => {
      qc.invalidateQueries({
        queryKey: queryKeys.reminders.status(toUserId),
      });
    },
  });

  const send = useCallback(
    (toUserId: string): Promise<ReminderResult> =>
      mutation.mutateAsync(toUserId),
    [mutation],
  );

  return { send, isLoading: mutation.isPending };
}

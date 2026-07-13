import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/common/lib/query-keys";
import {
  listNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/notifications-api";

export function useNotifications() {
  const query = useQuery({
    queryKey: queryKeys.notifications.all(),
    queryFn: listNotifications,
  });
  return {
    notifications: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/** Unread count, polled so the tab badge stays roughly fresh. */
export function useUnreadNotificationsCount() {
  const query = useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  });
  return query.data ?? 0;
}

export function useNotificationsMutations() {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.notifications.all() });
    qc.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount() });
  };

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: invalidate,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: invalidate,
  });

  return {
    markAllRead: () => markAllRead.mutateAsync(),
    markRead: (id: string) => markRead.mutateAsync(id),
  };
}

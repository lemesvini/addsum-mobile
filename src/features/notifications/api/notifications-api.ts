import { api } from "@/common/api/api-client";

export type AppNotification = {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, string>;
  createdAt: string;
};

type ListResponse<T> = { message: string; data: T };

export async function listNotifications(): Promise<AppNotification[]> {
  const response =
    await api.get<ListResponse<AppNotification[]>>("/notifications");
  return response.data;
}

export async function getUnreadCount(): Promise<number> {
  const response = await api.get<ListResponse<{ count: number }>>(
    "/notifications/unread-count",
    { skipErrorAlert: true },
  );
  return response.data.count;
}

export async function markNotificationRead(id: string): Promise<void> {
  await api.patch(`/notifications/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.patch("/notifications/read");
}

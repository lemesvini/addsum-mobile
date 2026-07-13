import { api } from "@/common/api/api-client";

export type ReminderStatus = {
  canSend: boolean;
  nextAvailableAt: string | null;
};

export type ReminderResult = {
  sent: boolean;
  nextAvailableAt: string;
};

type SingleResponse<T> = { message: string; data: T };

/** Whether a payment reminder can be sent to `toUserId` right now. */
export async function getReminderStatus(
  toUserId: string,
): Promise<ReminderStatus> {
  const response = await api.get<SingleResponse<ReminderStatus>>(
    "/reminders/status",
    { params: { toUserId }, skipErrorAlert: true },
  );
  return response.data;
}

/** Send a payment reminder ("cobrança") to `toUserId` (rate-limited to 48h). */
export async function sendReminder(
  toUserId: string,
): Promise<ReminderResult> {
  const response = await api.post<SingleResponse<ReminderResult>>("/reminders", {
    toUserId,
  });
  return response.data;
}

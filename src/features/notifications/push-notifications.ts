import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { type Href, type Router } from "expo-router";

import { api } from "@/common/api/api-client";
import { useAuthStore } from "@/features/auth/auth-store";

const ANDROID_CHANNEL_ID = "default";
let registrationInFlight: Promise<boolean> | null = null;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerPushToken(): Promise<boolean> {
  if (registrationInFlight) return registrationInFlight;

  registrationInFlight = registerPushTokenOnce().finally(() => {
    registrationInFlight = null;
  });
  return registrationInFlight;
}

async function registerPushTokenOnce(): Promise<boolean> {
  if (Platform.OS === "web") return false;

  const accessToken = useAuthStore.getState().accessToken;
  if (!accessToken) return false;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Notificações",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const permissions = await Notifications.getPermissionsAsync();
  const finalStatus =
    permissions.status === "granted"
      ? permissions.status
      : (await Notifications.requestPermissionsAsync()).status;

  if (finalStatus !== "granted") return false;

  const projectId = getExpoProjectId();
  if (!projectId) return false;

  const pushToken = (await Notifications.getExpoPushTokenAsync({ projectId }))
    .data;

  if (!isExpoPushToken(pushToken)) {
    throw new Error("Refusing to register a non-Expo push token");
  }

  await api.post("/auth/push-token", { pushToken }, { skipErrorAlert: true });
  return true;
}

function isExpoPushToken(token: string) {
  return /^(ExponentPushToken|ExpoPushToken)\[[^\]]+\]$/.test(token);
}

export function openNotificationTarget(
  response: Notifications.NotificationResponse | null | undefined,
  router: Router,
) {
  const target = getNotificationTargetHref(response);
  if (!target) return;
  router.push(target);
}

/** Routes on the push `data` payload: `{ type, groupId, expenseId? }`. */
export function getNotificationTargetHref(
  response: Notifications.NotificationResponse | null | undefined,
): Href | null {
  const data = response?.notification.request.content.data;
  const groupId = typeof data?.groupId === "string" ? data.groupId : null;
  const expenseId = typeof data?.expenseId === "string" ? data.expenseId : null;

  if (groupId && expenseId) {
    return `/group/${groupId}/expense/${expenseId}` as Href;
  }
  if (groupId) {
    return `/group/${groupId}` as Href;
  }
  return null;
}

export function hasNotificationTarget(
  response: Notifications.NotificationResponse | null | undefined,
) {
  return Boolean(getNotificationTargetHref(response));
}

function getExpoProjectId() {
  return (
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as any).manifest2?.extra?.eas?.projectId
  );
}

import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Platform } from "react-native";

import { useAuthStore } from "@/features/auth/auth-store";
import {
  hasNotificationTarget,
  openNotificationTarget,
  registerPushToken,
} from "@/features/notifications/push-notifications";

const REGISTRATION_RETRY_DELAYS_MS = [1000, 3000, 8000] as const;

/**
 * Registers the Expo push token with the API once authenticated (with retry +
 * token-rotation re-registration), and routes taps on a received notification
 * to the relevant group/expense.
 */
export function usePushNotificationRouting() {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const handledResponseKeyRef = useRef<string | null>(null);
  const registrationRetryRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    if (!isHydrated) return;

    const handleResponse = (
      response: Notifications.NotificationResponse | null | undefined,
    ) => {
      const responseKey = getNotificationResponseKey(response);
      if (responseKey && handledResponseKeyRef.current === responseKey) return;

      const hasTarget = hasNotificationTarget(response);
      openNotificationTarget(response, router);
      handledResponseKeyRef.current = responseKey;
      if (hasTarget) {
        void Notifications.clearLastNotificationResponseAsync().catch(() => {});
      }
    };

    const subscription =
      Notifications.addNotificationResponseReceivedListener(handleResponse);

    void Notifications.getLastNotificationResponseAsync().then((response) =>
      handleResponse(response),
    );

    return () => subscription.remove();
  }, [isHydrated, router]);

  useEffect(() => {
    if (!isHydrated || !accessToken) return;

    let cancelled = false;

    const registerWithRetry = async (attempt = 0) => {
      try {
        await registerPushToken();
      } catch (error) {
        console.warn("Não foi possível registrar push token", error);
        if (cancelled || attempt >= REGISTRATION_RETRY_DELAYS_MS.length) return;

        registrationRetryRef.current = setTimeout(() => {
          void registerWithRetry(attempt + 1);
        }, REGISTRATION_RETRY_DELAYS_MS[attempt]);
      }
    };

    void registerWithRetry();

    return () => {
      cancelled = true;
      if (registrationRetryRef.current) {
        clearTimeout(registrationRetryRef.current);
        registrationRetryRef.current = null;
      }
    };
  }, [accessToken, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !accessToken || Platform.OS === "web") return;

    const subscription = Notifications.addPushTokenListener(() => {
      void registerPushToken().catch(() => {});
    });

    return () => subscription.remove();
  }, [accessToken, isHydrated]);
}

function getNotificationResponseKey(
  response: Notifications.NotificationResponse | null | undefined,
) {
  if (!response) return null;
  const request = response.notification.request;
  return `${request.identifier}:${response.actionIdentifier}`;
}

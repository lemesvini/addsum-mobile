import { useCallback, useState } from "react";
import { api, type ApiRequestConfig } from "@/common/api/api-client";
import type { ChangePasswordFormInput } from "@/features/auth/api/auth-schemas";

function parseApiError(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const data = (err as { response?: { data?: { message?: unknown } } })
      .response?.data;
    const raw = data?.message;
    if (Array.isArray(raw)) return raw.join(", ");
    if (typeof raw === "string" && raw.length > 0) return raw;
  }
  return "Erro ao alterar senha";
}

export function useChangePassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePassword = useCallback(async (data: ChangePasswordFormInput) => {
    setError(null);
    setIsLoading(true);

    const config: ApiRequestConfig = { skipErrorAlert: true };

    try {
      await api.patch<{ message: string }>(
        "/auth/password",
        {
          currentPassword: data.currentPassword,
          newPassword: data.password,
        },
        config,
      );
      return { ok: true as const, error: null };
    } catch (err) {
      const message = parseApiError(err);
      setError(message);
      return { ok: false as const, error: message };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { changePassword, isLoading, error, setError };
}

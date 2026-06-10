import { useCallback, useState } from "react";
import { api, type ApiRequestConfig } from "@/common/api/api-client";
import type { ResetPasswordFormInput } from "@/features/auth/api/auth-schemas";

function parseApiError(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const data = (err as { response?: { data?: { message?: unknown } } })
      .response?.data;
    const raw = data?.message;
    if (Array.isArray(raw)) return raw.join(", ");
    if (typeof raw === "string" && raw.length > 0) return raw;
  }
  return "Erro ao redefinir senha";
}

export type ResetPasswordVars = {
  token: string;
  data: ResetPasswordFormInput;
};

export function useResetPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = useCallback(
    async ({ token, data }: ResetPasswordVars) => {
      setError(null);

      if (!token.trim()) {
        setError("Link inválido ou expirado.");
        return false;
      }

      const body = { token: token.trim(), password: data.password };
      const config: ApiRequestConfig = { skipErrorAlert: true };

      setIsLoading(true);
      try {
        await api.post<{ message: string }>(
          "/auth/reset-password",
          body,
          config,
        );
        return true;
      } catch (err) {
        setError(parseApiError(err));
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { resetPassword, isLoading, error, setError };
}

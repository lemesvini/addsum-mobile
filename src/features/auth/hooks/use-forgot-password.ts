import { useCallback, useState } from "react";
import { api, type ApiRequestConfig } from "@/common/api/api-client";

function parseApiError(err: unknown): string {
  if (typeof err === "object" && err !== null && "response" in err) {
    const data = (err as { response?: { data?: { message?: unknown } } })
      .response?.data;
    const raw = data?.message;
    if (Array.isArray(raw)) return raw.join(", ");
    if (typeof raw === "string" && raw.length > 0) return raw;
  }
  return "Não foi possível enviar o código";
}

export function useForgotPassword() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const forgotPassword = useCallback(async (email: string) => {
    setError(null);
    const config: ApiRequestConfig = { skipErrorAlert: true };
    setIsLoading(true);
    try {
      await api.post<{ message: string }>(
        "/auth/forgot-password",
        { email: email.trim() },
        config,
      );
      return true;
    } catch (err) {
      setError(parseApiError(err));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { forgotPassword, isLoading, error, setError };
}

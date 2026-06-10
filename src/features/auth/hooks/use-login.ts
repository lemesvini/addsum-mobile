import { useState } from "react";
import { api } from "@/common/api/api-client";
import { useAuthStore } from "../auth-store";

type LoginPayload = {
  email: string;
  password: string;
};

export const useLogin = () => {
  const { setAuthenticatedUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (data: LoginPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post<{
        message: string;
        data: { accessToken: string };
      }>("/auth/sign-in", data);
      setAuthenticatedUser(response.data.accessToken);
      return response;
    } catch (err: any) {
      const message = err.response?.data?.message || "Falha no login";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};

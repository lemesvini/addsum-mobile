import { useState } from "react";
import { api } from "@/common/api/api-client";
import { useAuthStore } from "../auth-store";

type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
};

/**
 * Registers a new user then immediately signs in to obtain a token.
 * The backend `/auth/register` creates the account but does not return a JWT,
 * so we follow up with `/auth/sign-in`.
 */
export const useRegister = () => {
  const { setAuthenticatedUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = async (data: RegisterPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      await api.post("/auth/register", data);
      const response = await api.post<{
        message: string;
        data: { accessToken: string };
      }>("/auth/sign-in", { email: data.email, password: data.password });
      setAuthenticatedUser(response.data.accessToken);
      return response;
    } catch (err: any) {
      const raw = err.response?.data?.message;
      const message = Array.isArray(raw)
        ? raw.join(", ")
        : raw || "Falha no cadastro";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
};

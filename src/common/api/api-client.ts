import axios, {
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";
import { env } from "@/common/config/env";
import { useAuthStore } from "@/features/auth/auth-store";

export type ApiRequestConfig = AxiosRequestConfig & {
  skipErrorAlert?: boolean;
};

function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = "application/json";
  }

  const { accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
}

// eslint-disable-next-line import/no-named-as-default-member
const axiosInstance = axios.create({
  baseURL: env.API_URL,
});

axiosInstance.interceptors.request.use(authRequestInterceptor);
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message;
    const cfg = error.config as ApiRequestConfig | undefined;

    if (error.response?.status === 401) {
      useAuthStore.getState().removeAuthenticatedUser();
    } else if (!cfg?.skipErrorAlert) {
      console.error("Erro", String(message));
    }

    return Promise.reject(error);
  },
);

export const api = {
  get: <T>(url: string, config?: ApiRequestConfig) =>
    axiosInstance.get<T, T>(url, config),
  post: <T>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    axiosInstance.post<T, T>(url, data, config),
  put: <T>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    axiosInstance.put<T, T>(url, data, config),
  patch: <T>(url: string, data?: unknown, config?: ApiRequestConfig) =>
    axiosInstance.patch<T, T>(url, data, config),
  delete: <T>(url: string, config?: ApiRequestConfig) =>
    axiosInstance.delete<T, T>(url, config),
};

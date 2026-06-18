import { useAuthStore } from "../auth-store";
import { queryClient } from "@/lib/query-client";

export const useLogout = () => {
  const { removeAuthenticatedUser } = useAuthStore();

  const logout = async () => {
    removeAuthenticatedUser();
    queryClient.clear();
  };

  return { logout };
};

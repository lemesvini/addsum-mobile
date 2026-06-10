import { useAuthStore } from "../auth-store";
import { getResetDatabase } from "@/db/use-db";
import { stopNetworkMonitor } from "@/sync/network-monitor";

export const useLogout = () => {
  const { removeAuthenticatedUser } = useAuthStore();

  const logout = async () => {
    stopNetworkMonitor();
    removeAuthenticatedUser();
    // Reset local database on logout to clear any user-specific data
    const reset = getResetDatabase();
    if (reset) {
      await reset().catch((e) =>
        console.warn("[logout] db reset failed", e),
      );
    }
  };

  return { logout };
};

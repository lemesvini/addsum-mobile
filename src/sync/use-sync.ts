import { useEffect, useState, useCallback } from "react";
import { useDatabase } from "@/db/use-db";
import { useAuthStore } from "@/features/auth/auth-store";
import {
  startNetworkMonitor,
  stopNetworkMonitor,
  triggerManualSync,
} from "./network-monitor";
import type { PullAllSyncMeta } from "./pull/index";
import { SyncStatus } from "./sync-state";

const defaultPullMeta: PullAllSyncMeta = {
  route404ByCollection: {},
};

export type { SyncStatus };

export function useSync() {
  const { db, isReady } = useDatabase();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = Boolean(accessToken);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [pullMeta, setPullMeta] =
    useState<PullAllSyncMeta>(defaultPullMeta);

  useEffect(() => {
    if (!db || !isReady || !isAuthenticated) {
      stopNetworkMonitor();
      return;
    }
    setStatus("syncing");

    const handleComplete = (meta: PullAllSyncMeta) => {
      setPullMeta(meta);
      setLastSynced(new Date());
      setStatus("synced");
    };

    const handleError = (e: unknown) => {
      console.error("[sync] background sync error", e);
      setStatus("error");
    };

    startNetworkMonitor(db, handleComplete, handleError);
    return () => stopNetworkMonitor(handleComplete, handleError);
  }, [db, isReady, isAuthenticated]);

  const refresh = useCallback(async () => {
    if (!db) return;
    setStatus("syncing");
    try {
      const meta = await triggerManualSync(db);
      setPullMeta(meta);
      setLastSynced(new Date());
      setStatus("synced");
    } catch (e) {
      console.error("[sync] manual refresh failed", e);
      setStatus("error");
    }
  }, [db]);

  return { status, lastSynced, refresh, pullMeta };
}

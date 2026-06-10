import { useEffect, useState, useCallback, useRef } from "react";
import { useDatabase } from "@/db/use-db";
import { useAuthStore } from "@/features/auth/auth-store";
import type { CollectionName } from "@/db/index";
import {
  getCollectionSyncState,
  subscribeCollectionSync,
  type SyncStatus,
} from "./sync-state";
import { triggerCollectionSync } from "./network-monitor";

type CollectionSyncResult = {
  /** Current sync status for this collection. */
  status: SyncStatus;
  /** Timestamp of the last successful sync for this collection. */
  lastSynced: Date | null;
  /** Number of outbox entries waiting to be pushed for this collection. */
  pendingCount: number;
  /** Last error if status is "error". */
  error: unknown | null;
  /** Trigger a manual sync for this collection only. */
  refresh: () => Promise<void>;
};

/**
 * Provides per-collection sync status, pending count, and a refresh trigger.
 *
 * Example:
 * ```ts
 * const { status, pendingCount, refresh } = useCollectionSync("movies");
 * ```
 */
export function useCollectionSync(
  collectionName: CollectionName,
): CollectionSyncResult {
  const { db, isReady } = useDatabase();
  const accessToken = useAuthStore((s) => s.accessToken);
  const isAuthenticated = Boolean(accessToken);

  const [syncState, setSyncState] = useState(() =>
    getCollectionSyncState(collectionName),
  );
  const [pendingCount, setPendingCount] = useState(0);
  const subscriptionRef = useRef<(() => void) | null>(null);

  // Subscribe to sync-state changes for this collection
  useEffect(() => {
    setSyncState(getCollectionSyncState(collectionName));
    const unsubscribe = subscribeCollectionSync(collectionName, () => {
      setSyncState(getCollectionSyncState(collectionName));
    });
    subscriptionRef.current = unsubscribe;
    return () => {
      unsubscribe();
      subscriptionRef.current = null;
    };
  }, [collectionName]);

  // Reactive pendingCount via RxDB query subscription
  useEffect(() => {
    if (!db || !isReady) {
      setPendingCount(0);
      return;
    }

    const queue = (db as any).syncQueue;
    if (!queue) return;

    const subscription = queue
      .find({ selector: { collectionName } })
      .$.subscribe((docs: any[]) => {
        setPendingCount(docs.length);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady, collectionName]);

  const refresh = useCallback(async () => {
    if (!db || !isAuthenticated) return;
    try {
      await triggerCollectionSync(db, collectionName);
    } catch (e) {
      console.error(
        `[sync] useCollectionSync refresh failed for ${collectionName}`,
        e,
      );
    }
  }, [db, isAuthenticated, collectionName]);

  return {
    status: syncState.status,
    lastSynced: syncState.lastSynced,
    error: syncState.error,
    pendingCount,
    refresh,
  };
}

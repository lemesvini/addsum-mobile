import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import type { AppDatabase, CollectionName } from "@/db/index";
import {
  pullAllCollections,
  pullCollection,
  type PullAllSyncMeta,
} from "./pull/index";
import { drainOutbox, drainOutboxForCollection } from "./outbox";
import { setCollectionSyncStatus } from "./sync-state";

const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

let unsubscribe: (() => void) | null = null;
let syncInterval: ReturnType<typeof setInterval> | null = null;
let activeSync: Promise<PullAllSyncMeta> | null = null;
let subscribers = new Set<(meta: PullAllSyncMeta) => void>();
let errorSubscribers = new Set<(error: unknown) => void>();

async function executeSync(db: AppDatabase): Promise<PullAllSyncMeta> {
  await drainOutbox(db);
  return pullAllCollections(db);
}

async function runSync(
  db: AppDatabase,
  onComplete?: (meta: PullAllSyncMeta) => void,
  onError?: (error: unknown) => void,
) {
  if (activeSync) {
    try {
      const meta = await activeSync;
      onComplete?.(meta);
    } catch (e) {
      onError?.(e);
    }
    return;
  }
  activeSync = executeSync(db).finally(() => {
    activeSync = null;
  });
  try {
    const meta = await activeSync;
    onComplete?.(meta);
  } catch (e) {
    console.error("[sync] background sync failed", e);
    errorSubscribers.forEach((subscriber) => subscriber(e));
    onError?.(e);
  }
}

export function startNetworkMonitor(
  db: AppDatabase,
  onComplete?: (meta: PullAllSyncMeta) => void,
  onError?: (error: unknown) => void,
) {
  if (onComplete) subscribers.add(onComplete);
  if (onError) errorSubscribers.add(onError);

  const notifySubscribers = (meta: PullAllSyncMeta) => {
    subscribers.forEach((subscriber) => subscriber(meta));
  };
  const notifyErrorSubscribers = (error: unknown) => {
    errorSubscribers.forEach((subscriber) => subscriber(error));
  };

  if (unsubscribe) {
    void runSync(db, notifySubscribers, notifyErrorSubscribers);
    return;
  }

  void runSync(db, notifySubscribers, notifyErrorSubscribers);

  unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      void runSync(db, notifySubscribers, notifyErrorSubscribers);
      if (!syncInterval) {
        syncInterval = setInterval(
          () => runSync(db, notifySubscribers, notifyErrorSubscribers),
          SYNC_INTERVAL_MS,
        );
      }
    } else {
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }
    }
  });
}

export function stopNetworkMonitor(
  onComplete?: (meta: PullAllSyncMeta) => void,
  onError?: (error: unknown) => void,
) {
  if (onComplete) subscribers.delete(onComplete);
  if (onError) errorSubscribers.delete(onError);

  if (onComplete || onError) {
    if (subscribers.size > 0 || errorSubscribers.size > 0) return;
  } else {
    subscribers = new Set();
    errorSubscribers = new Set();
  }

  unsubscribe?.();
  unsubscribe = null;
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  activeSync = null;
}

export async function triggerManualSync(
  db: AppDatabase,
): Promise<PullAllSyncMeta> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) throw new Error("Sem conexão com a internet");
  if (activeSync) return activeSync;
  activeSync = executeSync(db).finally(() => {
    activeSync = null;
  });
  return activeSync;
}

/**
 * Triggers a sync cycle for a single collection:
 * drains its outbox entries then pulls from the server.
 * Coalesces concurrent calls into a single in-flight promise per collection.
 */
const activeCollectionSyncs = new Map<CollectionName, Promise<void>>();

export async function triggerCollectionSync(
  db: AppDatabase,
  collectionName: CollectionName,
): Promise<void> {
  const state = await NetInfo.fetch();
  if (!state.isConnected) throw new Error("Sem conexão com a internet");

  const existing = activeCollectionSyncs.get(collectionName);
  if (existing) return existing;

  setCollectionSyncStatus(collectionName, "syncing");

  const promise = (async () => {
    try {
      await drainOutboxForCollection(db, collectionName);
      await pullCollection(db, collectionName);
      setCollectionSyncStatus(collectionName, "synced");
    } catch (e) {
      console.error(`[sync] collection sync failed for ${collectionName}`, e);
      setCollectionSyncStatus(collectionName, "error", e);
      throw e;
    }
  })().finally(() => {
    activeCollectionSyncs.delete(collectionName);
  });

  activeCollectionSyncs.set(collectionName, promise);
  return promise;
}

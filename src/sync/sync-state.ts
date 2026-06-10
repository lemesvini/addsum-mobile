import type { CollectionName } from "@/db/index";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";

export type CollectionSyncState = {
  status: SyncStatus;
  lastSynced: Date | null;
  error: unknown | null;
};

export type GlobalSyncState = {
  status: SyncStatus;
  lastSynced: Date | null;
  error: unknown | null;
};

type Listener = () => void;

const collectionState: Partial<Record<CollectionName, CollectionSyncState>> =
  {};
let globalState: GlobalSyncState = {
  status: "idle",
  lastSynced: null,
  error: null,
};

const globalListeners = new Set<Listener>();
const collectionListeners = new Map<CollectionName, Set<Listener>>();

function notifyGlobal() {
  globalListeners.forEach((l) => l());
}

function notifyCollection(name: CollectionName) {
  collectionListeners.get(name)?.forEach((l) => l());
}

// ── Global state ──────────────────────────────────────────────────────────────

export function getGlobalSyncState(): GlobalSyncState {
  return globalState;
}

export function setGlobalSyncStatus(
  status: SyncStatus,
  error?: unknown,
  lastSynced?: Date,
) {
  globalState = {
    status,
    lastSynced: lastSynced ?? (status === "synced" ? new Date() : globalState.lastSynced),
    error: error ?? null,
  };
  notifyGlobal();
}

export function subscribeGlobalSync(listener: Listener): () => void {
  globalListeners.add(listener);
  return () => globalListeners.delete(listener);
}

// ── Per-collection state ──────────────────────────────────────────────────────

export function getCollectionSyncState(
  name: CollectionName,
): CollectionSyncState {
  return (
    collectionState[name] ?? { status: "idle", lastSynced: null, error: null }
  );
}

export function setCollectionSyncStatus(
  name: CollectionName,
  status: SyncStatus,
  error?: unknown,
  lastSynced?: Date,
) {
  collectionState[name] = {
    status,
    lastSynced:
      lastSynced ??
      (status === "synced"
        ? new Date()
        : (collectionState[name]?.lastSynced ?? null)),
    error: error ?? null,
  };
  notifyCollection(name);
}

export function subscribeCollectionSync(
  name: CollectionName,
  listener: Listener,
): () => void {
  if (!collectionListeners.has(name)) {
    collectionListeners.set(name, new Set());
  }
  collectionListeners.get(name)!.add(listener);
  return () => collectionListeners.get(name)?.delete(listener);
}

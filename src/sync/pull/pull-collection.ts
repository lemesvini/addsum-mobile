import { AxiosError } from "axios";
import { api } from "@/common/api/api-client";
import { saveCheckpoint, loadCheckpoint } from "@/db/sqlite-persistence";
import type { AppDatabase, CollectionName } from "@/db/index";
import {
  COLLECTION_ENDPOINTS,
  PULL_COLLECTION_ORDER,
  SYNC_COLLECTIONS,
} from "../endpoints";
import { applyPulledDocuments } from "./apply-documents";
import { toIso } from "./base-fields";
import {
  setCollectionSyncStatus,
  setGlobalSyncStatus,
} from "../sync-state";

/** Checkpoint uses _id (MongoDB ObjectId string) as the cursor, not a numeric id. */
type SyncCheckpoint = { updatedAt: string; id: string };

type SyncResponse = {
  documents: Record<string, unknown>[];
  checkpoint: { updatedAt?: string; id?: string } | null;
  hasMore?: boolean;
};

const SYNC_PULL_LIMIT = 10000;

export type PullAllSyncMeta = {
  route404ByCollection: Partial<Record<CollectionName, boolean>>;
};

function extractSyncPullPayload(body: any): SyncResponse | null {
  if (!body) return null;
  if (Array.isArray(body?.documents)) return body as SyncResponse;
  if (Array.isArray(body?.data?.documents)) return body.data as SyncResponse;
  return null;
}

async function collectionHasDocuments(collection: any): Promise<boolean> {
  const first = await collection.findOne().exec();
  return Boolean(first);
}

export async function pullCollection(
  db: AppDatabase,
  collectionName: CollectionName,
): Promise<boolean> {
  const entry = COLLECTION_ENDPOINTS[collectionName];
  if (!entry) return false;
  const slug = entry.sync;

  const replicationId = `pull-${collectionName}`;
  const collection = db[collectionName] as any;
  const checkpoint = (await loadCheckpoint(
    replicationId,
  )) as SyncCheckpoint | null;

  const params: Record<string, string> = { limit: String(SYNC_PULL_LIMIT) };
  const hasCheckpointUpdatedAt = Boolean(checkpoint?.updatedAt?.trim());
  const hasCheckpointId = Boolean(checkpoint?.id?.trim());
  let effectiveCheckpoint =
    hasCheckpointUpdatedAt === hasCheckpointId ? checkpoint : null;

  if (!effectiveCheckpoint && (hasCheckpointUpdatedAt || hasCheckpointId)) {
    // Corrupt checkpoint (only one field set) — reset it
    await saveCheckpoint(replicationId, { id: "", updatedAt: "" });
  } else {
    if (
      effectiveCheckpoint?.updatedAt?.trim() &&
      !(await collectionHasDocuments(collection))
    ) {
      // Non-empty checkpoint but empty local collection — stale cursor
      effectiveCheckpoint = null;
      await saveCheckpoint(replicationId, { id: "", updatedAt: "" });
      console.info(
        `[sync] reset checkpoint for empty local collection ${collectionName}`,
      );
    }

    if (effectiveCheckpoint?.updatedAt?.trim()) {
      params.updatedSince = effectiveCheckpoint.updatedAt;
    }
    if (effectiveCheckpoint?.id?.trim()) params.id = effectiveCheckpoint.id;
  }

  setCollectionSyncStatus(collectionName, "syncing");

  // api interceptor returns response.data directly, so response IS the payload body
  const response = await api.get<SyncResponse | { data: SyncResponse }>(
    `/sync/${slug}`,
    { params },
  );

  const payload = extractSyncPullPayload(response as any);

  if (!payload || !Array.isArray(payload.documents)) {
    setCollectionSyncStatus(collectionName, "synced");
    return false;
  }

  const { documents, checkpoint: newCheckpoint } = payload;

  if (documents.length === 0) {
    setCollectionSyncStatus(collectionName, "synced");
    return false;
  }

  const applied = await applyPulledDocuments(db, collectionName, documents);

  if (applied.length !== documents.length) {
    console.warn(
      `[sync] applied ${applied.length}/${documents.length} pulled docs for ${collectionName}; checkpoint not advanced`,
    );
    setCollectionSyncStatus(collectionName, "synced");
    return false;
  }

  // Only advance checkpoint when all documents applied successfully
  if (newCheckpoint?.id) {
    const lastRaw = documents[documents.length - 1] as Record<string, any>;
    const updatedAt =
      (typeof newCheckpoint.updatedAt === "string" &&
        newCheckpoint.updatedAt.trim()) ||
      (lastRaw?.updatedAt != null ? toIso(lastRaw.updatedAt) : "") ||
      toIso(Date.now());
    await saveCheckpoint(replicationId, {
      id: String(newCheckpoint.id),
      updatedAt,
    });
  }

  setCollectionSyncStatus(collectionName, "synced");
  return payload.hasMore ?? documents.length === SYNC_PULL_LIMIT;
}

export async function pullAllCollections(
  db: AppDatabase,
): Promise<PullAllSyncMeta> {
  const meta: PullAllSyncMeta = { route404ByCollection: {} };
  const pullOrder =
    PULL_COLLECTION_ORDER.length > 0 ? PULL_COLLECTION_ORDER : SYNC_COLLECTIONS;

  setGlobalSyncStatus("syncing");

  for (const collectionName of pullOrder) {
    let hasMore = true;
    let didReset = false;
    while (hasMore) {
      try {
        hasMore = await pullCollection(db, collectionName);
      } catch (error) {
        if (
          !didReset &&
          error instanceof AxiosError &&
          error.response?.status === 400
        ) {
          didReset = true;
          await saveCheckpoint(`pull-${collectionName}`, {
            id: "",
            updatedAt: "",
          });
          console.warn(
            `[sync] reset checkpoint for ${collectionName} on 400, retrying`,
          );
          continue;
        }
        if (error instanceof AxiosError && error.response?.status === 404) {
          const slug = COLLECTION_ENDPOINTS[collectionName]?.sync;
          const route = slug ? `/sync/${slug}` : collectionName;
          console.warn(`[sync] ${route} not implemented yet (404)`);
          meta.route404ByCollection[collectionName] = true;
          setCollectionSyncStatus(collectionName, "idle");
        } else {
          console.error(`[sync] pull failed for ${collectionName}`, error);
          setCollectionSyncStatus(collectionName, "error", error);
        }
        hasMore = false;
      }
    }
  }

  setGlobalSyncStatus("synced");
  return meta;
}

import { AxiosError } from "axios";
import type { AppDatabase, CollectionName } from "@/db/index";
import type {
  SyncQueueEntry,
  SyncQueueOperation,
} from "@/db/schemas/sync-queue.schema";
import { COLLECTION_ENDPOINTS } from "./endpoints";
import { generateQueueId } from "@/common/utils/id";
import { pushDocument } from "./push/push-document";

type EnqueueInput = {
  collectionName: string;
  docId: string;
  operation: SyncQueueOperation;
  payload: Record<string, unknown>;
};

const MAX_OUTBOX_ATTEMPTS = 25;

function isConflictError(e: unknown) {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "CONFLICT"
  );
}

function isNonRetryableHttpError(e: unknown): boolean {
  if (!(e instanceof AxiosError)) return false;
  const status = e.response?.status;
  if (!status) return false;
  // 4xx input/validation errors are not retriable and block the queue forever.
  // Keep 401/408/409/429 retriable because they can be transient/session-related.
  return status >= 400 && status < 500 && ![401, 408, 409, 429].includes(status);
}

async function removeQueueEntry(queue: any, doc: any, id: string) {
  try {
    await doc.remove();
    return;
  } catch (e) {
    if (!isConflictError(e)) throw e;
  }
  const latest = await queue.findOne(id).exec();
  if (!latest) return;
  try {
    await latest.remove();
  } catch (e) {
    if (!isConflictError(e)) throw e;
  }
}

async function bumpAttempts(queue: any, entry: SyncQueueEntry) {
  const latest = await queue.findOne(entry._id).exec();
  if (latest) await latest.patch({ attempts: entry.attempts + 1 });
}

/**
 * Removes orphan update/delete entries that can never succeed because:
 * - No pending create exists for the document in the queue, AND
 * - The local document has no string _id (would be caught by pushDocument anyway)
 *
 * For genesis, since the client generates the _id upfront (ObjectId hex), an
 * update/delete entry is orphan only when the local document no longer exists at all.
 */
async function cleanupImpossibleEntries(
  db: AppDatabase,
  queue: any,
  docs: any[],
) {
  const endpointNames = Object.keys(COLLECTION_ENDPOINTS) as CollectionName[];
  const pendingCreates = new Set(
    docs
      .map((entryDoc) => entryDoc.toJSON() as SyncQueueEntry)
      .filter((entry) => entry.operation === "create")
      .map((entry) => `${entry.collectionName}:${entry.docId}`),
  );

  for (const entryDoc of docs) {
    const entry = entryDoc.toJSON() as SyncQueueEntry;
    if (!endpointNames.includes(entry.collectionName as CollectionName)) continue;
    if (entry.operation !== "update" && entry.operation !== "delete") continue;
    if (pendingCreates.has(`${entry.collectionName}:${entry.docId}`)) continue;

    const coll = db[entry.collectionName as CollectionName] as any;
    if (!coll) continue;

    // Check if the local document still exists
    const local = await coll
      .findOne({ selector: { _id: entry.docId } as any })
      .exec();

    if (!local) {
      console.warn(
        `[outbox] cleanup orphan entry ${entry.collectionName}/${entry.docId} (doc no longer exists)`,
      );
      await removeQueueEntry(queue, entryDoc, entry._id).catch((err) =>
        console.error("[outbox] cleanup orphan failed", err),
      );
    }
  }
}

/**
 * Dependency rank ensures parent entities are pushed before their dependents:
 * users → groups → members/categories → expenses → participants.
 */
function outboxDependencyRank(collectionName: string): number {
  if (collectionName === "users") return 0;
  if (collectionName === "groups") return 1;
  if (collectionName === "groupMembers") return 2;
  if (collectionName === "categories") return 2;
  if (collectionName === "expenses") return 3;
  if (collectionName === "expenseParticipants") return 4;
  return 10;
}

export async function enqueue(db: AppDatabase, input: EnqueueInput) {
  // Do not enqueue pull-only collections
  const entry = COLLECTION_ENDPOINTS[input.collectionName as CollectionName];
  if (entry?.pullOnly) {
    console.warn(`[outbox] skipping enqueue for pull-only collection "${input.collectionName}"`);
    return;
  }

  const queueEntry: SyncQueueEntry = {
    _id: generateQueueId(),
    collectionName: input.collectionName,
    docId: input.docId,
    operation: input.operation,
    payload: input.payload,
    attempts: 0,
    createdAt: new Date().toISOString(),
  };

  try {
    await (db.syncQueue as any).insert(queueEntry);
  } catch (e) {
    console.error("[outbox] enqueue failed", e);
  }
}

export async function drainOutbox(db: AppDatabase) {
  const queue = db.syncQueue as any;
  if (!queue) return;

  const initialDocs = await queue
    .find({
      selector: {},
      sort: [{ createdAt: "asc" }],
    })
    .exec();
  await cleanupImpossibleEntries(db, queue, initialDocs);

  const docs = await queue
    .find({
      selector: {},
      sort: [{ createdAt: "asc" }],
    })
    .exec();

  const sortedDocs = [...docs].sort((a: any, b: any) => {
    const ea = a.toJSON() as SyncQueueEntry;
    const eb = b.toJSON() as SyncQueueEntry;
    const ra = outboxDependencyRank(ea.collectionName);
    const rb = outboxDependencyRank(eb.collectionName);
    if (ra !== rb) return ra - rb;
    return String(ea.createdAt).localeCompare(String(eb.createdAt));
  });

  for (const entryDoc of sortedDocs) {
    const entry = entryDoc.toJSON() as SyncQueueEntry;

    if (entry.attempts >= MAX_OUTBOX_ATTEMPTS) {
      console.warn(
        `[outbox] dropping after ${MAX_OUTBOX_ATTEMPTS} attempts ${entry.collectionName}/${entry.docId}`,
      );
      await removeQueueEntry(queue, entryDoc, entry._id).catch((err) =>
        console.error("[outbox] drop max-attempts failed", err),
      );
      continue;
    }

    try {
      await pushDocument(
        db,
        entry.collectionName,
        entry.payload,
        entry.operation,
      );
    } catch (e) {
      console.error(
        `[outbox] push failed ${entry.collectionName}/${entry.docId}`,
        e,
      );

      if (isNonRetryableHttpError(e)) {
        console.warn(
          `[outbox] dropping non-retryable entry ${entry.collectionName}/${entry.docId}`,
        );
        await removeQueueEntry(queue, entryDoc, entry._id).catch((err) =>
          console.error("[outbox] drop invalid entry failed", err),
        );
        continue;
      }

      await bumpAttempts(queue, entry).catch((err) =>
        console.error("[outbox] bump attempts failed", err),
      );
      const nextAttempts = entry.attempts + 1;
      if (nextAttempts >= MAX_OUTBOX_ATTEMPTS) {
        console.warn(
          `[outbox] dropping after ${MAX_OUTBOX_ATTEMPTS} attempts ${entry.collectionName}/${entry.docId}`,
        );
        await removeQueueEntry(queue, entryDoc, entry._id).catch((err) =>
          console.error("[outbox] drop max-attempts failed", err),
        );
        continue;
      }
      break;
    }

    try {
      await removeQueueEntry(queue, entryDoc, entry._id);
    } catch (e) {
      console.error("[outbox] cleanup failed", e);
      break;
    }
  }
}

/**
 * Drains only outbox entries for a specific collection.
 * Used by triggerCollectionSync for per-collection refresh.
 */
export async function drainOutboxForCollection(
  db: AppDatabase,
  collectionName: CollectionName,
) {
  const queue = db.syncQueue as any;
  if (!queue) return;

  const docs = await queue
    .find({
      selector: { collectionName },
      sort: [{ createdAt: "asc" }],
    })
    .exec();

  for (const entryDoc of docs) {
    const entry = entryDoc.toJSON() as SyncQueueEntry;

    if (entry.attempts >= MAX_OUTBOX_ATTEMPTS) {
      await removeQueueEntry(queue, entryDoc, entry._id).catch(console.error);
      continue;
    }

    try {
      await pushDocument(
        db,
        entry.collectionName,
        entry.payload,
        entry.operation,
      );
    } catch (e) {
      console.error(
        `[outbox] push failed ${entry.collectionName}/${entry.docId}`,
        e,
      );
      if (isNonRetryableHttpError(e)) {
        await removeQueueEntry(queue, entryDoc, entry._id).catch(console.error);
        continue;
      }
      await bumpAttempts(queue, entry).catch(console.error);
      break;
    }

    await removeQueueEntry(queue, entryDoc, entry._id).catch(console.error);
  }
}

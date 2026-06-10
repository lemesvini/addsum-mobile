import type { AppDatabase, CollectionName } from "@/db/index";
import { normalizePulledDoc } from "./normalizers";

const APPLY_BATCH_SIZE = 250;

type AppliedPulledDocument = {
  doc: Record<string, any>;
  localId: string;
};

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function comparableDoc(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => comparableDoc(item));
  if (!value || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    if (key === "_attachments" || key === "_meta" || key === "_rev") continue;
    const item = (value as Record<string, unknown>)[key];
    if (item === undefined) continue;
    out[key] = comparableDoc(item);
  }
  return out;
}

function documentsAreEqual(
  existing: Record<string, unknown> | undefined,
  incoming: Record<string, unknown>,
): boolean {
  if (!existing) return false;
  return (
    JSON.stringify(comparableDoc(existing)) ===
    JSON.stringify(comparableDoc(incoming))
  );
}

function isRemoteTombstone(doc: Record<string, unknown>): boolean {
  return doc.deletedAt != null && doc.deletedAt !== "";
}

function logApplyFailure(
  collectionName: CollectionName,
  raw: unknown,
  error: unknown,
) {
  const rawId =
    raw && typeof raw === "object"
      ? ((raw as Record<string, unknown>)._id ??
        (raw as Record<string, unknown>).id)
      : undefined;
  console.error(
    `[sync] failed to apply pulled doc ${collectionName}/${String(rawId ?? "unknown")}`,
    error,
  );
}

async function findExistingByLocalId(
  collection: any,
  localIds: string[],
): Promise<Map<string, any>> {
  if (localIds.length === 0) return new Map();
  const docs = await collection
    .find({ selector: { _id: { $in: localIds } } })
    .exec();
  return new Map(
    docs.map((doc: any) => [String(doc?._data?._id), doc] as const),
  );
}

/**
 * Applies a batch of pulled documents to the local RxDB collection.
 * Handles tombstones, skips no-op updates, and uses bulkUpsert for efficiency.
 * Yields to the UI thread between batches to avoid blocking the JS thread.
 */
export async function applyPulledDocuments(
  db: AppDatabase,
  collectionName: CollectionName,
  documents: Record<string, unknown>[],
): Promise<AppliedPulledDocument[]> {
  const collection = db[collectionName] as any;
  const applied: AppliedPulledDocument[] = [];

  for (let index = 0; index < documents.length; index += APPLY_BATCH_SIZE) {
    const batch = documents.slice(index, index + APPLY_BATCH_SIZE);
    const normalized: {
      raw: Record<string, unknown>;
      doc: Record<string, any>;
    }[] = [];

    for (const raw of batch) {
      try {
        normalized.push({
          raw,
          doc: normalizePulledDoc(
            collectionName as string,
            raw as Record<string, any>,
          ),
        });
      } catch (error) {
        logApplyFailure(collectionName, raw, error);
      }
    }

    const localIds = Array.from(
      new Set(normalized.map(({ doc }) => String(doc._id))),
    );

    const existingByLocalId = await findExistingByLocalId(collection, localIds);
    const bulkUpsertByLocalId = new Map<string, Record<string, any>>();

    for (const { raw, doc } of normalized) {
      try {
        const localId = String(doc._id);
        const existing = existingByLocalId.get(localId);

        if (isRemoteTombstone(doc)) {
          if (existing) await existing.remove();
          applied.push({
            doc,
            localId: String(existing?._data?._id ?? localId),
          });
          continue;
        }

        if (documentsAreEqual(existing?._data, doc)) {
          applied.push({ doc, localId: String(existing._data._id) });
          continue;
        }

        bulkUpsertByLocalId.set(localId, doc);
      } catch (error) {
        logApplyFailure(collectionName, raw, error);
      }
    }

    const bulkDocs = Array.from(bulkUpsertByLocalId.values());
    if (bulkDocs.length > 0) {
      try {
        const result = await collection.bulkUpsert(bulkDocs);
        for (const doc of result.success ?? []) {
          applied.push({
            doc: doc.toJSON(),
            localId: String(doc?._data?._id ?? doc.primary),
          });
        }
        for (const error of result.error ?? []) {
          logApplyFailure(collectionName, error?.writeRow?.document, error);
        }
      } catch (error) {
        for (const doc of bulkDocs) logApplyFailure(collectionName, doc, error);
      }
    }

    await yieldToUi();
  }

  return applied;
}

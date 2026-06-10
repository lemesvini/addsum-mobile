import { api } from "@/common/api/api-client";
import type { AppDatabase, CollectionName } from "@/db/index";
import {
  COLLECTION_ENDPOINTS,
  createUrl,
  patchUrl,
  deleteUrl,
} from "../endpoints";
import { sanitizePushPayload } from "./sanitizers";
import { transformPayloadWithUploadedMedia } from "./media-upload";

export const RESERVED_PUSH_FIELDS = new Set([
  "_rev",
  "_attachments",
  "_meta",
  "_deleted",
  "createdAt",
  "updatedAt",
]);

export function stripInternalFields<T extends Record<string, unknown>>(doc: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc)) {
    if (RESERVED_PUSH_FIELDS.has(k)) continue;
    out[k] = v;
  }
  return out;
}

/**
 * Loads the latest version of a local document from RxDB, merged with the
 * outbox payload so any fields set since enqueue are included.
 */
async function loadLatestDocPayload(
  db: AppDatabase,
  collectionName: string,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const coll = db[collectionName as CollectionName] as any;
  if (!coll) return payload;
  const localId = (payload as { _id?: string })._id;
  if (!localId) return payload;
  try {
    const latest = await coll
      .findOne({ selector: { _id: localId } as any })
      .exec();
    if (latest) {
      return {
        ...payload,
        ...(latest.toJSON() as Record<string, unknown>),
      };
    }
  } catch {
    /* ignore */
  }
  return payload;
}

/**
 * Requires a valid string _id to use as the URL param for PATCH/DELETE.
 * Unlike reticar, genesis uses the MongoDB _id directly as the URL param.
 */
function requireStringId(doc: Record<string, any>): string {
  if (typeof doc._id === "string" && doc._id.length > 0) return doc._id;
  throw new Error(
    "[sync] PATCH/DELETE require a string _id; document may not have been created yet",
  );
}

async function patchLocalMediaAfterUpload(
  db: AppDatabase,
  collectionName: string,
  out: Record<string, unknown>,
) {
  const localId = typeof out._id === "string" ? out._id : undefined;
  if (!localId) return;

  try {
    const collection = db[collectionName as CollectionName] as any;
    const existing = await collection
      .findOne({ selector: { _id: localId } as any })
      .exec();
    if (!existing) return;

    const patch: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };
    if ("avatarUrl" in out) patch.avatarUrl = out.avatarUrl;
    if ("imageUrl" in out) patch.imageUrl = out.imageUrl;
    if ("receiptImageUrl" in out) patch.receiptImageUrl = out.receiptImageUrl;
    await existing.patch(patch);
  } catch (e) {
    console.warn(
      `[sync] failed to patch uploaded media for ${collectionName}/${localId}`,
      e,
    );
  }
}

export async function pushDocument(
  db: AppDatabase,
  collectionName: string,
  doc: Record<string, unknown>,
  operation: "create" | "update" | "delete",
) {
  const entry = COLLECTION_ENDPOINTS[collectionName as CollectionName];
  if (!entry) {
    console.warn(
      `[sync] no endpoint registered for "${collectionName}" — skipping push`,
    );
    return;
  }
  if (entry.pullOnly) {
    console.warn(
      `[sync] "${collectionName}" is pull-only — skipping push`,
    );
    return;
  }

  const slug = entry.sync;

  switch (operation) {
    case "create": {
      let payload = await loadLatestDocPayload(db, collectionName, doc);
      payload = await transformPayloadWithUploadedMedia(collectionName, payload);
      await patchLocalMediaAfterUpload(db, collectionName, payload);

      // Strip RxDB internals but keep _id (client-generated ObjectId sent to server)
      payload = stripInternalFields(payload);

      const body = sanitizePushPayload(collectionName, payload, "create");

      // api interceptor returns response.data directly
      const response = await api.post<{ data?: any } | any>(
        createUrl(slug),
        body,
      );

      // response may be the doc directly, or wrapped in { data: doc }
      const created = (
        ((response as any)?._id != null ? response : null) ??
        (response as any)?.data ?? null
      ) as Record<string, any> | null;

      if (
        created != null &&
        typeof created._id === "string" &&
        created._id !== (doc as any)._id
      ) {
        try {
          const collection = db[collectionName as CollectionName] as any;
          const existing = await collection
            .findOne({ selector: { _id: (doc as any)._id } })
            .exec();
          if (existing) {
            await existing.patch({ _id: created._id });
          }
        } catch (e) {
          console.warn(
            `[sync] failed to backfill _id for ${collectionName}/${(doc as any)._id}`,
            e,
          );
        }
      }
      return;
    }
    case "update": {
      let payload = await loadLatestDocPayload(db, collectionName, doc);
      payload = await transformPayloadWithUploadedMedia(collectionName, payload);
      await patchLocalMediaAfterUpload(db, collectionName, payload);

      const urlId = requireStringId(payload as Record<string, any>);
      payload = stripInternalFields(payload);

      const body = sanitizePushPayload(collectionName, payload, "update");
      await api.patch(patchUrl(slug, urlId), body);
      return;
    }
    case "delete": {
      const payload = await loadLatestDocPayload(db, collectionName, doc);
      const urlId = requireStringId(payload as Record<string, any>);
      await api.delete(deleteUrl(slug, urlId));
      return;
    }
  }
}

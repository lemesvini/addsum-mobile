import type { RxJsonSchema } from "rxdb";

export type SyncQueueOperation = "create" | "update" | "delete";

export type SyncQueueEntry = {
  _id: string;
  collectionName: string;
  docId: string;
  operation: SyncQueueOperation;
  payload: Record<string, unknown>;
  attempts: number;
  createdAt: string;
};

export const syncQueueSchema: RxJsonSchema<SyncQueueEntry> = {
  version: 0,
  primaryKey: "_id",
  type: "object",
  properties: {
    _id: { type: "string", maxLength: 100 },
    collectionName: { type: "string", maxLength: 50 },
    docId: { type: "string", maxLength: 100 },
    operation: {
      type: "string",
      enum: ["create", "update", "delete"],
      maxLength: 10,
    },
    payload: { type: "object" },
    attempts: { type: "number", minimum: 0, maximum: 1e9, multipleOf: 1 },
    createdAt: { type: "string", maxLength: 40 },
  },
  required: [
    "_id",
    "collectionName",
    "docId",
    "operation",
    "payload",
    "attempts",
    "createdAt",
  ],
};

import type { RxJsonSchema } from "rxdb";

export type CategoryDoc = {
  _id: string;
  /** Group _id (string ObjectId) */
  groupId: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export const categorySchema: RxJsonSchema<CategoryDoc> = {
  version: 0,
  primaryKey: "_id",
  type: "object",
  properties: {
    _id: { type: "string", maxLength: 100 },
    groupId: { type: "string" },
    name: { type: "string" },
    status: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    deletedAt: { type: "string" },
  },
  required: ["_id", "groupId", "name", "createdAt", "updatedAt"],
};

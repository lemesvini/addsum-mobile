import type { RxJsonSchema } from "rxdb";

export type GroupDoc = {
  _id: string;
  name: string;
  description?: string;
  inviteCode?: string;
  /** Cover image URL. Local `file://` while pending offline upload, then remote `https://`. */
  imageUrl?: string;
  /** Admin user _id (string ObjectId) */
  adminUserId: string;
  allCreateExpenses: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export const groupSchema: RxJsonSchema<GroupDoc> = {
  version: 0,
  primaryKey: "_id",
  type: "object",
  properties: {
    _id: { type: "string", maxLength: 100 },
    name: { type: "string" },
    description: { type: "string" },
    inviteCode: { type: "string" },
    imageUrl: { type: "string" },
    adminUserId: { type: "string" },
    allCreateExpenses: { type: "boolean" },
    status: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    deletedAt: { type: "string" },
  },
  required: ["_id", "name", "adminUserId", "createdAt", "updatedAt"],
};

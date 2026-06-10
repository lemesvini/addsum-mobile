import type { RxJsonSchema } from "rxdb";

export type GroupMemberDoc = {
  _id: string;
  /** Group _id (string ObjectId) */
  groupId: string;
  /** User _id (string ObjectId) */
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export const groupMemberSchema: RxJsonSchema<GroupMemberDoc> = {
  version: 0,
  primaryKey: "_id",
  type: "object",
  properties: {
    _id: { type: "string", maxLength: 100 },
    groupId: { type: "string" },
    userId: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    deletedAt: { type: "string" },
  },
  required: ["_id", "groupId", "userId", "createdAt", "updatedAt"],
};

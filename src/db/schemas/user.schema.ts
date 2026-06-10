import type { RxJsonSchema } from "rxdb";

export type UserDoc = {
  _id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  pix?: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export const userSchema: RxJsonSchema<UserDoc> = {
  version: 0,
  primaryKey: "_id",
  type: "object",
  properties: {
    _id: { type: "string", maxLength: 100 },
    fullName: { type: "string" },
    email: { type: "string" },
    avatarUrl: { type: "string" },
    pix: { type: "string" },
    role: { type: "string" },
    status: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    deletedAt: { type: "string" },
  },
  required: ["_id", "fullName", "email", "role", "status", "createdAt", "updatedAt"],
};

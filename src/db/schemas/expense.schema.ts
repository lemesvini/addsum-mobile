import type { RxJsonSchema } from "rxdb";

export type ExpenseDoc = {
  _id: string;
  /** Group _id (string ObjectId) */
  groupId: string;
  /** Creator user _id (string ObjectId) */
  createdByUserId: string;
  /** Category _id (string ObjectId) */
  categoryId: string;
  description: string;
  totalAmount: number;
  /** ISO date string */
  date: string;
  /** Receipt image URL — local `file://` URI until synced, then remote `https://`. */
  receiptImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export const expenseSchema: RxJsonSchema<ExpenseDoc> = {
  version: 0,
  primaryKey: "_id",
  type: "object",
  properties: {
    _id: { type: "string", maxLength: 100 },
    groupId: { type: "string" },
    createdByUserId: { type: "string" },
    categoryId: { type: "string" },
    description: { type: "string" },
    totalAmount: { type: "number" },
    date: { type: "string" },
    receiptImageUrl: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    deletedAt: { type: "string" },
  },
  required: [
    "_id",
    "groupId",
    "createdByUserId",
    "categoryId",
    "description",
    "totalAmount",
    "date",
    "createdAt",
    "updatedAt",
  ],
};

import type { RxJsonSchema } from "rxdb";

export type ExpenseParticipantDoc = {
  _id: string;
  /** Expense _id (string ObjectId) */
  expenseId: string;
  /** User _id (string ObjectId) */
  userId: string;
  amountOwed: number;
  /** PENDING | PAID | CONFIRMED | REJECTED */
  status: string;
  paidAt?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
};

export const expenseParticipantSchema: RxJsonSchema<ExpenseParticipantDoc> = {
  version: 0,
  primaryKey: "_id",
  type: "object",
  properties: {
    _id: { type: "string", maxLength: 100 },
    expenseId: { type: "string" },
    userId: { type: "string" },
    amountOwed: { type: "number" },
    status: { type: "string" },
    paidAt: { type: "string" },
    confirmedAt: { type: "string" },
    createdAt: { type: "string" },
    updatedAt: { type: "string" },
    deletedAt: { type: "string" },
  },
  required: [
    "_id",
    "expenseId",
    "userId",
    "amountOwed",
    "status",
    "createdAt",
    "updatedAt",
  ],
};

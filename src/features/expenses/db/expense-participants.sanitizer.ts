import { refToId } from "@/sync/pull/base-fields";

export function sanitizeExpenseParticipant(
  payload: Record<string, unknown>,
  operation: "create" | "update",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const p = payload as any;

  if (p.expenseId !== undefined) {
    out.expenseId = refToId(p.expenseId) ?? p.expenseId;
  }
  if (p.userId !== undefined) out.userId = refToId(p.userId) ?? p.userId;
  if (p.amountOwed !== undefined) out.amountOwed = p.amountOwed;
  if (p.status !== undefined) out.status = p.status;
  if (p.paidAt !== undefined) out.paidAt = p.paidAt;
  if (p.confirmedAt !== undefined) out.confirmedAt = p.confirmedAt;

  if (operation === "create" && p._id !== undefined) out._id = p._id;
  return out;
}

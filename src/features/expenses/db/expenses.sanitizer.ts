import { refToId } from "@/sync/pull/base-fields";

export function sanitizeExpense(
  payload: Record<string, unknown>,
  operation: "create" | "update",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const p = payload as any;

  if (p.groupId !== undefined) out.groupId = refToId(p.groupId) ?? p.groupId;
  if (p.createdByUserId !== undefined) {
    out.createdByUserId = refToId(p.createdByUserId) ?? p.createdByUserId;
  }
  if (p.categoryId !== undefined) {
    out.categoryId = refToId(p.categoryId) ?? p.categoryId;
  }
  if (p.description !== undefined) out.description = p.description;
  if (p.totalAmount !== undefined) out.totalAmount = p.totalAmount;
  if (p.date !== undefined) out.date = p.date;
  if (p.receiptImageUrl !== undefined) {
    out.receiptImageUrl = p.receiptImageUrl;
  }

  if (operation === "create" && p._id !== undefined) out._id = p._id;
  return out;
}

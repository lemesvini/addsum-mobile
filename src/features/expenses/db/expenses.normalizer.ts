import { buildNormalizedBase, refToId, toIso } from "@/sync/pull/base-fields";
import type { LocalDoc } from "@/sync/pull/base-fields";

export function normalizeExpense(raw: Record<string, any>): LocalDoc {
  return {
    ...buildNormalizedBase(raw),
    groupId: refToId(raw.groupId) ?? raw.groupId ?? "",
    createdByUserId: refToId(raw.createdByUserId) ?? raw.createdByUserId ?? "",
    categoryId: refToId(raw.categoryId) ?? raw.categoryId ?? "",
    description: raw.description ?? "",
    totalAmount: Number(raw.totalAmount ?? 0),
    date: raw.date != null ? toIso(raw.date) : toIso(Date.now()),
    ...(raw.receiptImageUrl
      ? { receiptImageUrl: String(raw.receiptImageUrl) }
      : {}),
  };
}

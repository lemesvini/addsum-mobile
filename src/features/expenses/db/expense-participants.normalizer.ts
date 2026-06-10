import { buildNormalizedBase, refToId, toIso } from "@/sync/pull/base-fields";
import type { LocalDoc } from "@/sync/pull/base-fields";

export function normalizeExpenseParticipant(
  raw: Record<string, any>,
): LocalDoc {
  return {
    ...buildNormalizedBase(raw),
    expenseId: refToId(raw.expenseId) ?? raw.expenseId ?? "",
    userId: refToId(raw.userId) ?? raw.userId ?? "",
    amountOwed: Number(raw.amountOwed ?? 0),
    status: raw.status ?? "PENDING",
    ...(raw.paidAt != null ? { paidAt: toIso(raw.paidAt) } : {}),
    ...(raw.confirmedAt != null ? { confirmedAt: toIso(raw.confirmedAt) } : {}),
  };
}

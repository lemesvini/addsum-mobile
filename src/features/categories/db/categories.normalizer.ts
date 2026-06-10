import { buildNormalizedBase, refToId } from "@/sync/pull/base-fields";
import type { LocalDoc } from "@/sync/pull/base-fields";

export function normalizeCategory(raw: Record<string, any>): LocalDoc {
  return {
    ...buildNormalizedBase(raw),
    groupId: refToId(raw.groupId) ?? raw.groupId ?? "",
    name: raw.name ?? "",
    status: raw.status ?? "ACTIVE",
  };
}

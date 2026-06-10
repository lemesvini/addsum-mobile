import { buildNormalizedBase, refToId } from "@/sync/pull/base-fields";
import type { LocalDoc } from "@/sync/pull/base-fields";

export function normalizeGroupMember(raw: Record<string, any>): LocalDoc {
  return {
    ...buildNormalizedBase(raw),
    groupId: refToId(raw.groupId) ?? raw.groupId ?? "",
    userId: refToId(raw.userId) ?? raw.userId ?? "",
  };
}

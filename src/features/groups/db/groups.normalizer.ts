import { buildNormalizedBase, refToId } from "@/sync/pull/base-fields";
import type { LocalDoc } from "@/sync/pull/base-fields";

export function normalizeGroup(raw: Record<string, any>): LocalDoc {
  return {
    ...buildNormalizedBase(raw),
    name: raw.name ?? "",
    ...(raw.description != null ? { description: raw.description } : {}),
    ...(raw.inviteCode != null ? { inviteCode: raw.inviteCode } : {}),
    ...(raw.imageUrl != null ? { imageUrl: raw.imageUrl } : {}),
    adminUserId: refToId(raw.adminUserId) ?? raw.adminUserId ?? "",
    allCreateExpenses: Boolean(raw.allCreateExpenses),
    status: raw.status ?? "ACTIVE",
  };
}

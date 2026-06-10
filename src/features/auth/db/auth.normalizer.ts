import { buildNormalizedBase, toIso } from "@/sync/pull/base-fields";
import type { LocalDoc } from "@/sync/pull/base-fields";

/** Normalizes a raw API user document into the local RxDB UserDoc shape. */
export function normalizeUser(raw: Record<string, any>): LocalDoc {
  return {
    ...buildNormalizedBase(raw),
    fullName: raw.fullName ?? "",
    email: raw.email ?? "",
    ...(raw.avatarUrl != null ? { avatarUrl: String(raw.avatarUrl) } : {}),
    role: raw.role ?? "",
    status: raw.status ?? "",
    ...(raw.deletedAt != null ? { deletedAt: toIso(raw.deletedAt) } : {}),
  };
}

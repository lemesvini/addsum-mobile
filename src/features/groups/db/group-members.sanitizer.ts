import { refToId } from "@/sync/pull/base-fields";

export function sanitizeGroupMember(
  payload: Record<string, unknown>,
  operation: "create" | "update",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const p = payload as any;

  if (p.groupId !== undefined) out.groupId = refToId(p.groupId) ?? p.groupId;
  if (p.userId !== undefined) out.userId = refToId(p.userId) ?? p.userId;

  if (operation === "create" && p._id !== undefined) out._id = p._id;
  return out;
}

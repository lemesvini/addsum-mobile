import { refToId } from "@/sync/pull/base-fields";

export function sanitizeCategory(
  payload: Record<string, unknown>,
  operation: "create" | "update",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const p = payload as any;

  if (p.groupId !== undefined) out.groupId = refToId(p.groupId) ?? p.groupId;
  if (p.name !== undefined) out.name = p.name;
  if (p.status !== undefined) out.status = p.status;

  if (operation === "create" && p._id !== undefined) out._id = p._id;
  return out;
}

import { refToId } from "@/sync/pull/base-fields";

/**
 * Sanitizes a local GroupDoc payload before pushing to the API.
 */
export function sanitizeGroup(
  payload: Record<string, unknown>,
  operation: "create" | "update",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const p = payload as any;

  if (p.name !== undefined) out.name = p.name;
  if (p.description !== undefined) out.description = p.description;
  if (p.inviteCode !== undefined) out.inviteCode = p.inviteCode;
  if (p.imageUrl !== undefined) out.imageUrl = p.imageUrl;
  if (p.adminUserId !== undefined) {
    out.adminUserId = refToId(p.adminUserId) ?? p.adminUserId;
  }
  if (p.allCreateExpenses !== undefined) {
    out.allCreateExpenses = p.allCreateExpenses;
  }
  if (p.status !== undefined) out.status = p.status;

  if (operation === "create" && p._id !== undefined) out._id = p._id;
  return out;
}

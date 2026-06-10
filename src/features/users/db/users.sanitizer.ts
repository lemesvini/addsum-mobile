/**
 * Sanitizes a local UserDoc payload before pushing to the API.
 */
export function sanitizeUserDoc(
  payload: Record<string, unknown>,
  operation: "create" | "update",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const p = payload as any;

  if (p.fullName !== undefined) out.fullName = p.fullName;
  if (p.email !== undefined) out.email = p.email;
  if (p.avatarUrl !== undefined) out.avatarUrl = p.avatarUrl;
  if (p.role !== undefined) out.role = p.role;
  if (p.status !== undefined) out.status = p.status;

  if (operation === "create" && p._id !== undefined) {
    out._id = p._id;
  }

  return out;
}

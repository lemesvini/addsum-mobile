/**
 * Sanitizes a local UserDoc payload before pushing to the API.
 * Auth (user self-creation) is not in the outbox scope for now;
 * this sanitizer is provided as a placeholder for future use.
 */
export function sanitizeUser(
  payload: Record<string, unknown>,
  _operation: "create" | "update",
): Record<string, unknown> {
  const { fullName, email, avatarUrl, role, status } = payload as any;
  const out: Record<string, unknown> = {};
  if (fullName !== undefined) out.fullName = fullName;
  if (email !== undefined) out.email = email;
  if (avatarUrl !== undefined) out.avatarUrl = avatarUrl;
  if (role !== undefined) out.role = role;
  if (status !== undefined) out.status = status;
  return out;
}

export type LocalDoc = Record<string, any>;

export function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string") return v;
  return new Date(v as any).toISOString();
}

/**
 * Builds normalized base fields shared by all collections.
 * - _id: always a string (uses raw._id, falls back to raw.id)
 * - createdAt / updatedAt: ISO strings
 * - deletedAt: only included when set (tombstone flag)
 *
 * Unlike reticar, genesis uses MongoDB _id (24-char hex) as the only id.
 * There is no separate numeric `id` field.
 */
export function buildNormalizedBase(raw: Record<string, any>): LocalDoc {
  const _id = String(raw._id ?? raw.id);
  const base: Record<string, any> = {
    _id,
    createdAt: raw.createdAt != null ? toIso(raw.createdAt) : toIso(Date.now()),
    updatedAt: raw.updatedAt != null ? toIso(raw.updatedAt) : toIso(Date.now()),
  };
  if (raw.deletedAt != null) base.deletedAt = toIso(raw.deletedAt);
  return base;
}

/** Returns string _id from a ref that may be a populated object, ObjectId string, or null. */
export function refToId(ref: unknown): string | undefined {
  if (ref == null) return undefined;
  if (typeof ref === "string") return ref;
  if (typeof ref === "object" && ref !== null) {
    const o = ref as Record<string, unknown>;
    if (typeof o._id === "string") return o._id;
    if (typeof o.id === "string") return o.id;
  }
  return undefined;
}

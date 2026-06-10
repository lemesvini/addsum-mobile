import type { CollectionName } from "@/db/index";

/**
 * Maps a local RxDB collection name to its sync slug.
 * All mutations go through POST/PATCH/DELETE /sync/:slug (unified contract).
 * GET /sync/:slug is used for pull.
 *
 * pullOnly: true  — no outbox push for this collection (server-managed reference data).
 * syncQueue is intentionally absent — it is local-only.
 */
export const COLLECTION_ENDPOINTS: Partial<
  Record<
    CollectionName,
    { sync: string; pullOnly?: boolean }
  >
> = {
  users:               { sync: "users" },
  groups:              { sync: "groups" },
  groupMembers:        { sync: "groupMembers" },
  categories:          { sync: "categories" },
  expenses:            { sync: "expenses" },
  expenseParticipants: { sync: "expenseParticipants" },
};

export const SYNC_COLLECTIONS = Object.keys(
  COLLECTION_ENDPOINTS,
) as CollectionName[];

/**
 * Pull order ensures parent entities are available before dependents:
 * users → groups → members/categories → expenses → participants.
 */
export const PULL_COLLECTION_ORDER: CollectionName[] = [
  "users",
  "groups",
  "groupMembers",
  "categories",
  "expenses",
  "expenseParticipants",
];

/** Helpers to build sync API URLs */
export function pullUrl(slug: string) {
  return `/sync/${slug}`;
}
export function createUrl(slug: string) {
  return `/sync/${slug}`;
}
export function patchUrl(slug: string, id: string) {
  return `/sync/${slug}/${id}`;
}
export function deleteUrl(slug: string, id: string) {
  return `/sync/${slug}/${id}`;
}

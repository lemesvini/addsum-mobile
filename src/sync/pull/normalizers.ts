import { normalizeUserDoc } from "@/features/users/db/users.normalizer";
import { normalizeGroup } from "@/features/groups/db/groups.normalizer";
import { normalizeGroupMember } from "@/features/groups/db/group-members.normalizer";
import { normalizeCategory } from "@/features/categories/db/categories.normalizer";
import { normalizeExpense } from "@/features/expenses/db/expenses.normalizer";
import { normalizeExpenseParticipant } from "@/features/expenses/db/expense-participants.normalizer";
import type { LocalDoc } from "./base-fields";

type NormalizerFn = (raw: Record<string, any>) => LocalDoc;

/**
 * Registry mapping collection names to their pull normalizer functions.
 * Each normalizer transforms a raw API document into a shape ready for RxDB.
 */
export const PULL_NORMALIZERS: Record<string, NormalizerFn> = {
  users: normalizeUserDoc,
  groups: normalizeGroup,
  groupMembers: normalizeGroupMember,
  categories: normalizeCategory,
  expenses: normalizeExpense,
  expenseParticipants: normalizeExpenseParticipant,
};

/**
 * Normalizes a raw pulled document for a given collection.
 * Falls back to returning the raw document if no normalizer is registered.
 */
export function normalizePulledDoc(
  collectionName: string,
  raw: Record<string, any>,
): LocalDoc {
  const normalizer = PULL_NORMALIZERS[collectionName];
  if (!normalizer) {
    console.warn(`[sync] no normalizer for collection "${collectionName}", using raw doc`);
    return raw as LocalDoc;
  }
  return normalizer(raw);
}

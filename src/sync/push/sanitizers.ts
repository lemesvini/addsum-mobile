import { sanitizeUserDoc } from "@/features/users/db/users.sanitizer";
import { sanitizeGroup } from "@/features/groups/db/groups.sanitizer";
import { sanitizeGroupMember } from "@/features/groups/db/group-members.sanitizer";
import { sanitizeCategory } from "@/features/categories/db/categories.sanitizer";
import { sanitizeExpense } from "@/features/expenses/db/expenses.sanitizer";
import { sanitizeExpenseParticipant } from "@/features/expenses/db/expense-participants.sanitizer";

type SanitizerFn = (
  payload: Record<string, unknown>,
  operation: "create" | "update",
) => Record<string, unknown>;

/**
 * Registry mapping collection names to their push sanitizer functions.
 * Each sanitizer transforms a local RxDB document into a body ready for the API.
 * Collections without a registered sanitizer pass through unchanged.
 */
export const PUSH_SANITIZERS: Record<string, SanitizerFn> = {
  users: sanitizeUserDoc,
  groups: sanitizeGroup,
  groupMembers: sanitizeGroupMember,
  categories: sanitizeCategory,
  expenses: sanitizeExpense,
  expenseParticipants: sanitizeExpenseParticipant,
};

/**
 * Sanitizes a local document payload before pushing to the API.
 * Falls back to returning the payload unchanged if no sanitizer is registered.
 */
export function sanitizePushPayload(
  collectionName: string,
  payload: Record<string, unknown>,
  operation: "create" | "update",
): Record<string, unknown> {
  const sanitizer = PUSH_SANITIZERS[collectionName];
  if (!sanitizer) return payload;
  return sanitizer(payload, operation);
}

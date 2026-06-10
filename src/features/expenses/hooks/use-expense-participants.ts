import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { ExpenseParticipantDoc } from "@/db/schemas/expense-participant.schema";

/**
 * Reactive participants for a single expense (when expenseId is provided), or
 * for a set of expenses (when expenseIds is provided — used to build a group's
 * full participant list and the home-screen balances).
 */
export function useExpenseParticipants(
  expenseId?: string,
  expenseIds?: string[],
) {
  const { db, isReady } = useDatabase();
  const [participants, setParticipants] = useState<ExpenseParticipantDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const idsKey = expenseIds ? expenseIds.join(",") : "";

  useEffect(() => {
    if (!db || !isReady) return;
    if (!expenseId && (!expenseIds || expenseIds.length === 0)) {
      setParticipants([]);
      setIsLoading(false);
      return;
    }

    const selector: Record<string, unknown> = {
      deletedAt: { $exists: false },
    };
    if (expenseId) selector.expenseId = expenseId;
    else selector.expenseId = { $in: expenseIds };

    const subscription = (db.expenseParticipants as any)
      .find({ selector })
      .$.subscribe((docs: any[]) => {
        setParticipants(
          docs.map((d) => d.toJSON() as ExpenseParticipantDoc),
        );
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, isReady, expenseId, idsKey]);

  return { participants, isLoading };
}

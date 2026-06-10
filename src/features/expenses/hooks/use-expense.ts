import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { ExpenseDoc } from "@/db/schemas/expense.schema";

/** Reactive single non-deleted expense by _id. */
export function useExpense(expenseId: string | undefined) {
  const { db, isReady } = useDatabase();
  const [expense, setExpense] = useState<ExpenseDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady || !expenseId) {
      setIsLoading(false);
      return;
    }

    const subscription = (db.expenses as any)
      .findOne({
        selector: { _id: expenseId, deletedAt: { $exists: false } },
      })
      .$.subscribe((doc: any) => {
        setExpense(doc ? (doc.toJSON() as ExpenseDoc) : null);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady, expenseId]);

  return { expense, isLoading };
}

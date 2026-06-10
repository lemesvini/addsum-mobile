import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { ExpenseDoc } from "@/db/schemas/expense.schema";

/**
 * Reactive list of every non-deleted expense across all groups (newest first).
 * Used by global search, where results aren't scoped to a single group.
 */
export function useAllExpenses() {
  const { db, isReady } = useDatabase();
  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady) return;

    const subscription = (db.expenses as any)
      .find({
        selector: { deletedAt: { $exists: false } },
        sort: [{ date: "desc" }],
      })
      .$.subscribe((docs: any[]) => {
        setExpenses(docs.map((d) => d.toJSON() as ExpenseDoc));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady]);

  return { expenses, isLoading };
}

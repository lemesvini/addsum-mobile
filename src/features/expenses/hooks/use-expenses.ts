import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { ExpenseDoc } from "@/db/schemas/expense.schema";

/** Reactive list of non-deleted expenses for a group (newest first). */
export function useExpenses(groupId: string | undefined) {
  const { db, isReady } = useDatabase();
  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady || !groupId) {
      setIsLoading(false);
      return;
    }

    const subscription = (db.expenses as any)
      .find({
        selector: { groupId, deletedAt: { $exists: false } },
        sort: [{ date: "desc" }],
      })
      .$.subscribe((docs: any[]) => {
        setExpenses(docs.map((d) => d.toJSON() as ExpenseDoc));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady, groupId]);

  return { expenses, isLoading };
}

import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { CategoryDoc } from "@/db/schemas/category.schema";

/** Reactive list of non-deleted categories for a group. */
export function useCategories(groupId: string | undefined) {
  const { db, isReady } = useDatabase();
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady || !groupId) {
      setIsLoading(false);
      return;
    }

    const subscription = (db.categories as any)
      .find({
        selector: { groupId, deletedAt: { $exists: false } },
        sort: [{ name: "asc" }],
      })
      .$.subscribe((docs: any[]) => {
        setCategories(docs.map((d) => d.toJSON() as CategoryDoc));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady, groupId]);

  return { categories, isLoading };
}

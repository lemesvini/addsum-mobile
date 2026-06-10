import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { GroupDoc } from "@/db/schemas/group.schema";

/**
 * Reactive list of non-deleted groups in the local DB. The server already
 * scopes the pull to the groups the user belongs to, so every local group is
 * one the user can see.
 */
export function useGroups() {
  const { db, isReady } = useDatabase();
  const [groups, setGroups] = useState<GroupDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady) return;

    const subscription = (db.groups as any)
      .find({
        selector: { deletedAt: { $exists: false } },
        sort: [{ createdAt: "desc" }],
      })
      .$.subscribe((docs: any[]) => {
        setGroups(docs.map((d) => d.toJSON() as GroupDoc));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady]);

  return { groups, isLoading };
}

import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { GroupDoc } from "@/db/schemas/group.schema";

/** Reactive query for a single group by _id. */
export function useGroup(id: string | undefined) {
  const { db, isReady } = useDatabase();
  const [group, setGroup] = useState<GroupDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady || !id) {
      setIsLoading(false);
      return;
    }

    const subscription = (db.groups as any)
      .findOne({ selector: { _id: id } })
      .$.subscribe((doc: any) => {
        setGroup(doc ? (doc.toJSON() as GroupDoc) : null);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady, id]);

  return { group, isLoading };
}

import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { UserDoc } from "@/db/schemas/user.schema";

/**
 * Reactive query that returns all non-deleted users from the local RxDB.
 * Automatically updates when the local database changes (pull sync, mutations).
 */
export function useUsers() {
  const { db, isReady } = useDatabase();
  const [users, setUsers] = useState<UserDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady) return;

    const subscription = (db.users as any)
      .find({
        selector: { deletedAt: { $exists: false } },
        sort: [{ fullName: "asc" }],
      })
      .$.subscribe((docs: any[]) => {
        setUsers(docs.map((d) => d.toJSON() as UserDoc));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady]);

  return { users, isLoading };
}

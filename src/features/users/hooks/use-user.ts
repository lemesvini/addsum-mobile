import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { UserDoc } from "@/db/schemas/user.schema";

/**
 * Reactive query for a single user by _id.
 */
export function useUser(id: string | undefined) {
  const { db, isReady } = useDatabase();
  const [user, setUser] = useState<UserDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady || !id) {
      setIsLoading(false);
      return;
    }

    const subscription = (db.users as any)
      .findOne({ selector: { _id: id } })
      .$.subscribe((doc: any) => {
        setUser(doc ? (doc.toJSON() as UserDoc) : null);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady, id]);

  return { user, isLoading };
}

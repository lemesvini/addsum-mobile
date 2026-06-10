import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { GroupMemberDoc } from "@/db/schemas/group-member.schema";

/** Reactive list of members for a group. */
export function useGroupMembers(groupId: string | undefined) {
  const { db, isReady } = useDatabase();
  const [members, setMembers] = useState<GroupMemberDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady || !groupId) {
      setIsLoading(false);
      return;
    }

    const subscription = (db.groupMembers as any)
      .find({ selector: { groupId, deletedAt: { $exists: false } } })
      .$.subscribe((docs: any[]) => {
        setMembers(docs.map((d) => d.toJSON() as GroupMemberDoc));
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady, groupId]);

  return { members, isLoading };
}

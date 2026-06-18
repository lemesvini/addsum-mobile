import { useQuery } from "@tanstack/react-query";
import { getGroupMembers } from "../api/groups-api";
import { queryKeys } from "@/common/lib/query-keys";

/** Members of a group, as full User documents. */
export function useGroupMembers(groupId: string | undefined) {
  const query = useQuery({
    queryKey: groupId
      ? queryKeys.groups.members(groupId)
      : ["groups", "members", "none"],
    queryFn: () => getGroupMembers(groupId as string),
    enabled: !!groupId,
  });
  return { members: query.data ?? [], isLoading: query.isLoading };
}

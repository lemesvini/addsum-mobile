import { useQuery, useQueries } from "@tanstack/react-query";
import { listGroups, getGroupMembers } from "../api/groups-api";
import { queryKeys } from "@/common/lib/query-keys";

/**
 * Map of `userId -> fullName` across every group the user belongs to. Used where
 * a name must be resolved for users who may span multiple groups (e.g. the
 * home-screen debt list), without a global `/users` endpoint.
 */
export function useAllMemberNames(): Map<string, string> {
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups.all(),
    queryFn: listGroups,
  });
  const groups = groupsQuery.data ?? [];

  const memberQueries = useQueries({
    queries: groups.map((g) => ({
      queryKey: queryKeys.groups.members(g._id),
      queryFn: () => getGroupMembers(g._id),
    })),
  });

  const map = new Map<string, string>();
  for (const q of memberQueries) {
    for (const u of q.data ?? []) map.set(u._id, u.fullName);
  }
  return map;
}

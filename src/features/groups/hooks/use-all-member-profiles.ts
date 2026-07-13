import { useQuery, useQueries } from "@tanstack/react-query";
import { listGroups, getGroupMembers } from "../api/groups-api";
import { queryKeys } from "@/common/lib/query-keys";

export type MemberProfile = {
  fullName: string;
  avatarUrl?: string;
  pix?: string;
};

/**
 * Map of `userId -> { fullName, avatarUrl }` across every group the user
 * belongs to. Like `useAllMemberNames`, but keeps the avatar for UIs that show
 * a person's picture (e.g. the Amigos tab). No global `/users` endpoint exists,
 * so profiles are derived from group memberships.
 */
export function useAllMemberProfiles(): Map<string, MemberProfile> {
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

  const map = new Map<string, MemberProfile>();
  for (const q of memberQueries) {
    for (const u of q.data ?? []) {
      map.set(u._id, {
        fullName: u.fullName,
        avatarUrl: u.avatarUrl,
        pix: u.pix,
      });
    }
  }
  return map;
}

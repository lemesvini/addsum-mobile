import { useQuery } from "@tanstack/react-query";
import { listGroups } from "../api/groups-api";
import { queryKeys } from "@/common/lib/query-keys";

/** List of groups the user can see (server-scoped). */
export function useGroups() {
  const query = useQuery({
    queryKey: queryKeys.groups.all(),
    queryFn: listGroups,
  });
  return {
    groups: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}

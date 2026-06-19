import { useQuery } from "@tanstack/react-query";
import { getGroup } from "../api/groups-api";
import { queryKeys } from "@/common/lib/query-keys";

export function useGroup(id: string | undefined) {
  const query = useQuery({
    queryKey: id ? queryKeys.groups.detail(id) : ["groups", "detail", "none"],
    queryFn: () => getGroup(id as string),
    enabled: !!id,
  });
  return { group: query.data ?? null, isLoading: query.isLoading };
}

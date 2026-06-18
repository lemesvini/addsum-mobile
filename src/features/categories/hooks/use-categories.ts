import { useQuery } from "@tanstack/react-query";
import { listCategories } from "../api/categories-api";
import { queryKeys } from "@/common/lib/query-keys";

export function useCategories(groupId: string | undefined) {
  const query = useQuery({
    queryKey: groupId
      ? queryKeys.groups.categories(groupId)
      : ["groups", "categories", "none"],
    queryFn: () => listCategories(groupId as string),
    enabled: !!groupId,
  });
  return { categories: query.data ?? [], isLoading: query.isLoading };
}

import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createCategory as apiCreateCategory,
  type Category,
} from "../api/categories-api";
import { queryKeys } from "@/common/lib/query-keys";

export function useCategoriesMutations() {
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: ({ groupId, name }: { groupId: string; name: string }) =>
      apiCreateCategory(groupId, { name }),
    onSuccess: (_category, { groupId }) => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.categories(groupId) });
    },
  });

  const createCategory = useCallback(
    (groupId: string, name: string): Promise<Category> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Informe um nome para a categoria");
      return createMutation.mutateAsync({ groupId, name: trimmed });
    },
    [createMutation],
  );

  return { createCategory };
}

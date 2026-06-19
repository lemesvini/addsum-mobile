import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createGroup as apiCreateGroup,
  updateGroup as apiUpdateGroup,
  joinGroup as apiJoinGroup,
  deleteGroup as apiDeleteGroup,
  type CreateGroupInput,
  type UpdateGroupInput,
} from "../api/groups-api";
import { uploadLocalGroupImageUrl } from "@/common/api/media-upload";
import { queryKeys } from "@/common/lib/query-keys";

type CreateGroupHookInput = {
  name: string;
  description?: string;
  allCreateExpenses?: boolean;
  /** Local `file://` URI or remote URL; uploaded before POST. */
  imageUrl?: string;
};

/**
 * Group mutations. The server creates the group, the admin's membership and the
 * default categories in one call. Local image URIs are uploaded to S3 first.
 */
export function useGroupsMutations() {
  const qc = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (input: CreateGroupHookInput) => {
      const imageUrl = input.imageUrl
        ? await uploadLocalGroupImageUrl(input.imageUrl)
        : undefined;
      const payload: CreateGroupInput = {
        name: input.name,
        description: input.description,
        allCreateExpenses: input.allCreateExpenses,
        ...(imageUrl ? { imageUrl } : {}),
      };
      return apiCreateGroup(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      groupId,
      input,
    }: {
      groupId: string;
      input: UpdateGroupInput;
    }) => {
      const imageUrl =
        input.imageUrl !== undefined
          ? await uploadLocalGroupImageUrl(input.imageUrl)
          : undefined;
      const payload: UpdateGroupInput = {
        ...input,
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      };
      return apiUpdateGroup(groupId, payload);
    },
    onSuccess: (group) => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
      qc.invalidateQueries({ queryKey: queryKeys.groups.detail(group._id) });
    },
  });

  const joinMutation = useMutation({
    mutationFn: (inviteCode: string) => apiJoinGroup(inviteCode.toUpperCase()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (groupId: string) => apiDeleteGroup(groupId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.groups.all() });
    },
  });

  const createGroup = useCallback(
    async (input: CreateGroupHookInput): Promise<string> => {
      const group = await createMutation.mutateAsync(input);
      return group._id;
    },
    [createMutation],
  );

  const updateGroup = useCallback(
    async (groupId: string, input: UpdateGroupInput): Promise<void> => {
      await updateMutation.mutateAsync({ groupId, input });
    },
    [updateMutation],
  );

  const joinGroup = useCallback(
    async (inviteCode: string): Promise<void> => {
      await joinMutation.mutateAsync(inviteCode);
    },
    [joinMutation],
  );

  const deleteGroup = useCallback(
    async (groupId: string): Promise<void> => {
      await deleteMutation.mutateAsync(groupId);
    },
    [deleteMutation],
  );

  return { createGroup, updateGroup, joinGroup, deleteGroup };
}

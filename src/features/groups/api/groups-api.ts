import { api } from "@/common/api/api-client";
import type { GroupStatus } from "@/common/types/enums";
import type { User } from "@/features/users/api/users-api";

export type Group = {
  _id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  inviteCode: string;
  adminUserId: string;
  allCreateExpenses: boolean;
  status: GroupStatus;
  createdAt: string;
  updatedAt?: string;
};

export type GroupMembershipStatus = "ACTIVE" | "LEAVING";

/** `GET /groups/:id/members` returns the joined User documents + membership status. */
export type GroupMember = User & { membershipStatus?: GroupMembershipStatus };

export type CreateGroupInput = {
  name: string;
  description?: string;
  imageUrl?: string;
  allCreateExpenses?: boolean;
};

export type UpdateGroupInput = {
  name?: string;
  description?: string;
  imageUrl?: string;
};

type ListResponse<T> = { message: string; data: T[]; metadata: { page: number; limit: number; total: number } };
type SingleResponse<T> = { message: string; data: T };

export async function listGroups(): Promise<Group[]> {
  const response = await api.get<ListResponse<Group>>("/groups?limit=100");
  return response.data;
}

export async function getGroup(id: string): Promise<Group> {
  const response = await api.get<SingleResponse<Group>>(`/groups/${id}`);
  return response.data;
}

export async function getGroupMembers(id: string): Promise<GroupMember[]> {
  const response = await api.get<ListResponse<GroupMember>>(`/groups/${id}/members?limit=100`);
  return response.data;
}

export async function createGroup(input: CreateGroupInput): Promise<Group> {
  const response = await api.post<SingleResponse<Group>>("/groups", input);
  return response.data;
}

export async function joinGroup(inviteCode: string): Promise<void> {
  await api.post("/groups/join", { inviteCode });
}

export async function updateGroup(id: string, input: UpdateGroupInput): Promise<Group> {
  const response = await api.patch<SingleResponse<Group>>(`/groups/${id}`, input);
  return response.data;
}

export async function deleteGroup(id: string): Promise<void> {
  await api.delete(`/groups/${id}`);
}

export async function regenerateInviteCode(id: string): Promise<Group> {
  const response = await api.post<SingleResponse<Group>>(`/groups/${id}/regenerate-invite-code`);
  return response.data;
}

export async function leaveGroup(id: string): Promise<{ status: "LEFT" | "LEAVING" }> {
  const response = await api.post<SingleResponse<{ status: "LEFT" | "LEAVING" }>>(
    `/groups/${id}/leave`,
  );
  return response.data;
}

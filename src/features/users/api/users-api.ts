import { api } from "@/common/api/api-client";
import type { UserRole, UserStatus } from "@/common/types/enums";

export type User = {
  _id: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  pix?: string;
  role?: UserRole;
  status?: UserStatus;
  createdAt: string;
  updatedAt?: string;
};

type ListResponse<T> = { message: string; data: T[]; metadata: { page: number; limit: number; total: number } };

export async function listUsers(): Promise<User[]> {
  const response = await api.get<ListResponse<User>>("/users?limit=100");
  return response.data;
}

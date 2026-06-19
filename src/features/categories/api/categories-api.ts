import { api } from "@/common/api/api-client";
import type { CategoryStatus } from "@/common/types/enums";

export type Category = {
  _id: string;
  groupId: string;
  name: string;
  status: CategoryStatus;
  createdAt: string;
  updatedAt?: string;
};

export type CreateCategoryInput = {
  name: string;
};

export type UpdateCategoryInput = {
  name?: string;
  status?: string;
};

type ApiResponse<T> = { message: string; data: T };

export async function listCategories(groupId: string): Promise<Category[]> {
  const response = await api.get<ApiResponse<Category[]>>(
    `/groups/${groupId}/categories?limit=100`,
  );
  return response.data;
}

export async function createCategory(
  groupId: string,
  input: CreateCategoryInput,
): Promise<Category> {
  const response = await api.post<ApiResponse<Category>>(
    `/groups/${groupId}/categories`,
    input,
  );
  return response.data;
}

export async function updateCategory(
  groupId: string,
  id: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  const response = await api.patch<ApiResponse<Category>>(
    `/groups/${groupId}/categories/${id}`,
    input,
  );
  return response.data;
}

export async function deleteCategory(
  groupId: string,
  id: string,
): Promise<void> {
  await api.delete(`/groups/${groupId}/categories/${id}`);
}

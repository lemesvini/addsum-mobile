import { api } from "@/common/api/api-client";
import type { ExpenseParticipantStatus } from "@/common/types/enums";

export type ExpenseParticipant = {
  _id: string;
  expenseId: string;
  userId: string;
  amountOwed: number;
  status: ExpenseParticipantStatus;
  paidAt?: string;
  confirmedAt?: string;
  createdAt: string;
  updatedAt?: string;
};

export type Expense = {
  _id: string;
  groupId: string;
  createdByUserId: string;
  categoryId: string;
  description: string;
  totalAmount: number;
  date: string;
  receiptImageUrl?: string;
  participants: ExpenseParticipant[];
  createdAt: string;
  updatedAt: string;
};

export type CreateExpenseInput = {
  categoryId: string;
  description: string;
  totalAmount: number;
  date: string;
  receiptImageUrl?: string;
  participants: { userId: string; amountOwed: number }[];
};

type ApiResponse<T> = { message: string; data: T };

export async function listExpenses(groupId: string): Promise<Expense[]> {
  const response = await api.get<ApiResponse<Expense[]>>(
    `/groups/${groupId}/expenses`,
    { params: { limit: 100, sort: JSON.stringify({ date: "desc" }) } },
  );
  return response.data;
}

export async function getExpense(
  groupId: string,
  id: string,
): Promise<Expense> {
  const response = await api.get<ApiResponse<Expense>>(
    `/groups/${groupId}/expenses/${id}`,
  );
  return response.data;
}

export async function createExpense(
  groupId: string,
  input: CreateExpenseInput,
): Promise<Expense> {
  const response = await api.post<ApiResponse<Expense>>(
    `/groups/${groupId}/expenses`,
    input,
  );
  return response.data;
}

export async function deleteExpense(
  groupId: string,
  id: string,
): Promise<void> {
  await api.delete(`/groups/${groupId}/expenses/${id}`);
}

export async function declarePayment(
  groupId: string,
  participantId: string,
): Promise<void> {
  await api.post(
    `/groups/${groupId}/expenses/participants/${participantId}/declare-payment`,
  );
}

export async function confirmPayment(
  groupId: string,
  participantId: string,
): Promise<void> {
  await api.post(
    `/groups/${groupId}/expenses/participants/${participantId}/confirm-payment`,
  );
}

export async function rejectPayment(
  groupId: string,
  participantId: string,
): Promise<void> {
  await api.post(
    `/groups/${groupId}/expenses/participants/${participantId}/reject-payment`,
  );
}

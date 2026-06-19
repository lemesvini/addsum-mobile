# RxDB → TanStack Query Migration + Offline Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the offline-first RxDB/SQLite/sync stack in `addsum-mobile` with a server-authoritative TanStack Query layer, and remove the offline feature completely.

**Architecture:** The existing axios `api` client + `api/*.ts` REST functions stay. Each RxDB subscription hook is rewritten to a `useQuery` wrapper that keeps the same export name and return shape (so screens barely change). Mutations use invalidate-and-refetch, except the payment state machine, which is optimistic. The entire `src/db`, `src/sync`, and offline-detection code is deleted.

**Tech Stack:** Expo / React Native, expo-router, `@tanstack/react-query` v5, axios, zustand (auth), TypeScript.

**Prerequisite:** The API plan (`addsum-api/docs/superpowers/plans/2026-06-18-api-rest-gap-fixes.md`) must be implemented **and deployed** first — this plan assumes `expense.participants` is embedded in expense responses, group create seeds members + categories, and the creator's participant is `CONFIRMED`.

## Global Constraints

- Keep every rewritten hook's **export name and return-shape keys** identical to today (`{ groups, isLoading }`, `{ expense, isLoading }`, `{ iOwe, owedToMe, totalIOwe, totalOwedToMe, net, isLoading }`, mutation fns `createGroup/updateGroup/joinGroup`, `createExpense/declarePayment/confirmPayment/rejectPayment`, `createCategory`) unless a step says otherwise.
- API responses are unwrapped by the axios interceptor — `api.get<T>()` resolves to the body, and the `api/*.ts` functions already `return response.data`.
- Money is `number`; ids are 24-char hex strings; dates are ISO strings.
- There is **no RN test runner**; per-task verification is `pnpm exec tsc --noEmit` and (final task) `pnpm lint` + `npx expo export --platform ios`.
- No global `GET /users` — resolve user names from `useGroupMembers` (returns `User[]`).
- Default branch is `main`; create branch `feat/tanstack-migration` before the first commit. Commit after each task.
- Image fields may be local `file://` URIs — upload via `@/common/api/media-upload` helpers (`uploadLocalGroupImageUrl`, `uploadLocalReceiptImageUrl`, returning the remote URL or `undefined`) inside mutations before POST/PATCH, since the sync push pipeline that used to do this is being deleted.

---

### Task 1: Install TanStack Query, mount the provider, fix logout

**Files:**
- Modify: `package.json` (deps)
- Modify: `src/app/_layout.tsx`
- Modify: `src/features/auth/hooks/use-logout.ts`

**Interfaces:**
- Produces: `QueryClientProvider` wrapping the app with the existing `queryClient` from `@/lib/query-client`; `useLogout().logout()` clears the query cache instead of resetting RxDB.

- [ ] **Step 1: Create the branch and install the dependency**

```bash
cd /Volumes/viniciusssd/epicora/addsum/addsum-mobile
git checkout -b feat/tanstack-migration
pnpm add @tanstack/react-query
```

- [ ] **Step 2: Mount `QueryClientProvider` in `src/app/_layout.tsx`**

Replace the file contents with:

```tsx
import {
  DarkTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { colorScheme as nwColorScheme } from "nativewind";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClientProvider } from "@tanstack/react-query";
import "../global.css";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { queryClient } from "@/lib/query-client";

nwColorScheme.set("dark");

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={DarkTheme}>
        <QueryClientProvider client={queryClient}>
          <AnimatedSplashOverlay />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(onboarding)" />
            <Stack.Screen name="(app)" />
          </Stack>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
```

(The `debug-database` screen is removed here; its file is deleted in Task 12.)

- [ ] **Step 3: Rewrite `src/features/auth/hooks/use-logout.ts`**

```ts
import { useAuthStore } from "../auth-store";
import { queryClient } from "@/lib/query-client";

export const useLogout = () => {
  const { removeAuthenticatedUser } = useAuthStore();

  const logout = async () => {
    removeAuthenticatedUser();
    queryClient.clear();
  };

  return { logout };
};
```

- [ ] **Step 4: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no NEW errors from these three files (errors elsewhere from RxDB are expected until later tasks; confirm `_layout.tsx`, `use-logout.ts` are clean).

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/app/_layout.tsx src/features/auth/hooks/use-logout.ts
git commit -m "feat: mount QueryClientProvider, clear cache on logout"
```

---

### Task 2: Strict union types aligned to the API

**Files:**
- Create: `src/common/types/enums.ts`
- Modify: `src/features/groups/api/groups-api.ts`
- Modify: `src/features/categories/api/categories-api.ts`
- Modify: `src/features/expenses/api/expenses-api.ts`
- Modify: `src/features/users/api/users-api.ts`

**Interfaces:**
- Produces: shared enums and entity types that exactly match the API; `GroupMember` becomes an alias of `User` (the `/groups/:id/members` endpoint returns joined users); `Expense.participants` typed with strict status.

- [ ] **Step 1: Create `src/common/types/enums.ts`**

```ts
export type UserRole = "ADMINISTRATOR" | "USER";
export type UserStatus = "ONBOARDING" | "ACTIVE" | "INACTIVE";
export type GroupStatus = "ACTIVE" | "INACTIVE";
export type CategoryStatus = "ACTIVE" | "INACTIVE";
export type ExpenseParticipantStatus =
  | "PENDING"
  | "PAID"
  | "CONFIRMED"
  | "REJECTED";
```

- [ ] **Step 2: Update `users-api.ts` `User` type**

Replace the `User` type (keep `listUsers` as-is) with:

```ts
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
```

- [ ] **Step 3: Update `groups-api.ts` types**

Replace the `Group` and `GroupMember` type declarations with:

```ts
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

/** `GET /groups/:id/members` returns the joined User documents. */
export type GroupMember = User;
```

Change `getGroupMembers` return type to `Promise<User[]>`:

```ts
export async function getGroupMembers(id: string): Promise<User[]> {
  const response = await api.get<ListResponse<User>>(`/groups/${id}/members?limit=100`);
  return response.data;
}
```

- [ ] **Step 4: Update `categories-api.ts` `Category` type**

```ts
import type { CategoryStatus } from "@/common/types/enums";

export type Category = {
  _id: string;
  groupId: string;
  name: string;
  status: CategoryStatus;
  createdAt: string;
  updatedAt?: string;
};
```

- [ ] **Step 5: Update `expenses-api.ts` types**

```ts
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
```

(Leave `Expense` as-is — it already declares `participants: ExpenseParticipant[]`.)

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: the api files compile (RxDB-related errors elsewhere still expected).

- [ ] **Step 7: Commit**

```bash
git add src/common/types/enums.ts src/features/groups/api/groups-api.ts src/features/categories/api/categories-api.ts src/features/expenses/api/expenses-api.ts src/features/users/api/users-api.ts
git commit -m "feat(types): strict union types aligned to API; members are Users"
```

---

### Task 3: Groups read hooks (TanStack)

**Files:**
- Modify: `src/features/groups/hooks/use-groups.ts`
- Modify: `src/features/groups/hooks/use-group.ts`
- Modify: `src/features/groups/hooks/use-group-members.ts`

**Interfaces:**
- Consumes: `listGroups`, `getGroup`, `getGroupMembers` from `../api/groups-api`; `queryKeys` from `@/common/lib/query-keys`.
- Produces: `useGroups() → { groups: Group[]; isLoading }`, `useGroup(id) → { group: Group | null; isLoading }`, `useGroupMembers(groupId) → { members: User[]; isLoading }`.

- [ ] **Step 1: Rewrite `use-groups.ts`**

```ts
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
```

- [ ] **Step 2: Rewrite `use-group.ts`**

```ts
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
```

- [ ] **Step 3: Rewrite `use-group-members.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { getGroupMembers } from "../api/groups-api";
import { queryKeys } from "@/common/lib/query-keys";

/** Members of a group, as full User documents. */
export function useGroupMembers(groupId: string | undefined) {
  const query = useQuery({
    queryKey: groupId ? queryKeys.groups.members(groupId) : ["groups", "members", "none"],
    queryFn: () => getGroupMembers(groupId as string),
    enabled: !!groupId,
  });
  return { members: query.data ?? [], isLoading: query.isLoading };
}
```

- [ ] **Step 4: Typecheck the three files**

Run: `pnpm exec tsc --noEmit`
Expected: these three files compile. (Screens using `member.userId` will now error — fixed in Task 11.)

- [ ] **Step 5: Commit**

```bash
git add src/features/groups/hooks/use-groups.ts src/features/groups/hooks/use-group.ts src/features/groups/hooks/use-group-members.ts
git commit -m "feat(groups): TanStack read hooks"
```

---

### Task 4: Categories read hook

**Files:**
- Modify: `src/features/categories/hooks/use-categories.ts`

**Interfaces:**
- Produces: `useCategories(groupId) → { categories: Category[]; isLoading }`.

- [ ] **Step 1: Rewrite `use-categories.ts`**

```ts
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
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm exec tsc --noEmit
git add src/features/categories/hooks/use-categories.ts
git commit -m "feat(categories): TanStack read hook"
```

---

### Task 5: Expenses read hooks + debt summaries (TanStack)

**Files:**
- Modify: `src/features/expenses/hooks/use-expenses.ts`
- Modify: `src/features/expenses/hooks/use-expense.ts`
- Modify: `src/features/expenses/hooks/use-all-expenses.ts`
- Modify: `src/features/expenses/hooks/use-debt-summaries.ts`
- Delete: `src/features/expenses/hooks/use-expense-participants.ts`

**Interfaces:**
- Produces: `useExpenses(groupId) → { expenses: Expense[]; isLoading }`; `useExpense(groupId, expenseId) → { expense: Expense | null; isLoading }` (**signature now takes groupId**); `useAllExpenses() → { expenses: Expense[]; isLoading }`; `useDebtSummaries() → { iOwe, owedToMe, totalIOwe, totalOwedToMe, net, isLoading }`. Participants are read from `expense.participants`.

- [ ] **Step 1: Rewrite `use-expenses.ts`**

```ts
import { useQuery } from "@tanstack/react-query";
import { listExpenses } from "../api/expenses-api";
import { queryKeys } from "@/common/lib/query-keys";

export function useExpenses(groupId: string | undefined) {
  const query = useQuery({
    queryKey: groupId
      ? queryKeys.groups.expenses(groupId)
      : ["groups", "expenses", "none"],
    queryFn: () => listExpenses(groupId as string),
    enabled: !!groupId,
  });
  return { expenses: query.data ?? [], isLoading: query.isLoading };
}
```

- [ ] **Step 2: Rewrite `use-expense.ts` (now takes groupId)**

```ts
import { useQuery } from "@tanstack/react-query";
import { getExpense } from "../api/expenses-api";
import { queryKeys } from "@/common/lib/query-keys";

export function useExpense(
  groupId: string | undefined,
  expenseId: string | undefined,
) {
  const query = useQuery({
    queryKey:
      groupId && expenseId
        ? queryKeys.groups.expense(groupId, expenseId)
        : ["groups", "expense", "none"],
    queryFn: () => getExpense(groupId as string, expenseId as string),
    enabled: !!groupId && !!expenseId,
  });
  return { expense: query.data ?? null, isLoading: query.isLoading };
}
```

- [ ] **Step 3: Rewrite `use-all-expenses.ts` (fan-out across groups)**

```ts
import { useQuery, useQueries } from "@tanstack/react-query";
import { listGroups } from "@/features/groups/api/groups-api";
import { listExpenses } from "../api/expenses-api";
import { queryKeys } from "@/common/lib/query-keys";

/** Every expense across all of the user's groups (newest first), for search. */
export function useAllExpenses() {
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups.all(),
    queryFn: listGroups,
  });
  const groups = groupsQuery.data ?? [];

  const expenseQueries = useQueries({
    queries: groups.map((g) => ({
      queryKey: queryKeys.groups.expenses(g._id),
      queryFn: () => listExpenses(g._id),
    })),
  });

  const expenses = expenseQueries.flatMap((q) => q.data ?? []);
  const isLoading =
    groupsQuery.isLoading || expenseQueries.some((q) => q.isLoading);

  return { expenses, isLoading };
}
```

- [ ] **Step 4: Rewrite `use-debt-summaries.ts`**

```ts
import { useMemo } from "react";
import { useQuery, useQueries } from "@tanstack/react-query";
import { useAuthUser } from "@/features/auth/auth-store";
import { listGroups } from "@/features/groups/api/groups-api";
import { listExpenses } from "../api/expenses-api";
import { queryKeys } from "@/common/lib/query-keys";

export type DebtItem = {
  expenseId: string;
  groupId: string;
  description: string;
  amount: number;
  otherUserId: string;
  status: string;
};

/** Outstanding statuses count toward balances; CONFIRMED/REJECTED do not. */
const OUTSTANDING = new Set(["PENDING", "PAID"]);

export function useDebtSummaries() {
  const authUser = useAuthUser();

  const groupsQuery = useQuery({
    queryKey: queryKeys.groups.all(),
    queryFn: listGroups,
  });
  const groups = groupsQuery.data ?? [];

  const expenseQueries = useQueries({
    queries: groups.map((g) => ({
      queryKey: queryKeys.groups.expenses(g._id),
      queryFn: () => listExpenses(g._id),
    })),
  });

  const expenses = expenseQueries.flatMap((q) => q.data ?? []);
  const isLoading =
    groupsQuery.isLoading || expenseQueries.some((q) => q.isLoading);

  return useMemo(() => {
    const me = authUser?._id;
    const iOwe: DebtItem[] = [];
    const owedToMe: DebtItem[] = [];

    if (me) {
      for (const expense of expenses) {
        for (const p of expense.participants ?? []) {
          if (!OUTSTANDING.has(p.status)) continue;
          if (p.userId === me && expense.createdByUserId !== me) {
            iOwe.push({
              expenseId: expense._id,
              groupId: expense.groupId,
              description: expense.description,
              amount: p.amountOwed,
              otherUserId: expense.createdByUserId,
              status: p.status,
            });
          } else if (p.userId !== me && expense.createdByUserId === me) {
            owedToMe.push({
              expenseId: expense._id,
              groupId: expense.groupId,
              description: expense.description,
              amount: p.amountOwed,
              otherUserId: p.userId,
              status: p.status,
            });
          }
        }
      }
    }

    const totalIOwe = iOwe.reduce((s, d) => s + d.amount, 0);
    const totalOwedToMe = owedToMe.reduce((s, d) => s + d.amount, 0);
    return {
      iOwe,
      owedToMe,
      totalIOwe,
      totalOwedToMe,
      net: totalOwedToMe - totalIOwe,
      isLoading,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, JSON.stringify(expenses), isLoading]);
}
```

- [ ] **Step 5: Delete the participants hook**

```bash
git rm src/features/expenses/hooks/use-expense-participants.ts
```

- [ ] **Step 6: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: these hook files compile. Errors remain in screens that call `useExpense(expenseId)` (one arg) and `useExpenseParticipants` — fixed in Tasks 10–11.

- [ ] **Step 7: Commit**

```bash
git add src/features/expenses/hooks/
git commit -m "feat(expenses): TanStack read hooks + debt summaries from embedded participants"
```

---

### Task 6: Groups mutations (invalidate-and-refetch)

**Files:**
- Modify: `src/features/groups/hooks/use-groups-mutations.ts`

**Interfaces:**
- Consumes: `createGroup`, `updateGroup`, `joinGroup` from `../api/groups-api`; `uploadLocalGroupImageUrl` from `@/common/api/media-upload`.
- Produces: `useGroupsMutations() → { createGroup(input) => Promise<string>, updateGroup(groupId, input) => Promise<void>, joinGroup(inviteCode) => Promise<void> }` (signatures unchanged).

- [ ] **Step 1: Rewrite the file**

```ts
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createGroup as apiCreateGroup,
  updateGroup as apiUpdateGroup,
  joinGroup as apiJoinGroup,
  type CreateGroupInput,
  type UpdateGroupInput,
} from "../api/groups-api";
import { uploadLocalGroupImageUrl } from "@/common/api/media-upload";
import { queryKeys } from "@/common/lib/query-keys";

type CreateGroupHookInput = {
  name: string;
  description?: string;
  allCreateExpenses?: boolean;
  imageUrl?: string;
};

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

  return { createGroup, updateGroup, joinGroup };
}
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm exec tsc --noEmit
git add src/features/groups/hooks/use-groups-mutations.ts
git commit -m "feat(groups): TanStack mutations (invalidate-and-refetch)"
```

---

### Task 7: Expenses mutations — hybrid (invalidate + optimistic payments)

**Files:**
- Modify: `src/features/expenses/hooks/use-expenses-mutations.ts`

**Interfaces:**
- Consumes: `createExpense`, `declarePayment`, `confirmPayment`, `rejectPayment` from `../api/expenses-api`; `uploadLocalReceiptImageUrl`; `queryKeys`.
- Produces: `useExpensesMutations() → { createExpense(input) => Promise<string>, declarePayment(args) => Promise<void>, confirmPayment(args) => Promise<void>, rejectPayment(args) => Promise<void> }` where `args = { groupId: string; expenseId: string; participantId: string }` (**payment signatures changed** to carry group/expense for optimistic cache writes). `createExpense` input shape is unchanged.

- [ ] **Step 1: Rewrite the file**

```ts
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthUser } from "@/features/auth/auth-store";
import {
  createExpense as apiCreateExpense,
  declarePayment as apiDeclarePayment,
  confirmPayment as apiConfirmPayment,
  rejectPayment as apiRejectPayment,
  type Expense,
} from "../api/expenses-api";
import type { ExpenseParticipantStatus } from "@/common/types/enums";
import { uploadLocalReceiptImageUrl } from "@/common/api/media-upload";
import { queryKeys } from "@/common/lib/query-keys";

type CreateExpenseInput = {
  groupId: string;
  categoryId: string;
  description: string;
  totalAmount: number;
  participantUserIds: string[];
  participantAmounts?: Record<string, number>;
  date?: string;
  receiptImageUrl?: string;
};

type PaymentArgs = {
  groupId: string;
  expenseId: string;
  participantId: string;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function evenSplit(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = round2(total / count);
  const shares = Array.from({ length: count }, () => base);
  const drift = round2(total - base * count);
  shares[0] = round2(shares[0] + drift);
  return shares;
}

export function useExpensesMutations() {
  const qc = useQueryClient();
  const authUser = useAuthUser();

  const createMutation = useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      const shares = input.participantAmounts
        ? input.participantUserIds.map((uid) =>
            round2(input.participantAmounts![uid] ?? 0),
          )
        : evenSplit(input.totalAmount, input.participantUserIds.length);

      const sharesSum = round2(shares.reduce((acc, s) => acc + s, 0));
      if (Math.abs(sharesSum - round2(input.totalAmount)) > 0.01) {
        throw new Error("A soma das partes não confere com o total");
      }

      const receiptImageUrl = input.receiptImageUrl
        ? await uploadLocalReceiptImageUrl(input.receiptImageUrl)
        : undefined;

      return apiCreateExpense(input.groupId, {
        categoryId: input.categoryId,
        description: input.description,
        totalAmount: input.totalAmount,
        date: input.date ?? new Date().toISOString(),
        ...(receiptImageUrl ? { receiptImageUrl } : {}),
        participants: input.participantUserIds.map((userId, i) => ({
          userId,
          amountOwed: shares[i],
        })),
      });
    },
    onSuccess: (_expense, input) => {
      qc.invalidateQueries({
        queryKey: queryKeys.groups.expenses(input.groupId),
      });
    },
  });

  const createExpense = useCallback(
    async (input: CreateExpenseInput): Promise<string> => {
      if (!authUser) throw new Error("Not authenticated");
      if (input.participantUserIds.length === 0) {
        throw new Error("Selecione ao menos um participante");
      }
      const expense = await createMutation.mutateAsync(input);
      return expense._id;
    },
    [createMutation, authUser],
  );

  // Optimistic payment-status mutation factory.
  const usePaymentAction = (
    apiCall: (groupId: string, participantId: string) => Promise<void>,
    nextStatus: ExpenseParticipantStatus,
  ) =>
    useMutation({
      mutationFn: ({ groupId, participantId }: PaymentArgs) =>
        apiCall(groupId, participantId),
      onMutate: async ({ groupId, expenseId, participantId }: PaymentArgs) => {
        const key = queryKeys.groups.expense(groupId, expenseId);
        await qc.cancelQueries({ queryKey: key });
        const prev = qc.getQueryData<Expense>(key);
        if (prev) {
          qc.setQueryData<Expense>(key, {
            ...prev,
            participants: prev.participants.map((p) =>
              p._id === participantId ? { ...p, status: nextStatus } : p,
            ),
          });
        }
        return { prev, key };
      },
      onError: (_err, _vars, ctx) => {
        if (ctx?.prev) qc.setQueryData(ctx.key, ctx.prev);
      },
      onSettled: (_data, _err, vars) => {
        qc.invalidateQueries({
          queryKey: queryKeys.groups.expense(vars.groupId, vars.expenseId),
        });
        qc.invalidateQueries({
          queryKey: queryKeys.groups.expenses(vars.groupId),
        });
      },
    });

  const declareMutation = usePaymentAction(apiDeclarePayment, "PAID");
  const confirmMutation = usePaymentAction(apiConfirmPayment, "CONFIRMED");
  const rejectMutation = usePaymentAction(apiRejectPayment, "REJECTED");

  const declarePayment = useCallback(
    (args: PaymentArgs) => declareMutation.mutateAsync(args).then(() => undefined),
    [declareMutation],
  );
  const confirmPayment = useCallback(
    (args: PaymentArgs) => confirmMutation.mutateAsync(args).then(() => undefined),
    [confirmMutation],
  );
  const rejectPayment = useCallback(
    (args: PaymentArgs) => rejectMutation.mutateAsync(args).then(() => undefined),
    [rejectMutation],
  );

  return { createExpense, declarePayment, confirmPayment, rejectPayment };
}
```

> Note: `usePaymentAction` is a closure that calls `useMutation` three times unconditionally in a fixed order — this respects the Rules of Hooks (no conditional/looped hook calls).

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm exec tsc --noEmit
git add src/features/expenses/hooks/use-expenses-mutations.ts
git commit -m "feat(expenses): hybrid mutations — invalidate create, optimistic payments"
```

---

### Task 8: Categories mutation

**Files:**
- Modify: `src/features/categories/hooks/use-categories-mutations.ts`

**Interfaces:**
- Produces: `useCategoriesMutations() → { createCategory(groupId, name) => Promise<Category> }` (signature unchanged).

- [ ] **Step 1: Rewrite the file**

```ts
import { useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCategory as apiCreateCategory, type Category } from "../api/categories-api";
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
```

- [ ] **Step 2: Typecheck + commit**

```bash
pnpm exec tsc --noEmit
git add src/features/categories/hooks/use-categories-mutations.ts
git commit -m "feat(categories): TanStack mutation"
```

---

### Task 9: Rewire the expense detail screen

**Files:**
- Modify: `src/app/(app)/group/[id]/expense/[expenseId].tsx`

**Interfaces:**
- Consumes: `useExpense(groupId, expenseId)`, `useGroupMembers(groupId)`, the payment mutations with `{ groupId, expenseId, participantId }`. Participants come from `expense.participants`.

- [ ] **Step 1: Apply the edits**

Change the imports block — remove the participants hook, the users hook, and the RxDB type; add the API participant type:

Remove these lines:
```tsx
import { useExpenseParticipants } from "@/features/expenses/hooks/use-expense-participants";
import { useUsers } from "@/features/users/hooks/use-users";
import type { ExpenseParticipantDoc } from "@/db/schemas/expense-participant.schema";
```
Add:
```tsx
import { useGroupMembers } from "@/features/groups/hooks/use-group-members";
import type { ExpenseParticipant } from "@/features/expenses/api/expenses-api";
```

Replace the data-hook block (the `useExpense` / `useExpenseParticipants` / `useUsers` / mutations lines) with:
```tsx
  const { expense, isLoading } = useExpense(groupId, expenseId);
  const participants = expense?.participants ?? [];
  const { members } = useGroupMembers(groupId);
  const { categories } = useCategories(groupId);
  const { declarePayment, confirmPayment, rejectPayment } =
    useExpensesMutations();
```

Replace the `userName` memo (built from `users`) with one built from `members` (members are Users, keyed by `_id`):
```tsx
  const userName = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of members) m.set(u._id, u.fullName);
    return m;
  }, [members]);
```

Update the three payment calls to pass the new args object:
```tsx
                  onDeclare={() =>
                    run(p._id, () =>
                      declarePayment({ groupId, expenseId, participantId: p._id }),
                    )
                  }
                  onConfirm={() =>
                    run(p._id, () =>
                      confirmPayment({ groupId, expenseId, participantId: p._id }),
                    )
                  }
                  onReject={() =>
                    run(p._id, () =>
                      rejectPayment({ groupId, expenseId, participantId: p._id }),
                    )
                  }
```

Update the `ParticipantActions` prop type:
```tsx
  participant: ExpenseParticipant;
```

- [ ] **Step 2: Typecheck this file**

Run: `pnpm exec tsc --noEmit`
Expected: `[expenseId].tsx` compiles (other screens may still error — next task).

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/group/[id]/expense/[expenseId].tsx"
git commit -m "feat(expenses): rewire expense detail to TanStack + embedded participants"
```

---

### Task 10: Rewire remaining screens (driven by the type checker)

**Files (modify as the checker flags them):**
- `src/app/(app)/group/[id]/index.tsx`
- `src/app/(app)/group/[id]/new-expense.tsx`
- `src/app/(app)/(tabs)/index.tsx`
- `src/app/(app)/(modals)/create-group-modal.tsx`
- `src/app/(app)/(modals)/join-group-modal.tsx`
- any other file `tsc` reports importing from `@/db`, `@/sync`, `@/hooks/use-is-online`, `@/components/ui/offline-banner`, `use-expense-participants`, `useUsers`, or `useExpense(oneArg)`.

**Interfaces:**
- Consumes: the rewritten hooks. The fixes are mechanical and enumerated below.

- [ ] **Step 1: List the remaining breakages**

Run: `pnpm exec tsc --noEmit`
Record every error. Apply the fixes below by category.

- [ ] **Step 2: Members are now `User[]` (group detail + new-expense)**

Anywhere a member object was used as `{ _id, userId }` with a separate name lookup, treat the member itself as the user:
- React `key`: `member._id` (unchanged).
- The selectable/participant user id: was `member.userId` → now **`member._id`**.
- The display name: was looked up via `useUsers()` → now **`member.fullName`** directly.

Remove `useUsers()` calls in these screens; build any `userId → name` map from `useGroupMembers(groupId)` (`members`), exactly as in Task 9 Step 1.

- [ ] **Step 3: `useExpense` now takes `(groupId, expenseId)`**

Update any remaining `useExpense(expenseId)` call to `useExpense(groupId, expenseId)` (the screen already has `groupId` from `useLocalSearchParams`).

- [ ] **Step 4: Home screen balances (`(tabs)/index.tsx`)**

`useDebtSummaries()` keeps the same return shape, so the balances UI is unchanged. If the screen also imported `useExpenseParticipants`, remove that import and any usage (the debt hook already aggregates participants). For names in the debt list, derive them from the relevant group's members or show the existing fallback label.

- [ ] **Step 5: Remove offline-banner usages**

Delete any `import { OfflineBanner } ...` and its JSX usage from every screen the checker flags (the component is deleted in Task 11). No replacement — per-query `isLoading`/`isError` already covers state.

- [ ] **Step 6: Re-run the type checker until clean**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors. Iterate Steps 2–5 until clean.

- [ ] **Step 7: Commit**

```bash
git add src/app
git commit -m "feat: rewire remaining screens to TanStack hooks; drop offline banner"
```

---

### Task 11: Delete the RxDB / SQLite / sync / offline stack

**Files (delete):**
- `src/db/` (entire directory)
- `src/sync/` (entire directory)
- `src/hooks/use-is-online.ts`
- `src/components/ui/offline-banner.tsx`
- `src/features/users/hooks/use-users.ts`, `src/features/users/hooks/use-user.ts`
- `src/app/debug-database.tsx`

**Files (modify):**
- `src/features/categories/constants.ts` (remove `DEFAULT_CATEGORIES`; keep `categoryColor`)
- `package.json` (remove `rxdb`, `expo-sqlite`; remove `@react-native-community/netinfo` only if unused)

- [ ] **Step 1: Confirm nothing still imports the doomed modules**

Run:
```bash
grep -rn "@/db\|@/sync\|use-is-online\|offline-banner\|use-expense-participants\|features/users/hooks" src || echo "NO REMAINING IMPORTS"
```
Expected: `NO REMAINING IMPORTS`. If anything prints, fix that consumer first (return to Task 10).

- [ ] **Step 2: Delete the directories and files**

```bash
git rm -r src/db src/sync
git rm src/hooks/use-is-online.ts src/components/ui/offline-banner.tsx
git rm src/features/users/hooks/use-users.ts src/features/users/hooks/use-user.ts
git rm "src/app/debug-database.tsx"
```

- [ ] **Step 3: Remove `DEFAULT_CATEGORIES` from `src/features/categories/constants.ts`**

Delete the `DEFAULT_CATEGORIES` export (lines 1–12) but keep `categoryColor`. The file should start at the `categoryColor` function.

- [ ] **Step 4: Check `netinfo` usage, then drop dead deps**

```bash
grep -rn "netinfo\|NetInfo" src || echo "NETINFO UNUSED"
pnpm remove rxdb expo-sqlite
# only if the grep above printed NETINFO UNUSED:
pnpm remove @react-native-community/netinfo
```

- [ ] **Step 5: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: zero errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove RxDB/SQLite/sync/offline stack and dead deps"
```

---

### Task 12: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: clean.

- [ ] **Step 2: Lint**

Run: `pnpm lint`
Expected: clean (fix any unused-import warnings introduced by the migration).

- [ ] **Step 3: Bundle (the same check used to confirm the earlier fix)**

Run: `npx expo export --platform ios --output-dir /private/tmp/claude-501/-Volumes-viniciusssd-epicora-addsum/90e574c0-2449-42d0-8d62-2aad600d79c4/scratchpad/expo-export-verify`
Expected: `Bundled … (N modules)` and `Exported:` with **no** "Unable to resolve" errors.

- [ ] **Step 4: Manual smoke (device/simulator, against the deployed API)**

Verify, in order:
1. Sign in → group list loads.
2. Create a group → it appears, opens with the **5 default categories**, and **you are listed as a member**.
3. Create an expense splitting between members → it appears; opening it shows participants with correct split; your own row is **CONFIRMED**.
4. As a non-creator on another device/account, declare payment → status flips **instantly** (optimistic), persists after refetch.
5. As creator, confirm/reject a PAID row → instant update.
6. Home screen balances (`iOwe` / `owedToMe` / net) reflect the new expense.
7. Pull to refresh / re-open a screen → data refetches.
8. Log out → cache cleared; logging back in reloads fresh.

- [ ] **Step 5: Commit any smoke fixes, then finish the branch**

Use the `superpowers:finishing-a-development-branch` skill to decide merge/PR.

---

## Self-Review

- **Spec coverage:** M1 deps/provider → Task 1; M3 types → Task 2; M4 query keys → already complete (reused, no task needed); M5 hooks → Tasks 3–8; M6 name-resolution-via-members → Tasks 3 (members hook) + 9–10 (screen edits) + 11 (delete users hooks); M7 split logic → Task 7; M8 deletions → Task 11; M9 error/loading UX → per-query states (Tasks 3–5) + offline-banner removal (Tasks 10–11). Hybrid mutation decision → Tasks 6–8. All spec sections covered.
- **Placeholder scan:** Task 10 is intentionally checker-driven (the breakages are enumerated by category with exact fixes, with `tsc` as the completeness gate) — this is the realistic approach for screen edits across a no-test-runner RN app, not a vague placeholder.
- **Type consistency:** `useExpense(groupId, expenseId)` used consistently in Tasks 5, 9, 10; payment mutation `PaymentArgs = { groupId, expenseId, participantId }` consistent in Tasks 7 and 9; `GroupMember = User` and `member._id` (not `member.userId`) consistent in Tasks 2, 9, 10; query-key factory calls match `src/common/lib/query-keys.ts`.

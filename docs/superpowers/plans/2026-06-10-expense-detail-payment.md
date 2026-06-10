# Expense Detail Modal with Payment Actions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tapping an expense card opens a full-screen modal showing the expense details and per-participant split, with role-aware actions to declare, confirm, and reject payment.

**Architecture:** A new `useExpense(id)` reactive query feeds a new modal screen at `group/[id]/expense/[expenseId].tsx`. Three new mutations on `useExpensesMutations` patch a participant's `status`/`paidAt`/`confirmedAt` using the existing offline-first outbox pattern (`doc.patch → enqueue update → sync if online`). The screen derives roles from `expense.createdByUserId` and `authUser._id` and gates action buttons by `(viewer role, row owner, status)`.

**Tech Stack:** React Native, Expo Router, RxDB (local reactive DB), TypeScript, NativeWind (Tailwind classes), lucide-react-native icons.

**Note on verification:** This project has **no test framework** (no jest, no test files). Per existing conventions, each task is verified with TypeScript typecheck (`npx tsc --noEmit`) and lint (`npm run lint`), plus a manual run-through at the end. Do NOT introduce a test harness — it is out of scope.

**Note on commits:** This workspace is **not a git repository**. Skip the `git commit` steps unless the worker initializes a repo. Treat each "Commit" step as a logical checkpoint where typecheck + lint must pass.

---

## File Structure

- **Create** `src/features/expenses/hooks/use-expense.ts` — single-expense reactive query hook.
- **Modify** `src/features/expenses/hooks/use-expenses-mutations.ts` — add `declarePayment`, `confirmPayment`, `rejectPayment`.
- **Create** `src/app/(app)/group/[id]/expense/[expenseId].tsx` — the detail modal screen.
- **Modify** `src/app/(app)/_layout.tsx` — register the modal route.
- **Modify** `src/app/(app)/group/[id]/index.tsx` — make expense cards pressable.

---

## Task 1: Add `useExpense(id)` reactive query hook

**Files:**
- Create: `src/features/expenses/hooks/use-expense.ts`

- [ ] **Step 1: Create the hook**

Mirror the existing `useExpenses` hook (`src/features/expenses/hooks/use-expenses.ts`) but query a single doc by `_id`.

```typescript
import { useEffect, useState } from "react";
import { useDatabase } from "@/db/use-db";
import type { ExpenseDoc } from "@/db/schemas/expense.schema";

/** Reactive single non-deleted expense by _id. */
export function useExpense(expenseId: string | undefined) {
  const { db, isReady } = useDatabase();
  const [expense, setExpense] = useState<ExpenseDoc | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!db || !isReady || !expenseId) {
      setIsLoading(false);
      return;
    }

    const subscription = (db.expenses as any)
      .findOne({
        selector: { _id: expenseId, deletedAt: { $exists: false } },
      })
      .$.subscribe((doc: any) => {
        setExpense(doc ? (doc.toJSON() as ExpenseDoc) : null);
        setIsLoading(false);
      });

    return () => subscription.unsubscribe();
  }, [db, isReady, expenseId]);

  return { expense, isLoading };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no new errors referencing `use-expense.ts`).

- [ ] **Step 3: Commit (checkpoint)**

Logical checkpoint: `use-expense.ts` compiles. (No git in this workspace.)

---

## Task 2: Add payment mutations to `useExpensesMutations`

**Files:**
- Modify: `src/features/expenses/hooks/use-expenses-mutations.ts`

These follow the offline-first pattern used by `updateGroup` in `src/features/groups/hooks/use-groups-mutations.ts:140-168`: find the local doc, `doc.patch(...)`, `enqueue` an `update` op, then sync if online. The participant sanitizer (`src/features/expenses/db/expense-participants.sanitizer.ts`) already forwards `status`, `paidAt`, and `confirmedAt`.

- [ ] **Step 1: Add a `syncOnlineIfPossible` helper at module scope**

Add this helper near the top of the file (after the imports, before `useExpensesMutations`). It mirrors the one in `use-groups-mutations.ts:39-48`.

```typescript
async function syncOnlineIfPossible(fn: () => Promise<unknown>) {
  const net = await NetInfo.fetch();
  if (net.isConnected && net.isInternetReachable !== false) {
    try {
      await fn();
    } catch (e) {
      console.error("[sync] expenseParticipants sync after mutation failed", e);
    }
  }
}
```

- [ ] **Step 2: Add a private `patchParticipant` helper inside the hook**

Inside `useExpensesMutations`, after `createExpense` is defined and before the `return`, add a shared helper plus the three public mutations. `patchParticipant` centralizes the find/patch/enqueue/sync flow so the three actions stay DRY.

```typescript
  const patchParticipant = useCallback(
    async (participantId: string, fields: Record<string, unknown>) => {
      if (!db) throw new Error("Database not ready");

      const doc = await (db.expenseParticipants as any)
        .findOne({ selector: { _id: participantId } })
        .exec();
      if (!doc) throw new Error("Participante não encontrado");

      const patch: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
        ...fields,
      };
      await doc.patch(patch);

      await enqueue(db, {
        collectionName: "expenseParticipants",
        docId: participantId,
        operation: "update",
        payload: { _id: participantId, ...patch },
      });

      await syncOnlineIfPossible(async () => {
        await triggerCollectionSync(db, "expenseParticipants");
      });
    },
    [db],
  );

  /** A participant declares they paid their share. PENDING/REJECTED -> PAID. */
  const declarePayment = useCallback(
    (participantId: string) =>
      patchParticipant(participantId, {
        status: "PAID",
        paidAt: new Date().toISOString(),
      }),
    [patchParticipant],
  );

  /** The expense creator confirms receipt. PAID -> CONFIRMED. */
  const confirmPayment = useCallback(
    (participantId: string) =>
      patchParticipant(participantId, {
        status: "CONFIRMED",
        confirmedAt: new Date().toISOString(),
      }),
    [patchParticipant],
  );

  /** The expense creator rejects a declared payment. PAID -> REJECTED. */
  const rejectPayment = useCallback(
    (participantId: string) =>
      patchParticipant(participantId, {
        status: "REJECTED",
        paidAt: null,
      }),
    [patchParticipant],
  );
```

- [ ] **Step 3: Export the new mutations**

Change the final return of the hook from:

```typescript
  return { createExpense };
```

to:

```typescript
  return { createExpense, declarePayment, confirmPayment, rejectPayment };
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. Note: `NetInfo`, `enqueue`, and `triggerCollectionSync` are already imported in this file (lines 1, 6, 7), so no new imports are needed.

- [ ] **Step 5: Commit (checkpoint)**

Logical checkpoint: mutations compile and the hook exports four functions.

---

## Task 3: Build the expense detail modal screen

**Files:**
- Create: `src/app/(app)/group/[id]/expense/[expenseId].tsx`

This screen reads `id` (group) and `expenseId` from route params, loads the expense + participants + users, derives the viewer's role, and renders the header and the participant list with role-gated actions.

- [ ] **Step 1: Create the screen file**

```tsx
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useAuthUser } from "@/features/auth/auth-store";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useExpense } from "@/features/expenses/hooks/use-expense";
import { useExpenseParticipants } from "@/features/expenses/hooks/use-expense-participants";
import { useExpensesMutations } from "@/features/expenses/hooks/use-expenses-mutations";
import { useUsers } from "@/features/users/hooks/use-users";
import { useTheme } from "@/hooks/use-theme";
import { router, useLocalSearchParams } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { ExpenseParticipantDoc } from "@/db/schemas/expense-participant.schema";

function formatBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Aguardando confirmação",
  CONFIRMED: "Confirmado",
  REJECTED: "Rejeitado",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "text-muted-foreground",
  PAID: "text-primary",
  CONFIRMED: "text-green-500",
  REJECTED: "text-destructive",
};

export default function ExpenseDetailScreen() {
  const { id: groupId, expenseId } = useLocalSearchParams<{
    id: string;
    expenseId: string;
  }>();
  const theme = useTheme();
  const authUser = useAuthUser();
  const { expense, isLoading } = useExpense(expenseId);
  const { participants } = useExpenseParticipants(expenseId);
  const { users } = useUsers();
  const { categories } = useCategories(groupId);
  const { declarePayment, confirmPayment, rejectPayment } = useExpensesMutations();

  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userName = useMemo(() => {
    const m = new Map<string, string>();
    for (const u of users) m.set(u._id, u.fullName);
    return m;
  }, [users]);

  const categoryName = useMemo(
    () => categories.find((c) => c._id === expense?.categoryId)?.name ?? "Categoria",
    [categories, expense?.categoryId],
  );

  const isCreator = !!expense && !!authUser && expense.createdByUserId === authUser._id;

  const run = async (id: string, fn: () => Promise<void>) => {
    setError(null);
    setBusyId(id);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? "Não foi possível atualizar o pagamento");
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <View className="flex-row items-center justify-between px-5 py-3">
      <Text className="text-foreground text-xl font-bold">Detalhes da despesa</Text>
      <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
        <X size={24} color={theme.foreground} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView className="bg-background flex-1">
        {header}
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView className="bg-background flex-1">
        {header}
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-muted-foreground text-center">
            Esta despesa não está mais disponível.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1">
      {header}
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
      >
        {/* Summary */}
        <Card className="py-4">
          <View className="px-6">
            <Text className="text-foreground text-2xl font-extrabold">
              {expense.description}
            </Text>
            <Text className="text-muted-foreground mt-1 text-sm">
              {categoryName} · {userName.get(expense.createdByUserId) ?? "Alguém"} ·{" "}
              {formatDate(expense.date)}
            </Text>
            <Text className="text-primary mt-3 text-3xl font-extrabold">
              {formatBRL(expense.totalAmount)}
            </Text>
          </View>
        </Card>

        {/* Participants */}
        <Text className="text-foreground mb-2 mt-6 text-lg font-semibold">
          Divisão
        </Text>

        {participants.map((p) => {
          const isOwnRow = !!authUser && p.userId === authUser._id;
          const busy = busyId === p._id;
          return (
            <Card key={p._id} className="mb-3 py-3">
              <View className="px-6">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <Text className="text-foreground font-medium">
                      {userName.get(p.userId) ?? "Membro"}
                      {isOwnRow ? " (você)" : ""}
                    </Text>
                    <Text className={`text-sm ${STATUS_CLASS[p.status] ?? "text-muted-foreground"}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </Text>
                  </View>
                  <Text className="text-foreground font-semibold">
                    {formatBRL(p.amountOwed)}
                  </Text>
                </View>

                <ParticipantActions
                  participant={p}
                  isOwnRow={isOwnRow}
                  isCreator={isCreator}
                  busy={busy}
                  onDeclare={() => run(p._id, () => declarePayment(p._id))}
                  onConfirm={() => run(p._id, () => confirmPayment(p._id))}
                  onReject={() => run(p._id, () => rejectPayment(p._id))}
                />
              </View>
            </Card>
          );
        })}

        {error ? (
          <Text className="text-destructive mt-2 text-sm">{error}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * Role- and status-gated action row for a single participant.
 * - Own row, PENDING/REJECTED -> "Declarar pagamento".
 * - Creator viewing someone else's PAID row -> "Confirmar" / "Rejeitar".
 * - Otherwise renders nothing (just the status badge above is shown).
 */
function ParticipantActions({
  participant,
  isOwnRow,
  isCreator,
  busy,
  onDeclare,
  onConfirm,
  onReject,
}: {
  participant: ExpenseParticipantDoc;
  isOwnRow: boolean;
  isCreator: boolean;
  busy: boolean;
  onDeclare: () => void;
  onConfirm: () => void;
  onReject: () => void;
}) {
  const status = participant.status;

  if (isOwnRow && !isCreator && (status === "PENDING" || status === "REJECTED")) {
    return (
      <Pressable
        disabled={busy}
        onPress={onDeclare}
        className={`bg-primary mt-3 h-10 flex-row items-center justify-center rounded-md active:opacity-90 ${
          busy ? "opacity-50" : ""
        }`}
      >
        <Text className="text-primary-foreground font-semibold">
          {busy ? "Enviando..." : status === "REJECTED" ? "Declarar novamente" : "Declarar pagamento"}
        </Text>
      </Pressable>
    );
  }

  if (isCreator && !isOwnRow && status === "PAID") {
    return (
      <View className="mt-3 flex-row gap-3">
        <Pressable
          disabled={busy}
          onPress={onConfirm}
          className={`bg-primary h-10 flex-1 flex-row items-center justify-center gap-1 rounded-md active:opacity-90 ${
            busy ? "opacity-50" : ""
          }`}
        >
          <Check size={16} color="#FFFFFF" />
          <Text className="text-primary-foreground font-semibold">Confirmar</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={onReject}
          className={`bg-secondary h-10 flex-1 flex-row items-center justify-center rounded-md active:opacity-80 ${
            busy ? "opacity-50" : ""
          }`}
        >
          <Text className="text-secondary-foreground font-semibold">Rejeitar</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. If `useAuthUser`, `useUsers`, or `useCategories` return shapes differ from `authUser._id` / `{ users }` / `{ categories }`, fix the destructuring to match (they follow the same pattern used in `src/app/(app)/group/[id]/index.tsx:36-41`).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS (no errors in the new file).

- [ ] **Step 4: Commit (checkpoint)**

Logical checkpoint: the screen compiles and lints.

---

## Task 4: Register the modal route

**Files:**
- Modify: `src/app/(app)/_layout.tsx`

- [ ] **Step 1: Add the Stack.Screen entry**

In `src/app/(app)/_layout.tsx`, directly after the existing `group/[id]/new-expense` screen (lines 37-40), add:

```tsx
        <Stack.Screen
          name="group/[id]/expense/[expenseId]"
          options={{ presentation: "modal" }}
        />
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit (checkpoint)**

Logical checkpoint: route registered.

---

## Task 5: Make expense cards open the detail modal

**Files:**
- Modify: `src/app/(app)/group/[id]/index.tsx`

The expense list currently renders each expense as a non-interactive `Card` (lines 171-198). Wrap each card in a `Pressable` that navigates to the new route. `Pressable` is already imported (line 16).

- [ ] **Step 1: Wrap the expense card in a Pressable**

Replace this block (around lines 171-198):

```tsx
            expenses.map((e) => (
              <Card key={e._id} className="mb-3 py-4">
                <View className="flex-row items-center justify-between px-6">
```

with:

```tsx
            expenses.map((e) => (
              <Pressable
                key={e._id}
                onPress={() =>
                  router.push(`/group/${id}/expense/${e._id}` as Href)
                }
                className="active:opacity-80"
              >
                <Card className="mb-3 py-4">
                  <View className="flex-row items-center justify-between px-6">
```

Then update the matching closing tags. The current closing is:

```tsx
                  <Text className="text-foreground font-semibold">
                    {formatBRL(e.totalAmount)}
                  </Text>
                </View>
              </Card>
            ))
```

Change it to:

```tsx
                  <Text className="text-foreground font-semibold">
                    {formatBRL(e.totalAmount)}
                  </Text>
                  </View>
                </Card>
              </Pressable>
            ))
```

(The `key` moves from `Card` to `Pressable`; `Card` keeps its `className="mb-3 py-4"`.)

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. `Href` is already imported (line 13) and `router` (line 13), so no new imports.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit (checkpoint)**

Logical checkpoint: cards are pressable and navigate.

---

## Task 6: Manual verification

**Files:** none (manual run-through).

Since there is no automated test suite, verify behavior by running the app.

- [ ] **Step 1: Full typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: both PASS with no new errors.

- [ ] **Step 2: Run the app and walk the flows**

Run: `npm run ios` (or `npm run android` / `npm start`).

Verify each:
- Tap an expense card on a group screen → the detail modal opens with description, category, creator, date, total, and the participant split list.
- As a **non-creator participant** with a `PENDING` share: a **"Declarar pagamento"** button shows on your own row only; tapping it flips your status to "Aguardando confirmação" (PAID) and the button disappears.
- As the **creator** viewing a participant whose status is `PAID`: **"Confirmar"** and **"Rejeitar"** buttons show on that row. Confirm → status becomes "Confirmado". Reject → status becomes "Rejeitado".
- After a rejection, the affected participant's own row shows **"Declarar novamente"**.
- The creator's own row shows "Confirmado" with no action buttons.
- Close (X) dismisses the modal back to the group screen.

- [ ] **Step 3: Done**

Feature complete and verified.

---

## Self-Review Notes

- **Spec coverage:** routing (Task 4 + Task 5), `useExpense` hook (Task 1), three mutations (Task 2), header + participant list + role gating (Task 3), reject action (Tasks 2-3), error/loading states (Task 3). All spec sections map to a task.
- **Type consistency:** the hook is `useExpense`; mutations are `declarePayment`/`confirmPayment`/`rejectPayment` and are referenced by those exact names in Task 3. The screen route param names `id` and `expenseId` match the path `group/[id]/expense/[expenseId]` and the `router.push` URL in Task 5.
- **Adaptation from spec:** spec mentioned unit tests; the project has no test harness, so verification is typecheck + lint + manual run-through instead (documented at the top). `rejectPayment` sets `paidAt: null` (rather than `undefined`) so the cleared value is actually transmitted in the patch/push payload.

# Expense Detail Modal with Payment Actions — Design

**Date:** 2026-06-10
**Status:** Approved, pending implementation plan

## Goal

Tapping an expense card on the group screen opens a full-screen stack modal showing
the expense details and the per-participant split, with role-aware actions to
**declare**, **confirm**, and **reject** payment.

## Background — current data model

- `ExpenseDoc` (`src/db/schemas/expense.schema.ts`): `_id`, `groupId`,
  `createdByUserId`, `categoryId`, `description`, `totalAmount`, `date`, timestamps.
- `ExpenseParticipantDoc` (`src/db/schemas/expense-participant.schema.ts`): `_id`,
  `expenseId`, `userId`, `amountOwed`, `status`, `paidAt?`, `confirmedAt?`, timestamps.
- `status` ∈ `PENDING | PAID | CONFIRMED | REJECTED`.
- The expense **creator** fronted the money; participants owe them. On creation the
  creator's own participant row is auto-set to `CONFIRMED` (see
  `use-expenses-mutations.ts`).
- No payment mutations exist yet. The push sanitizer
  (`expense-participants.sanitizer.ts`) already forwards `status`, `paidAt`,
  `confirmedAt`, so only client mutations + UI are needed.

## Role / status model

Roles are derived, not stored on the participant:

- **Creator**: `expense.createdByUserId === authUser._id`.
- **Participant (payer)**: `participant.userId === authUser._id` and not the creator.

Payment lifecycle for a non-creator participant:

| Status | Participant (own row) | Creator (others' rows) |
|---|---|---|
| PENDING | **Declarar pagamento** | — (waiting) |
| PAID | (waiting confirmation) | **Confirmar** / **Rejeitar** |
| CONFIRMED | ✓ done | ✓ done |
| REJECTED | **Declarar novamente** | — |

The creator's own row is always `CONFIRMED`; no self-action.

## Components / changes

### 1. Routing

- New route file: `src/app/(app)/group/[id]/expense/[expenseId].tsx`.
- Registered in `src/app/(app)/_layout.tsx` with `presentation: "modal"` (full-screen),
  matching the `group/[id]/new-expense` precedent.
- Expense card in `src/app/(app)/group/[id]/index.tsx` becomes a `Pressable`:
  `router.push(\`/group/${id}/expense/${e._id}\`)`.

### 2. New data hook

- `useExpense(expenseId)` in `src/features/expenses/hooks/` — single-expense reactive
  query mirroring `useExpenses`. Returns `{ expense, isLoading }`.
- Reuse existing `useExpenseParticipants(expenseId)`, `useUsers()`, `useCategories(groupId)`.

### 3. New mutations (`use-expenses-mutations.ts`)

All follow the offline-first outbox pattern used by `updateGroup`
(`findOne local → doc.patch → enqueue update → syncOnlineIfPossible`):

- `declarePayment(participantId)` → `{ status: "PAID", paidAt: now }`
- `confirmPayment(participantId)` → `{ status: "CONFIRMED", confirmedAt: now }`
- `rejectPayment(participantId)` → `{ status: "REJECTED", paidAt: undefined }`

Each enqueues an `update` op on `expenseParticipants`.

### 4. Screen layout

- **Header**: description, category name, total amount (BRL), creator name, date.
  Close (X) button → `router.back()`.
- **Participant list**: each row shows participant name, `amountOwed`, and a status
  badge (Pendente / Pago / Confirmado / Rejeitado).
  - Creator view: sees all rows; action buttons on others' rows per matrix above.
  - Participant view: sees all rows (read-only badges); action button only on own row.

### 5. Error / loading

- Local patch is instant (optimistic). Buttons disable while the mutation runs.
- Failures surface via a brief inline error message.
- While the expense query is loading, show a loading state; if the expense is missing
  (e.g. deleted), show an empty/closed state.

## Out of scope (this version)

- Editing or deleting an expense (no update/delete expense mutations exist yet).
- Partial payments / payment history beyond the single status field.

## Testing

- Unit-test the three mutations: correct patch payload + enqueued op shape.
- Verify role gating: button visibility per (viewer role, row owner, status).

# RxDB → TanStack Query Migration + Offline Removal — Design

**Date:** 2026-06-18
**Repos:** `addsum-mobile` (primary), `addsum-api` (server-side gap fixes)
**Status:** Approved decisions, pending spec review

## Goal

Replace the offline-first RxDB + SQLite + custom sync stack in `addsum-mobile` with a thin, server-authoritative REST layer built on TanStack Query. Remove the offline feature **completely**. Align every mobile type with the API's actual response shapes, and fix the API gaps that the old sync model hid.

## Non-goals

- No change to authentication (Zustand `useAuthStore` + `expo-secure-store` + axios Bearer interceptor stay as-is).
- No new product features. Behavior parity with today, minus offline support.
- No server-side debt/balance endpoint — balances stay computed client-side.
- No removal of the API's `/sync/*` endpoints (other clients may use them); the mobile app simply stops calling them.

## Confirmed decisions

1. **Mutation strategy: Hybrid.** Invalidate-and-refetch for everything, **except** the payment state machine (declare / confirm / reject), which uses optimistic cache updates with rollback for instant feedback.
2. **Network UX: Per-screen error + retry.** No global banner. Each query surfaces its own error state with a retry affordance. `retry: 1` stays in the query client.
3. **Types: Strict unions.** Status/role fields modeled as exact string-literal unions matching the API enums; every field matched to the API entity; add `User.pix`.
4. **API gaps: Fixed server-side** (see "API changes").
5. **Default categories: Server seeds** the 5 defaults atomically on group create.

---

## API changes (`addsum-api`)

All four are additive and backward-compatible with existing sync clients.

### A1 — Embed `participants` in expense responses
`GET /groups/:groupId/expenses` (list) and `GET /groups/:groupId/expenses/:id` (detail) must include a `participants` array on each expense, aggregated from the `ExpenseParticipant` collection (Mongoose `$lookup` / populate in the find handlers).

- **Files:** `src/expenses/handlers/find-all-expense.handler.ts`, `src/expenses/handlers/find-one-expense.handler.ts` (+ serialization).
- **Participant item shape:** `{ _id, expenseId, userId, amountOwed, status, paidAt?, confirmedAt?, createdAt, updatedAt? }` (no nested user; mobile resolves names from group members).
- **Rationale:** There is currently **no REST way to read participants** (only `/sync`). The mobile expense detail screen and debt summary both need them. Embedding in the list response also feeds the group-wide debt computation in one round-trip.

### A2 — Auto-create the creator's GroupMember on group create
`POST /groups` must also insert a `GroupMember { groupId, userId: adminUserId }` for the creator, in the same operation.

- **File:** `src/groups/handlers/create-group.handler.ts`.
- **Rationale:** `GET /groups/:id/members` returns the joined Users of `GroupMember` records. Without this, the creator never appears in their own group's member list and can't be selected as an expense participant. (Group *visibility* already works via the `$or: [{adminUserId}, {membership}]` filter, so this is specifically about membership/participant selection.)
- **Idempotency:** Guard against duplicate membership (unique index already exists on `groupId+userId`).

### A3 — Seed 5 default categories on group create
`POST /groups` creates these categories for the new group: **Alimentação, Transporte, Moradia, Lazer, Outros** (status `ACTIVE`).

- **File:** `src/groups/handlers/create-group.handler.ts` (+ categories repository).
- **Source of truth:** category names move to an API constant; the mobile `DEFAULT_CATEGORIES` constant is deleted.

### A4 — Auto-confirm the creator's expense participant
`POST /groups/:groupId/expenses`: the participant whose `userId === createdByUserId` is created with `status: CONFIRMED` and `confirmedAt: now`; all others default `PENDING`.

- **File:** `src/expenses/handlers/create-expense.handler.ts`.
- **Rationale:** Parity with the old client behavior (the payer has already settled their own share). Does not affect debt math (the creator's own row is excluded from their balance), but keeps the displayed status correct.

### Guard audit result (resolved)
A full audit of every route the mobile calls (22 live endpoints) found that **only `GET /users` is admin-gated** — the entire `/users` controller carries controller-level `@Roles(UserRole.Administrator)` (`src/users/users.controller.ts:32`). Every other endpoint (auth, groups, members, categories, expenses, payments, uploads) is already callable by a normal authenticated user.

**Decision: keep `/users` admin-only; resolve names from group members instead.** `GET /groups/:id/members` already returns full User objects (incl. `avatarUrl`, `pix`; password excluded) to any group member, which covers 100% of the app's name-resolution needs — the app never references a user outside the requester's groups. Opening `/users` would expose all system users to everyone for no functional gain. No guard change is therefore part of this migration. (`/export` endpoints referenced in the mobile are dead code — not called from any screen — and need no change.)

---

## Mobile changes (`addsum-mobile`)

### M1 — Dependencies
- **Add:** `@tanstack/react-query` (^5.x).
- **Remove:** `rxdb`, `expo-sqlite`, `@react-native-community/netinfo` (only if unused after offline removal — verify).
- Reinstall to relink.

### M2 — Provider wiring
In `src/app/_layout.tsx`, replace `<DatabaseProvider>` with `<QueryClientProvider client={queryClient}>` using the existing `src/lib/query-client.ts`. Remove the `AnimatedSplashOverlay` dependency on DB readiness if any.

### M3 — Canonical types (strict unions)
Define shared enums/unions matching the API exactly and use them across all `api/*.ts`:

```ts
export type UserRole = "ADMINISTRATOR" | "USER"; // confirm exact values from API enum
export type UserStatus = "ONBOARDING" | "ACTIVE" | "INACTIVE";
export type GroupStatus = "ACTIVE" | "INACTIVE";
export type CategoryStatus = "ACTIVE" | "INACTIVE";
export type ExpenseParticipantStatus = "PENDING" | "PAID" | "CONFIRMED" | "REJECTED";
```

Entity types (all `_id` are 24-char Mongo ObjectId strings; dates are ISO strings; money is `number`):

- **User:** `{ _id, fullName, email, avatarUrl?, pix?, role: UserRole, status: UserStatus, createdAt, updatedAt? }`
- **Group:** `{ _id, name, description?, imageUrl?, inviteCode, adminUserId, allCreateExpenses: boolean, status: GroupStatus, createdAt, updatedAt? }`
- **GroupMember (members endpoint = User):** members list is typed as `User[]` (the endpoint returns joined Users, password excluded).
- **Category:** `{ _id, groupId, name, status: CategoryStatus, createdAt, updatedAt? }`
- **ExpenseParticipant:** `{ _id, expenseId, userId, amountOwed: number, status: ExpenseParticipantStatus, paidAt?, confirmedAt?, createdAt, updatedAt? }`
- **Expense:** `{ _id, groupId, createdByUserId, categoryId, description, totalAmount: number, date: string, receiptImageUrl?, participants: ExpenseParticipant[], createdAt, updatedAt? }`

### M4 — Query keys
Extend `src/common/lib/query-keys.ts` to cover all reads:
```
groups.all / groups.detail(id) / groups.members(id)
groups.categories(groupId)
groups.expenses(groupId) / groups.expense(groupId, id)
profile
```
Debt summaries derive from `groups.expenses(groupId)` (no separate key).

### M5 — Per-feature hooks (queries + mutations)
Create `*-hooks.ts` next to each existing `*-api.ts`. **Preserve the existing RxDB hook names and return shapes** (`{ groups, isLoading }`, `{ participants, isLoading }`, `{ iOwe, owedToMe, totalIOwe, totalOwedToMe, net, isLoading }`, etc.) so screens need minimal edits.

- **Queries** → `useQuery` wrappers over the existing `api/*.ts` fetch functions:
  `useGroups`, `useGroup`, `useGroupMembers`, `useCategories`, `useExpenses`, `useExpense`, `useExpenseParticipants` (derives from the embedded `expense.participants`), `useUser`/`useUsers` (replaced — see M-name-resolution), `useDebtSummaries` (computed client-side from `useExpenses`).
- **Mutations** (hybrid):
  - Invalidate-and-refetch: `useGroupsMutations` (create/update/join), `useCategoriesMutations` (create), `useExpensesMutations.createExpense` (computes the split client-side, posts `participants: [{userId, amountOwed}]`, invalidates `groups.expenses`).
  - Optimistic w/ rollback: `declarePayment`, `confirmPayment`, `rejectPayment` — patch the target participant's `status` inside the cached expense immediately, roll back `onError`, invalidate the expense detail `onSettled`.

### M6 — Name resolution (no global `/users`)
Resolve `userId → fullName/avatar` from **group members** (`useGroupMembers(groupId)`), not a global `GET /users` (admin-only — see guard audit above). Delete `src/features/users/api/*` and the `useUsers()` global hook; the expense detail screen and pickers switch their name lookups to the group's members. `useAllExpenses` (global search across groups) is re-scoped to merge members across the user's groups, or dropped if its consumers are unused — verify its screen consumers during implementation.

### M7 — Create-expense split logic (client-side)
Keep the existing split logic in the mutation: explicit `participantAmounts` map or `evenSplit(total, n)` with 2-decimal rounding and remainder on the first share; validate sum == total within 0.01. Send `participants: [{ userId, amountOwed }]`; the server assigns statuses (A4).

### M8 — Deletions (offline / rxdb / sync)
Delete outright:
- `src/db/**` (index, use-db, sqlite-persistence, wrapped-validate-ajv-storage, all `schemas/*`).
- Sync layer: outbox, network-monitor, pull/push operations, sync-state, sync endpoint config, `use-sync`, `use-collection-sync`.
- Offline detection: `use-is-online`, `src/components/ui/offline-banner.tsx`.
- Per-feature `db/` dirs (normalizers/sanitizers).
- `useLogout` references to `stopNetworkMonitor` / `getResetDatabase` → replaced with `queryClient.clear()`.

### M9 — Error/loading UX
Each screen renders query `isLoading` / `isError` states with an inline retry (`refetch`). Remove all offline-banner usages. Mutations surface errors via the existing axios error normalization (toast/alert through `parseApiError`).

---

## Type-alignment matrix (mobile ↔ API source of truth)

| Entity | Fixes required |
|--------|----------------|
| User | add `pix?`; `role`/`status` → unions |
| Group | `allCreateExpenses` non-optional `boolean`; `status` → union |
| Members | type as `User[]` (joined users), not raw membership |
| Category | `status` → union |
| Expense | add `participants: ExpenseParticipant[]` (from A1); `date: string`; `totalAmount: number` |
| ExpenseParticipant | `status` → union; confirm `paidAt`/`confirmedAt` optional |

---

## Testing

- **API:** unit/e2e for A1–A4 (participants embedded; creator membership + 5 categories on group create; creator participant CONFIRMED). Use the existing Nest test setup.
- **Mobile:** the codebase has no RN test runner wired for hooks today — verify primarily by typecheck (`tsc`), lint, and a full `expo export --platform ios` (the same check used to confirm the earlier fix), plus manual smoke of: create group → 5 categories appear + creator is a member, create expense → participants + split correct, declare/confirm/reject flow updates instantly, debt summary totals.
- Add lightweight hook tests only if a runner is already configured.

## Implementation order (phasing)

1. **API (A1–A4)** — land + deploy first so the mobile client has real responses to build against.
2. **Mobile scaffolding** — deps, provider, types, query keys.
3. **Read path** — convert query hooks feature-by-feature (groups → categories → expenses/participants → members), keeping return shapes; screens compile unchanged.
4. **Write path** — mutations (invalidate first, then optimistic payment actions).
5. **Deletion** — remove RxDB/sync/offline once no consumer imports `@/db`.
6. **Verify** — typecheck, lint, `expo export`, manual smoke.

## Risks / open items

- Aggregating participants into the expense **list** has a cost at scale; acceptable for this app, revisit if groups get large.
- `@react-native-community/netinfo` removal is conditional on no remaining consumers.
- Optimistic payment updates must roll back cleanly on 4xx (e.g., illegal status transition) — `onError` restores the snapshot.

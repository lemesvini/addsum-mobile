# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Addsum is an expense-splitting mobile app (Expo SDK 55 / React Native 0.83 / React 19) where users form **groups**, log shared **expenses** split across **participants**, and settle **payments**. The npm package is still named `genesis-mobile` — it was scaffolded from Epicora's "Genesis" base template.

> **The README.md is stale.** It documents the Genesis template's local-first architecture (RxDB + SQLite + outbox sync, with `films`/`producers`/`users` modules). This app was migrated off that — see `docs/superpowers/plans/2026-06-18-rxdb-to-tanstack-migration.md`. There is **no `src/db`, no `src/sync`, no RxDB, no offline outbox.** Data is fetched directly from a REST API via TanStack Query. Trust the code, not the README, for anything about data flow. The README's sections on **theme** and **forms** are still accurate.

## Commands

The project uses **pnpm** (`pnpm@10.15.1`).

| Command | Purpose |
| --- | --- |
| `pnpm install` | Deps + postinstall (patches css-interop, runs theme:sync) |
| `pnpm start` | Metro / Expo dev server |
| `pnpm ios` / `pnpm android` | Native dev build |
| `pnpm lint` | ESLint (`eslint-config-expo`) |
| `pnpm theme:sync` | Regenerate `src/constants/theme.ts` from `src/global.css` |

There is **no test runner configured** — no `test` script, no Jest/Vitest setup. Don't assume tests exist.

Backend URL comes from `EXPO_PUBLIC_API_URL` (`.env`, defaults to `http://localhost:3000`); read it via `src/common/config/env.ts`, never `process.env` directly.

## Architecture

**Data layer is server-backed, not local-first.** Every read/write goes to the REST API through TanStack Query. There is no local persistence of domain data beyond React Query's in-memory cache.

```
Screen (src/app) → feature hook (use-*) → feature api (*-api.ts) → api-client → REST API
```

- **`src/common/api/api-client.ts`** — the single Axios instance. Its response interceptor **unwraps `response.data`** (so `api.get<T>()` resolves to `T`, not `AxiosResponse`). On `401` it calls `removeAuthenticatedUser()` (global logout). Pass `{ skipErrorAlert: true }` to suppress the console error log.
- **`*-api.ts`** (per feature) — thin functions returning typed domain objects. The API wraps payloads as `{ message, data }`; these functions return the inner `.data`.
- **`use-*` hooks** (per feature) — wrap `useQuery`/`useMutation`. **All query keys come from `src/common/lib/query-keys.ts`** — never hand-write key arrays. Mutations invalidate via these same keys.
- **`src/lib/query-client.ts`** — shared QueryClient, provided in `src/app/_layout.tsx`.

**Feature structure** (`src/features/<domain>/`): `api/` (REST + types), `hooks/`, and sometimes `components/`. Domains: `auth`, `groups`, `expenses`, `categories`, `users`, `profile`, `onboarding`. Screens in `src/app/` only compose and navigate — domain logic lives in features.

### Auth & routing gate

- JWT is stored in **expo-secure-store** and held in a Zustand store (`src/features/auth/auth-store.ts`). The user identity is **decoded client-side from the JWT payload** (`getAuthUserFromToken` — base64-decodes the middle segment, checks `exp`); there's no `/me`-style call on boot.
- **Boot flow** (`src/app/index.tsx`): hydrate token → if valid, `getPostAuthRoute()` picks `/(app)` or `/(onboarding)`; else `/(auth)/welcome`.
- `src/app/(app)/_layout.tsx` re-guards: no valid user → redirect to sign-in.
- **Onboarding completion is per-user, stored in SecureStore** (`onboarding-completed-<userId>`), not on the server — see `src/features/onboarding/onboarding-store.ts`.

### Route map (Expo Router, file-based, typed routes)

```
/(auth)/welcome | sign-in | register
/(onboarding)
/(app)/(tabs)/index            → home/dashboard (debt summary)
/(app)/(tabs)/groups | search
/(app)/group/[id]              → group detail
/(app)/group/[id]/new-expense  (modal)
/(app)/group/[id]/expense/[expenseId] (modal)
/(app)/(modals)/*              → profile, edit-profile, reset-password,
                                 create/edit/join/share-group
```

Modal routes must be registered with `presentation: "modal"` (or `"formSheet"`) in `src/app/(app)/_layout.tsx`, not just by file placement.

### Expenses domain (the core)

- An `Expense` embeds its `participants[]`, each with an `amountOwed` and a `status` (`ExpenseParticipantStatus` in `src/common/types/enums.ts`).
- **Splitting** happens client-side in `use-expenses-mutations.ts`: `evenSplit()` divides evenly and pushes rounding drift onto the first share so parts sum exactly; explicit per-user amounts are validated to match the total (±0.01).
- **Payment lifecycle** (declare → confirm/reject) uses **optimistic updates** in the same hook — `onMutate` patches the cached `Expense`, `onError` rolls back, `onSettled` invalidates.
- **Balances** (`use-debt-summaries.ts`) are computed entirely on the client by fanning out `listExpenses` over all groups (`useQueries`) and summing `OUTSTANDING` participant shares; there is no server balance endpoint.

## Conventions

- **Path alias**: `@/*` → `src/*`. TypeScript `strict` is on.
- **Forms**: React Hook Form + Zod via `useZodForm` (`src/components/ui/form/use-zod-form.ts`); reusable fields exported from `@/components/ui/form`. Schemas live in `features/<domain>/api/*-schemas.ts`. (README's "Formulários" section is accurate.)
- **Theme is dark-only and forced**: `nwColorScheme.set("dark")` in the root layout, `useTheme()` always returns the dark palette — there is no light mode despite `.dark:root` existing in CSS. Colors for `className` come from `src/global.css`; colors for JS props (icons, charts) come from `src/constants/theme.ts`, which is **generated** by `pnpm theme:sync` — never edit `theme.ts` by hand.
- **UI**: NativeWind v4 + Tailwind 3, shadcn-style primitives in `src/components/ui/`, Lucide icons, gifted-charts for charts.
- **User-facing strings are Portuguese (pt-BR).** Match existing copy.
- **Commits**: Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`, …).

## Planning docs

`docs/superpowers/{plans,specs}/` hold dated design/plan markdown for features (e.g. expense-detail payment flow, the RxDB→TanStack migration). Check here for intent before reworking a major feature.

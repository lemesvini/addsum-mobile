# New Expense — Step Form Refactor

**Date:** 2026-06-10
**Screen:** `src/app/(app)/group/[id]/new-expense.tsx`

## Goal

Refactor the single scrolling "Nova despesa" form into a 4-step wizard with an
animated progress indicator and direction-aware slide transitions between steps.

## Steps

| # | Title                  | Fields                                                        |
|---|------------------------|--------------------------------------------------------------|
| 1 | Descrição + Categoria  | `description` (text), `categoryId` (single-select chips)     |
| 2 | Valor                  | `amount` (decimal text)                                       |
| 3 | Participantes          | `participantUserIds` (multi-select list)                     |
| 4 | Revisão                | read-only summary of all inputs + Total / Por pessoa; submit |

Step 4 has no inputs — it renders the entered description, category name, amount,
and the selected participants, plus the Total / Por pessoa split, for final
confirmation. Its primary button is `Criar despesa`.

## Validation — block until valid using zod

A single zod schema covers all fields, driven by the existing
`useZodForm` (react-hook-form + zod) infra:

```
description:        z.string().min(1, "Informe uma descrição")
categoryId:         z.string().min(1, "Selecione uma categoria")
amount:             z.string().refine(parseFloat(replace ',' '.') > 0, "Informe um valor válido")
participantUserIds: z.array(z.string()).min(1, "Selecione participantes")
```

- Form `mode: "onTouched"` (or `onChange`) so errors surface as the user edits.
- `Próximo` calls `form.trigger(currentStepFields)` and advances only if it
  resolves valid. Otherwise inline `FormError` messages render under the
  offending fields. The fields validated per step match the table above; step 4
  (Revisão) has no fields, so its button submits directly.
- Final step's primary button (`Criar despesa`) calls `form.handleSubmit`, which
  runs `createExpense({ groupId, categoryId, description, totalAmount, participantUserIds })`
  and `router.back()` on success. Submit/mutation errors render in a shared
  `FormError` slot above the footer.

## Progress indicator — `StepProgressRing`

New reusable component at `src/components/step-progress-ring.tsx`.

- Small circular SVG ring, size ~40px (`h-10 w-10`, matching `close-button.tsx`).
- Track circle stroke in `border` color (`#2D3443`); progress arc stroke in
  `primary` (`#29BC86`); strokeWidth ~3–4; rounded line caps.
- No text inside ("ring fills only").
- Fills proportionally to `(step + 1) / totalSteps` → 25% → 50% → 75% → 100%.
- Animated with reanimated: `useAnimatedProps` driving `strokeDashoffset`
  (`withTiming`) so the arc grows/shrinks smoothly when the step changes.
- Props: `{ step: number; total: number; size?: number; strokeWidth?: number }`.

## Layout

- **Header:** `StepProgressRing` on the left · step title · `X` close button
  (reuse `close-button.tsx`'s pattern) on the right.
- **Body:** only the current step's content is rendered, inside an animated
  wrapper keyed by step index.
- **Footer:** `Voltar` (secondary, shown only when `step > 0`) + primary button
  (`Próximo`, or `Criar despesa` on the last step, with a `Salvando...` busy
  state).

## Slide transition between steps

Direction-aware, using reanimated layout animations on the step wrapper
(`key={step}`):

- **Advancing (`Próximo`):** new step enters from the right (`SlideInRight`),
  old step exits to the left (`SlideOutLeft`).
- **Going back (`Voltar`):** reversed — new step enters from the left
  (`SlideInLeft`), old exits to the right (`SlideOutRight`).
- A `direction` state (`"forward" | "back"`) selects which entering/exiting
  animations apply for the current transition.

## Component reuse

- `FormInput` — description and amount.
- `FormChips` — category (single-select; options mapped from `categories`).
- Custom participant checkbox list (preserves the current row/checkmark visual),
  wired through a `Controller` for `participantUserIds`.
- `Card` — read-only summary rows + Total / Por pessoa on step 4 (Revisão).
- `Button`, `Text`, `useTheme`, `formatBRL` helper.

## Preserved behavior

- Default `categoryId` to the first loaded category.
- Pre-select all group members on load.
- Live per-person split (`total / selectedIds.length`) shown in the step-3 summary.
- `router.back()` on successful create.

## Out of scope

- No changes to `useExpensesMutations`, categories/members/users hooks, or the
  expense data model.
- No new navigation routes; this stays a single screen with internal step state.

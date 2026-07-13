# Addsum feature roadmap — 2026-07-06

Spans **addsum-mobile** (Expo/RN, expo-router, TanStack Query + Axios) and **addsum-api**
(NestJS + Mongoose). Casaril reference repos live at `/Users/felipemotta/addsum/casaril-mobile`
and `/Users/felipemotta/addsum/casaril-api` — mirror those where noted.

Decisions: forgot-password = **in-app code entry**; delete-account = **block while the user owns
groups**; group menu = **add `react-native-ios-context-menu`** (native menu + keep zoom);
notifications fire on **new expense, payment declared, payment confirmed/rejected, join/leave**.

---

## Step 0 — Unblock the build (prerequisite)

Two API files have unresolved conflict markers; the leave-group work is on the **Stashed changes**
side and must be kept:
- `addsum-api/src/expenses/handlers/create-expense.handler.ts` — keep the `import { GroupMemberStatus }` line and the `membership.status === Leaving` check.
- `addsum-api/src/groups/groups.module.ts` — keep `LeaveGroupHandler`, `ExpensesRepository`/`ExpenseParticipantsRepository` + their schemas.

Resolve both, then `cd addsum-api && pnpm run build` must pass. This also finishes **Item 1 (Sair do grupo)** on the API side.

---

## Item 1 — Sair do grupo: true native menu + zoom

Functionally done; upgrade the menu. Native app-icon menu + expo-router zoom can't coexist via
`@expo/ui`/`Link.Menu` (established earlier), so use `react-native-ios-context-menu`.

- Install: `npx expo install react-native-ios-context-menu react-native-ios-utilities`; rebuild dev client (`expo run:ios`). Verify Fabric/SDK-55 compat on first build.
- Rewrite `addsum-mobile/src/features/groups/components/group-card.tsx` (iOS variant `group-card.ios.tsx`):
  `<Link asChild><Link.AppleZoom><ContextMenuView menuConfig={…}>{card}</ContextMenuView></Link.AppleZoom></Link>`.
  `ContextMenuView` passes taps through (tap → navigate + zoom; long-press → native menu). Menu items from `useGroupActions` (Editar/Excluir for admin, Sair for member).
- Keep a `group-card.tsx` (non-iOS) fallback using the current Alert action sheet.
- Detail overflow ⋯ (`group-overflow-menu.ios.tsx`): optionally switch to `ContextMenuButton` for consistency; otherwise leave the `@expo/ui` `Menu`. Keep the `.tsx` Alert fallback.

---

## Item 6 — Copiar código do grupo ao clicar (small)

`addsum-mobile/src/app/(app)/group/[id]/index.tsx` (~line 260): the invite code is inert text.
- Replace the `· {inviteCode}` text with a `Pressable` row: code + a `Copy` icon (lucide) that, on press, `Clipboard.setStringAsync(group.inviteCode)`, flips to a `Check` icon for ~1.5s via local state, then back. Mirror the copy pattern in `src/components/ui/copyable-field.tsx`.
- Reuse `expo-clipboard` (already a dep). Consider extracting the icon-toggle into `copyable-field.tsx` or a tiny `CopyIconButton` for reuse.

---

## Item 9 — Data na despesa (past dates) (small)

API already accepts `date`; wire the mobile UI.
- `addsum-mobile/src/app/(app)/group/[id]/new-expense.tsx`: add `date` to the Zod schema (default today, ISO string), render `DatePickerInput`/`FormDatePicker` (`src/components/ui/form/`) on the "Valor"/"Descrição" step, disallow future dates (max = today), and include `date` in the `createExpense` payload.
- `use-expenses-mutations.ts` already forwards `input.date ?? now` — just pass the picked value.

---

## Item 8 — Esqueceu a senha (in-app code flow)

API handlers exist (`forgot-password`, `reset-password`) + validation-tokens + emails. Adjust for a
mobile code flow (no web frontend).
- **API**: ensure the forgot-password email template (`addsum-api/utils/email-templates/forgot-password.hbs`) shows the **8-digit code** (not just a web link). Confirm `reset-password` accepts `{ token, password }` and the token is the emailed code (validation-tokens `PasswordReset`, 24h). (Mirror casaril's `validation-tokens.service` / `reset-password.handler`.)
- **Mobile**:
  - New screen `src/app/(auth)/forgot-password.tsx`: email input → `POST /auth/forgot-password` → success alert → navigate to reset screen.
  - New screen `src/app/(auth)/reset-password.tsx` (unauth): token (code) + new password + confirm → `POST /auth/reset-password`. Keep the existing `(app)/(modals)/reset-password.tsx` as the logged-in change-password modal.
  - Add `forgotPasswordFormSchema` and a token-bearing `resetPasswordFormSchema` to `src/features/auth/api/auth-schemas.ts`; hooks `use-forgot-password.ts` / `use-reset-password.ts` (mirror casaril).
  - Wire the dead "Esqueci minha senha" `Pressable` in `sign-in.tsx` (line ~116) → `router.push("/(auth)/forgot-password")`. Register both screens in `(auth)/_layout.tsx`.

---

## Item 5 — Android keyboard insets

Port casaril's approach (no new deps; uses `react-native` `Keyboard` + reanimated + safe-area, all present).
- Copy `casaril-mobile/src/hooks/use-keyboard-bottom-inset.ts` and `use-android-keyboard-scroll.ts` → `addsum-mobile/src/hooks/`.
- Apply the ScrollView pattern to the form screens (`sign-in.tsx`, `register.tsx`, new `forgot-password`/`reset-password`, `edit-profile-modal.tsx`, `new-expense.tsx`): `KeyboardAvoidingView behavior={Platform.OS==="android"?"height":undefined}` → `ScrollView` with `ref`, `contentContainerStyle={{ paddingBottom: keyboardOverlayHeight }}`, `automaticallyAdjustKeyboardInsets={Platform.OS==="ios"}`, `onContentSizeChange={handleContentSizeChange}`, `keyboardShouldPersistTaps="handled"`, `keyboardDismissMode="interactive"`.
- Leave `app.json` android as default (`adjustResize`) — the hook math assumes it. No root-layout change.

---

## Item 3 — Montar link de pagamento (Pix copia-e-cola / BR Code)

Build the EMV MPM (Pix "copia e cola") payload from the creditor's pix key + amount, show a QR + copy button on the expense detail (next to the existing Chave Pix block).
- New util `src/common/utils/pix-brcode.ts`: `buildPixPayload({ pixKey, amount, merchantName, city, txid? })` returning the EMV string (ID fields 00/01/26[00 gui `br.gov.bcb.pix`,01 key]/52/53=986/54 amount/58=BR/59 name/60 city/62[05 txid]/63 CRC16-CCITT). Include a `crc16` helper. Pure/testable.
- Expense detail (`expense/[expenseId].tsx`): under the Chave Pix `CopyableField`, add a "Copiar código Pix" (copia-e-cola) `CopyableField` (copyValue = payload) and optionally a `QRCode` (react-native-qrcode-svg, already a dep) of the payload, using the creditor's pix + the participant's `amountOwed`. Guard: only when `creatorPix` looks like a valid key.
- Merchant name/city: use the creditor's name (from members) + a default city (e.g. from profile or a constant "SAO PAULO"). Amount = the payer's share.
- No API change required.

---

## Item 4 — Notificações (push + aba)

API notifications module already exists; push-token save exists (`POST /auth/push-token`). Two gaps:
read-state + triggers on the API, and everything on mobile.

### API
- Add `read: boolean` (default false) to `notifications/notification.schema.ts`; add routes: `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all` (+ handlers/repo methods). Keep existing list/delete.
- Change `NotificationType` enum to addsum domain: `EXPENSE_ADDED`, `PAYMENT_DECLARED`, `PAYMENT_CONFIRMED`, `PAYMENT_REJECTED`, `GROUP_JOINED`, `GROUP_LEFT`.
- Use the **persisting** `NotificationsService.sendNotification` (writes a row + sends push via `expo-server-sdk`). Confirm `expo-server-sdk` is a dep and `EXPO_ACCESS_TOKEN` env is set.
- Trigger notifications (create row + push) from domain handlers, each with `data: { type, groupId, expenseId? }` for deep-linking:
  - `create-expense.handler.ts` → notify each participant (except creator): `EXPENSE_ADDED`.
  - `declare-payment.handler.ts` → notify the expense creator: `PAYMENT_DECLARED`.
  - `confirm-payment.handler.ts` / `reject-payment.handler.ts` → notify the payer: `PAYMENT_CONFIRMED` / `PAYMENT_REJECTED`.
  - `join-group.handler.ts` / `leave-group.handler.ts` → notify the group admin: `GROUP_JOINED` / `GROUP_LEFT`.
  - Wrap sends best-effort (never fail the mutation if push fails). Skip sending to the actor themselves.

### Mobile
- Install `expo-notifications` + `expo-device` (`npx expo install`), rebuild dev client. Add Android channel + iOS permissions config in `app.json` (expo-notifications plugin).
- Port `casaril-mobile/src/features/notifications/push-notifications.ts` + `use-push-notification-routing.ts` → `addsum-mobile/src/features/notifications/`: drop the `role === "PATIENT"` gates, set an addsum Android channel, and rewrite `getNotificationTargetHref` to route on `data.type`/`groupId`/`expenseId` (e.g. → `/group/[id]` or `/group/[id]/expense/[expenseId]`). Mount `usePushNotificationRouting()` in `src/app/_layout.tsx`. Token registers via `POST /auth/push-token` (already exists) on auth.
- **In-app notifications tab (net-new):**
  - Route `src/app/(app)/(tabs)/notifications.tsx` + a `NativeTabs.Trigger name="notifications"` (bell icon `sf="bell"`/`md="notifications"`) in `(tabs)/_layout.tsx`, with an unread badge (from unread-count).
  - `features/notifications/api/notifications-api.ts` (list, unread-count, mark-read, mark-all-read), hook `use-notifications.ts` (+ `queryKeys.notifications`), list UI (icon by type, title/body, relative time, read/unread style). Mark-all-read (or per-item on tap) when the tab opens; tapping an item deep-links to the group/expense.

---

## Item 7 — Deletar conta (self-service)

Mirror casaril's UX; addsum cascade = **block while the user owns groups** (+ settle-up), then hard delete.
### API
- New self endpoint `DELETE /auth/account` (in `auth.controller.ts`, `@AuthUser()` — identity from token, no password re-auth, like casaril) → `DeleteMyAccountHandler`.
- Handler preconditions (throw `BadRequestException` with a clear message if violated):
  - User is `adminUserId` of any non-deleted group → "Exclua ou transfira seus grupos antes de excluir a conta."
  - User has unsettled balances in any group (reuse `hasUnsettledForUser` across their groups) → "Quite seus pagamentos antes de excluir a conta." (consistent with leave-group).
- On success (ideally in a transaction): hard-delete the user; hard-delete their `GroupMember` rows and their `ExpenseParticipant` rows. Leave historical `Expense` docs (creator name falls back to "Membro"). Clear their `pushToken`.
### Mobile
- `src/app/(app)/(modals)/delete-account.tsx` (mirror casaril): destructive warning card + native `Alert.alert` confirm → `DELETE /auth/account` → `logout()` → redirect `router.dismissAll()` + `router.replace("/(auth)/sign-in")`. (No password field needed since the server doesn't verify one; keep a typed confirm or plain confirm.)
- Entry point: a "Excluir conta" row in `profile-modal.tsx`. api fn + hook in `features/profile` (or `features/auth`). Register the modal in `(app)/_layout.tsx`.

---

## Suggested order

1. **Step 0** (resolve conflicts) — unblocks everything, finishes Item 1 API.
2. Quick wins: **6 (copy code)**, **9 (expense date)**.
3. **5 (Android keyboard)** — improves all forms before adding more.
4. **8 (forgot password)** and **7 (delete account)** — auth-adjacent, share validation-tokens/profile plumbing.
5. **1 (native menu)** — needs a native rebuild; batch with #4 below.
6. **4 (notifications)** — largest; needs a native rebuild (expo-notifications). Do the API triggers + read-state, then mobile push + tab.
7. **3 (payment link)** — self-contained; any time.

Native rebuilds (`expo run:ios`/`android`) are required after adding `react-native-ios-context-menu` (#1) and `expo-notifications` (#4) — sequence those together.

## Verification per feature
- API: `pnpm run build` + exercise new endpoints via Swagger/Scalar `/reference`.
- Mobile: `pnpm lint` + `npx tsc --noEmit`; then device/simulator dev build. Key manual flows: leave/menu on long-press with zoom; copy code shows check-then-copy; pick a past expense date; forgot→code→reset login; keyboard doesn't cover fields on Android; delete account blocks when owning a group else logs out; push received + notifications tab lists/marks read + deep-links; Pix copia-e-cola scans/pays in a bank app.

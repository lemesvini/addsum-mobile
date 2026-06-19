import { StepProgressRing } from "@/components/step-progress-ring";
import { Card } from "@/components/ui/card";
import {
  FormError,
  FormField,
  FormInput,
  useZodForm,
} from "@/components/ui/form";
import { ReceiptField } from "@/components/ui/form/receipt-field";
import { Text } from "@/components/ui/text";
import { useCategories } from "@/features/categories/hooks/use-categories";
import { useCategoriesMutations } from "@/features/categories/hooks/use-categories-mutations";
import { useExpensesMutations } from "@/features/expenses/hooks/use-expenses-mutations";
import { useGroupMembers } from "@/features/groups/hooks/use-group-members";
import { useTheme } from "@/hooks/use-theme";
import { router, useLocalSearchParams } from "expo-router";
import {
  Check,
  Divide,
  Plus,
  RotateCw,
  SquareDivide,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  Controller,
  type Control,
  type FieldError,
  type FieldPath,
} from "react-hook-form";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  SlideInLeft,
  SlideInRight,
  SlideOutLeft,
  SlideOutRight,
} from "react-native-reanimated";
import { z } from "zod";
import * as Haptics from "expo-haptics";

function formatBRL(n: number): string {
  return `R$ ${n.toFixed(2).replace(".", ",")}`;
}

function parseAmount(value: string): number {
  return parseFloat(value.replace(",", ".")) || 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Numeric value formatted for an editable amount input (e.g. "12,50"). */
function amountInput(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

/**
 * Splits `total` evenly across `count` participants, pushing the rounding
 * remainder onto the first share so the parts sum exactly to the total.
 * Mirrors the server-side split in `useExpensesMutations`.
 */
function evenSplit(total: number, count: number): number[] {
  if (count <= 0) return [];
  const base = round2(total / count);
  const shares = Array.from({ length: count }, () => base);
  shares[0] = round2(shares[0] + round2(total - base * count));
  return shares;
}

const schema = z.object({
  description: z.string().trim().min(1, "Informe uma descrição"),
  categoryId: z.string().min(1, "Selecione uma categoria"),
  amount: z
    .string()
    .refine((v) => parseAmount(v) > 0, "Informe um valor válido"),
  participantUserIds: z.array(z.string()).min(1, "Selecione participantes"),
  /** Editable per-user share strings, keyed by user _id. */
  participantAmounts: z.record(z.string(), z.string()),
  /** Local `file://` URI of an optional receipt image; empty when none. */
  receiptImageUrl: z.string(),
});

type FormValues = z.infer<typeof schema>;

const TOTAL_STEPS = 4;
const STEP_TITLES = ["Descrição", "Valor", "Participantes", "Revisão"];
const STEP_FIELDS: FieldPath<FormValues>[][] = [
  ["description", "categoryId"],
  ["amount"],
  ["participantUserIds"],
  [],
];

export default function NewExpenseScreen() {
  const { id: groupId } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const { categories } = useCategories(groupId);
  const { members } = useGroupMembers(groupId);
  const { createExpense } = useExpensesMutations();

  const {
    control,
    trigger,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useZodForm<FormValues>({
    schema,
    mode: "onTouched",
    defaultValues: {
      description: "",
      categoryId: "",
      amount: "",
      participantUserIds: [],
      participantAmounts: {},
      receiptImageUrl: "",
    },
  });

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Default category to the first one once loaded.
  const categoryId = watch("categoryId");
  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setValue("categoryId", categories[0]._id);
    }
  }, [categories, categoryId, setValue]);

  // Default-select all members once loaded.
  useEffect(() => {
    if (members.length > 0 && getValues("participantUserIds").length === 0) {
      setValue(
        "participantUserIds",
        members.map((m) => m._id),
      );
    }
  }, [members, getValues, setValue]);

  const userName = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of members) map.set(u._id, u.fullName);
    return map;
  }, [members]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c._id, label: c.name })),
    [categories],
  );

  const amount = watch("amount");
  const participantUserIds = watch("participantUserIds");
  const participantAmounts = watch("participantAmounts");
  const description = watch("description");

  const total = parseAmount(amount ?? "");
  const selectedCount = participantUserIds?.length ?? 0;
  const categoryName =
    categories.find((c) => c._id === categoryId)?.name ?? "—";

  // Reset the per-person split to an even one whenever the total or the set of
  // participants changes. Manual edits to individual shares are preserved
  // because they don't touch either dependency.
  const participantKey = participantUserIds.join(",");
  useEffect(() => {
    if (selectedCount === 0) return;
    const shares = evenSplit(total, selectedCount);
    const next: Record<string, string> = {};
    participantUserIds.forEach((uid, i) => {
      next[uid] = amountInput(shares[i]);
    });
    setValue("participantAmounts", next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, participantKey]);

  const sharesSum = round2(
    participantUserIds.reduce(
      (acc, uid) => acc + parseAmount(participantAmounts?.[uid] ?? "0"),
      0,
    ),
  );
  const amountsBalanced =
    selectedCount > 0 && Math.abs(sharesSum - round2(total)) < 0.005;

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    setBusy(true);
    try {
      const amounts: Record<string, number> = {};
      for (const uid of values.participantUserIds) {
        amounts[uid] = parseAmount(values.participantAmounts?.[uid] ?? "0");
      }
      await createExpense({
        groupId: groupId!,
        categoryId: values.categoryId,
        description: values.description.trim(),
        totalAmount: parseAmount(values.amount),
        participantUserIds: values.participantUserIds,
        participantAmounts: amounts,
        receiptImageUrl: values.receiptImageUrl?.trim()
          ? values.receiptImageUrl.trim()
          : undefined,
      });
      router.back();
    } catch (e: any) {
      setSubmitError(e?.message ?? "Não foi possível criar a despesa");
    } finally {
      setBusy(false);
    }
  };

  const goNext = async () => {
    const valid = await trigger(STEP_FIELDS[step]);
    if (!valid) return;
    if (step < TOTAL_STEPS - 1) {
      setDirection("forward");
      setStep((s) => s + 1);
    } else {
      if (!amountsBalanced) {
        setSubmitError("A soma das partes deve ser igual ao total");
        return;
      }
      handleSubmit(onSubmit)();
    }
  };

  const goBack = () => {
    setDirection("back");
    setStep((s) => Math.max(0, s - 1));
  };

  const entering = direction === "forward" ? SlideInRight : SlideInLeft;
  const exiting = direction === "forward" ? SlideOutLeft : SlideOutRight;
  const isLast = step === TOTAL_STEPS - 1;

  return (
    <SafeAreaView className="bg-background flex-1 mt-2">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 70 : 0}
      >
        <View className="flex-row items-center justify-between px-5 py-3">
          <StepProgressRing step={step} total={TOTAL_STEPS} />
          <Text className="text-foreground text-xl font-bold">
            {STEP_TITLES[step]}
          </Text>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <X size={24} color={theme.foreground} />
          </TouchableOpacity>
        </View>

        <View className="flex-1 overflow-hidden">
          <Animated.View
            key={step}
            entering={entering}
            exiting={exiting}
            className="flex-1"
          >
            <ScrollView
              className="flex-1 px-5"
              contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {step === 0 ? (
                <View className="gap-4">
                  <FormInput
                    control={control}
                    name="description"
                    label="Descrição"
                    placeholder="Ex: Supermercado"
                    error={errors.description}
                    maxLength={20}
                  />
                  <CategoryField
                    control={control}
                    name="categoryId"
                    label="Categoria"
                    options={categoryOptions}
                    error={errors.categoryId}
                    groupId={groupId!}
                  />
                </View>
              ) : null}

              {step === 1 ? (
                <FormInput
                  control={control}
                  name="amount"
                  label="Valor (R$)"
                  placeholder="0,00"
                  keyboardType="decimal-pad"
                  error={errors.amount}
                />
              ) : null}

              {step === 2 ? (
                <Controller
                  control={control}
                  name="participantUserIds"
                  render={({ field: { value, onChange } }) => (
                    <View>
                      <Text className="text-foreground mb-2 text-sm font-medium">
                        Participantes
                      </Text>
                      {members.map((m) => {
                        const active = value.includes(m._id);
                        return (
                          <Pressable
                            key={m._id}
                            onPress={() =>
                              onChange(
                                active
                                  ? value.filter((id) => id !== m._id)
                                  : [...value, m._id],
                              )
                            }
                            className="border-border flex-row items-center justify-between border-b py-3"
                          >
                            <Text className="text-foreground">
                              {userName.get(m._id) ?? "Membro"}
                            </Text>
                            <View
                              className={
                                active
                                  ? "bg-primary h-6 w-6 items-center justify-center rounded-full"
                                  : "border-border h-6 w-6 rounded-full border"
                              }
                            >
                              {active ? (
                                <Check size={14} color="#FFFFFF" />
                              ) : null}
                            </View>
                          </Pressable>
                        );
                      })}
                      <FormError
                        error={
                          errors.participantUserIds as FieldError | undefined
                        }
                      />
                    </View>
                  )}
                />
              ) : null}

              {step === 3 ? (
                <View className="gap-4 mt-4">
                  {/* <View className="flex-row items-center justify-between">
                    <View>
                      <Text className="text-white font-bold text-3xl">
                        {description.trim() || "Sem descrição"}
                      </Text>
                      <Text className="text-muted-foreground font-thin text-sm ">
                        {categoryName}
                      </Text>
                    </View>
                    <Text
                      style={{ fontSize: 26, fontWeight: "900" }}
                      className="font-mono text-primary"
                    >
                      {formatBRL(total)}
                    </Text>
                  </View> */}
                  <View className="flex flex-row items-center justify-between">
                    <Text className="text-foreground text-3xl font-extrabold">
                      {description.trim() || "Sem descrição"}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Divide size={20} color={theme.mutedForeground} />
                      <Text className="text-3xl font-extrabold ">
                        {participantUserIds.length}
                      </Text>
                    </View>
                  </View>
                  <Card>
                    <View className="px-6">
                      <View className="bg-transparent flex flex-row items-center justify-between">
                        <Text className="text-muted-foreground">Categoria</Text>
                        <Text className="text-lg">{categoryName}</Text>
                      </View>
                      <View className="bg-transparent flex flex-row items-center justify-between">
                        <Text className="text-muted-foreground">
                          Valor da despesa
                        </Text>
                        <Text className="font-extrabold text-2xl text-primary">
                          {formatBRL(total)}
                        </Text>
                      </View>
                    </View>
                  </Card>

                  <View className="mt-6">
                    <View className="mb-2 flex-row items-center justify-between">
                      <Text className="text-muted-foreground text-sm font-medium">
                        Divisão por pessoa
                      </Text>
                      <Pressable
                        onPress={() => {
                          const shares = evenSplit(total, selectedCount);
                          const next: Record<string, string> = {};
                          participantUserIds.forEach((uid, i) => {
                            next[uid] = amountInput(shares[i]);
                          });
                          setValue("participantAmounts", next);
                        }}
                      >
                        <RotateCw size={16} color="#86aefd" />

                        {/* <Text>Redistribuir</Text> */}
                      </Pressable>
                    </View>
                    <View className="border border-b border-border w-full" />
                    <Controller
                      control={control}
                      name="participantAmounts"
                      render={({ field: { value, onChange } }) => (
                        <View>
                          {participantUserIds.map((uid) => (
                            <View
                              key={uid}
                              className="flex-row items-center justify-between gap-3 py-2"
                            >
                              <Text
                                numberOfLines={1}
                                className="text-foreground flex-1"
                              >
                                {userName.get(uid) || "Membro"}
                              </Text>
                              <View
                                className="border-border bg-card flex-row items-center rounded-xl border px-3"
                                style={{ width: 130 }}
                              >
                                <Text className="text-muted-foreground text-sm">
                                  R$
                                </Text>
                                <TextInput
                                  value={value?.[uid] ?? ""}
                                  onChangeText={(t) =>
                                    onChange({ ...value, [uid]: t })
                                  }
                                  keyboardType="decimal-pad"
                                  placeholder="0,00"
                                  placeholderTextColor={theme.mutedForeground}
                                  style={{
                                    flex: 1,
                                    textAlign: "right",
                                    paddingVertical:
                                      Platform.OS === "ios" ? 14 : 12,
                                    paddingLeft: 6,
                                    fontSize: 15,
                                    color: theme.cardForeground,
                                  }}
                                />
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    />
                  </View>

                  <View className="mt-6">
                    <Text className="text-muted-foreground mb-2 text-sm font-medium">
                      Comprovante
                    </Text>
                    {/* <View className="border border-b border-border w-full mb-2" /> */}

                    <Controller
                      control={control}
                      name="receiptImageUrl"
                      render={({ field: { value, onChange } }) => (
                        <ReceiptField
                          value={value ?? ""}
                          onChange={onChange}
                          disabled={busy}
                        />
                      )}
                    />
                  </View>

                  {!amountsBalanced ? (
                    <Card className="py-4">
                      <Text className="text-destructive text-sm w-full text-center">
                        A soma das partes deve ser igual ao total.
                      </Text>
                      <View className="flex-row justify-between px-6">
                        <Text className="text-muted-foreground">
                          Soma das partes
                        </Text>
                        <Text
                          className={`font-semibold ${
                            amountsBalanced
                              ? "text-foreground"
                              : "text-destructive"
                          }`}
                        >
                          {formatBRL(sharesSum)}
                        </Text>
                      </View>
                      <View className="mt-2 flex-row justify-between px-6">
                        <Text className="text-muted-foreground">Total</Text>
                        <Text className="text-foreground font-semibold">
                          {formatBRL(total)}
                        </Text>
                      </View>
                    </Card>
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
          </Animated.View>
        </View>

        <View className="px-5 pb-2 pt-3">
          {submitError ? (
            <Text className="text-destructive mb-3 text-sm">{submitError}</Text>
          ) : null}
          <View className="flex-row gap-3">
            {step > 0 ? (
              <Pressable
                className={`bg-secondary h-11 flex-1 flex-row items-center justify-center rounded-md active:opacity-80 ${
                  busy ? "opacity-50" : ""
                }`}
                disabled={busy}
                onPress={goBack}
              >
                <Text className="text-secondary-foreground font-semibold">
                  Voltar
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              className={`bg-primary h-11 flex-1 flex-row items-center justify-center rounded-md active:opacity-90 ${
                busy || (isLast && !amountsBalanced) ? "opacity-50" : ""
              }`}
              disabled={busy || (isLast && !amountsBalanced)}
              onPress={async () => {
                Haptics.selectionAsync();
                goNext();
              }}
            >
              <Text className="text-primary-foreground font-semibold">
                {isLast
                  ? busy
                    ? "Salvando..."
                    : "Criar despesa"
                  : "Continuar"}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Category picker for step 1: renders the group's categories as selectable
 * chips, with an inline "Nova categoria" chip in the same row that lets the
 * user create one (selecting it immediately) without leaving the flow.
 */
function CategoryField({
  control,
  name,
  label,
  options,
  error,
  groupId,
}: {
  control: Control<FormValues>;
  name: FieldPath<FormValues>;
  label: string;
  options: { value: string; label: string }[];
  error?: FieldError;
  groupId: string;
}) {
  const theme = useTheme();
  const { createCategory } = useCategoriesMutations();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const reset = () => {
    setAdding(false);
    setNewName("");
    setAddError(null);
  };

  return (
    <FormField label={label} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => {
          const submit = async () => {
            if (!newName.trim() || busy) return;
            setAddError(null);
            setBusy(true);
            try {
              const created = await createCategory(groupId, newName);
              onChange(created._id);
              reset();
            } catch (e: any) {
              setAddError(e?.message ?? "Não foi possível criar a categoria");
            } finally {
              setBusy(false);
            }
          };

          return (
            <View className="gap-2">
              <View className="flex-row flex-wrap gap-2">
                {options.map((option) => {
                  const selected = value === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => onChange(option.value)}
                      className={`rounded-full border px-3 py-2 ${
                        selected
                          ? "border-primary bg-primary"
                          : "border-border bg-card"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          selected ? "text-white" : "text-card-foreground"
                        }`}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  onPress={() => (adding ? reset() : setAdding(true))}
                  className="border-border flex-row items-center gap-1 rounded-full border border-dashed px-3 py-2"
                >
                  <Plus size={16} color={theme.mutedForeground} />
                  <Text className="text-muted-foreground text-sm">
                    Nova categoria
                  </Text>
                </Pressable>
              </View>

              {adding ? (
                <View className="gap-2">
                  <View className="border-border bg-card overflow-hidden rounded-2xl border">
                    <TextInput
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="Nome da categoria"
                      placeholderTextColor={theme.mutedForeground}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={submit}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: Platform.OS === "ios" ? 14 : 12,
                        fontSize: 15,
                        color: theme.cardForeground,
                      }}
                    />
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      disabled={busy || !newName.trim()}
                      onPress={submit}
                      className={`bg-primary flex-1 items-center justify-center rounded-md py-2.5 ${
                        busy || !newName.trim() ? "opacity-50" : ""
                      }`}
                    >
                      <Text className="text-primary-foreground text-sm font-semibold">
                        {busy ? "Adicionando..." : "Adicionar"}
                      </Text>
                    </Pressable>
                    <Pressable
                      disabled={busy}
                      onPress={reset}
                      className="bg-secondary items-center justify-center rounded-md px-4 py-2.5"
                    >
                      <Text className="text-secondary-foreground text-sm font-semibold">
                        Cancelar
                      </Text>
                    </Pressable>
                  </View>
                  {addError ? (
                    <Text className="text-destructive text-sm">{addError}</Text>
                  ) : null}
                </View>
              ) : null}
            </View>
          );
        }}
      />
    </FormField>
  );
}

function ReviewRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row justify-between px-6 py-3 ${
        last ? "" : "border-border border-b"
      }`}
    >
      <Text className="text-muted-foreground">{label}</Text>
      <Text className="text-foreground font-medium">{value}</Text>
    </View>
  );
}

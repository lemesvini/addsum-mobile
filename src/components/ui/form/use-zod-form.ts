import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type DefaultValues, type FieldValues } from "react-hook-form";
import type { z } from "zod";

type UseZodFormOptions<T extends FieldValues> = {
  schema: z.ZodTypeAny;
  defaultValues?: DefaultValues<T>;
  mode?: "onBlur" | "onChange" | "onSubmit" | "onTouched" | "all";
};

export function useZodForm<T extends FieldValues>({
  schema,
  defaultValues,
  mode = "onBlur",
}: UseZodFormOptions<T>) {
  return useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
    mode,
  });
}

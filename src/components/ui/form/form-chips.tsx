import { FormField } from "@/components/ui/form/form-field";
import { Text } from "@/components/ui/text";
import {
  Controller,
  type Control,
  type FieldError,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Pressable, View } from "react-native";

type ChipOption = { value: string; label: string };

type FormChipsProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: readonly ChipOption[];
  error?: FieldError;
  allowClear?: boolean;
};

export function FormChips<T extends FieldValues>({
  control,
  name,
  label,
  options,
  error,
  allowClear = false,
}: FormChipsProps<T>) {
  return (
    <FormField label={label} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <View className="flex-row flex-wrap gap-2">
            {options.map((option) => {
              const selected = value === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    onChange(
                      selected && allowClear ? undefined : option.value,
                    )
                  }
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
          </View>
        )}
      />
    </FormField>
  );
}

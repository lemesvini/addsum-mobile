import { DatePickerInput } from "@/components/ui/form/date-picker-input";
import { FormError } from "@/components/ui/form/form-error";
import { FormField } from "@/components/ui/form/form-field";
import {
  Controller,
  type Control,
  type FieldError,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Platform, View } from "react-native";

type FormDatePickerProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  error?: FieldError;
  editable?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

export function FormDatePicker<T extends FieldValues>({
  control,
  name,
  label,
  placeholder = "dd/mm/aaaa",
  error,
  editable = true,
  minimumDate,
  maximumDate,
}: FormDatePickerProps<T>) {
  const picker = (
    <Controller
      control={control}
      name={name}
      render={({ field: { value, onChange, onBlur } }) => (
        <DatePickerInput
          value={value ?? ""}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          label={Platform.OS === "ios" ? label : undefined}
          editable={editable}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    />
  );

  if (Platform.OS === "ios") {
    return (
      <View className="gap-2">
        {picker}
        <FormError error={error} />
      </View>
    );
  }

  return (
    <FormField label={label} error={error}>
      {picker}
    </FormField>
  );
}

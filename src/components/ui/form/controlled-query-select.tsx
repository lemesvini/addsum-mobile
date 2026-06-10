import { FormField } from "@/components/ui/form/form-field";
import {
  QuerySelect,
  type QuerySelectOption,
} from "@/components/ui/query-select";
import {
  Controller,
  type Control,
  type FieldError,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

type ControlledQuerySelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  options: QuerySelectOption[];
  error?: FieldError;
  loading?: boolean;
  disabled?: boolean;
  clearable?: boolean;
};

export function ControlledQuerySelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  error,
  loading,
  disabled,
  clearable,
}: ControlledQuerySelectProps<T>) {
  return (
    <FormField label={label} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange } }) => (
          <QuerySelect
            placeholder={placeholder}
            value={value}
            onChange={(next) => onChange(next)}
            options={options}
            loading={loading}
            disabled={disabled}
            clearable={clearable}
          />
        )}
      />
    </FormField>
  );
}

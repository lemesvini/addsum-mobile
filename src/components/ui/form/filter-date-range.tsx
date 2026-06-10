import { parseDateInput } from "@/common/utils/date";
import { DatePickerInput } from "@/components/ui/form/date-picker-input";
import { Text } from "@/components/ui/text";
import {
  Controller,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Platform, View } from "react-native";

type FilterDateRangeProps<T extends FieldValues> = {
  control: Control<T>;
  startName: FieldPath<T>;
  endName: FieldPath<T>;
};

type RangeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
};

function RangeField({
  label,
  value,
  onChange,
  onBlur,
  minimumDate,
  maximumDate,
}: RangeFieldProps) {
  if (Platform.OS === "android") {
    return (
      <View className="min-w-0 flex-1 gap-2">
        <Text className="text-sm font-medium text-card-foreground">{label}</Text>
        <DatePickerInput
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder="dd/mm/aaaa"
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      </View>
    );
  }

  return (
    <View className="min-w-0 flex-1">
      <DatePickerInput
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        label={label}
        labelClassName="shrink-0 text-sm font-medium text-muted-foreground"
        placeholder="dd/mm/aaaa"
        minimumDate={minimumDate}
        maximumDate={maximumDate}
      />
    </View>
  );
}

export function FilterDateRange<T extends FieldValues>({
  control,
  startName,
  endName,
}: FilterDateRangeProps<T>) {
  return (
    <Controller
      control={control}
      name={endName}
      render={({ field: endField }) => (
        <Controller
          control={control}
          name={startName}
          render={({ field: startField }) => (
            <View className="w-full flex-row gap-3">
              <RangeField
                label="De"
                value={startField.value ?? ""}
                onChange={startField.onChange}
                onBlur={startField.onBlur}
                maximumDate={parseDateInput(endField.value ?? "")}
              />
              <RangeField
                label="Até"
                value={endField.value ?? ""}
                onChange={endField.onChange}
                onBlur={endField.onBlur}
                minimumDate={parseDateInput(startField.value ?? "")}
              />
            </View>
          )}
        />
      )}
    />
  );
}

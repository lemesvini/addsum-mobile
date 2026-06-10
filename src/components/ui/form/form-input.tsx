import { FormField } from "@/components/ui/form/form-field";
import { useTheme } from "@/hooks/use-theme";
import {
  Controller,
  type Control,
  type FieldError,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Platform, TextInput, View } from "react-native";

type FormInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder: string;
  error?: FieldError;
  keyboardType?:
    | "default"
    | "email-address"
    | "decimal-pad"
    | "url"
    | "number-pad"
    | "phone-pad";
  autoCapitalize?: "none" | "sentences";
  multiline?: boolean;
  secureTextEntry?: boolean;
  editable?: boolean;
  maxLength?: number;
};

export function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  error,
  keyboardType = "default",
  autoCapitalize = "sentences",
  multiline = false,
  secureTextEntry = false,
  editable = true,
  maxLength,
}: FormInputProps<T>) {
  const theme = useTheme();

  return (
    <FormField label={label} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field: { value, onChange, onBlur } }) => (
          <View className="overflow-hidden rounded-2xl border border-border bg-card">
            <TextInput
              value={value ?? ""}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder={placeholder}
              placeholderTextColor={theme.mutedForeground}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize}
              autoCorrect={false}
              multiline={multiline}
              secureTextEntry={secureTextEntry}
              editable={editable}
              maxLength={maxLength}
              textAlignVertical={multiline ? "top" : "auto"}
              style={{
                paddingHorizontal: 16,
                paddingVertical: Platform.OS === "ios" ? 14 : 12,
                fontSize: 15,
                color: theme.cardForeground,
                minHeight: multiline ? 120 : undefined,
                opacity: editable ? 1 : 0.7,
              }}
            />
          </View>
        )}
      />
    </FormField>
  );
}

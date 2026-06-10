import { Text } from "@/components/ui/text";
import type { FieldError } from "react-hook-form";
import type { ReactNode } from "react";
import { View } from "react-native";
import { FormError } from "./form-error";

type FormFieldProps = {
  label: string;
  children: ReactNode;
  error?: FieldError;
};

export function FormField({ label, children, error }: FormFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-card-foreground">{label}</Text>
      {children}
      <FormError error={error} />
    </View>
  );
}

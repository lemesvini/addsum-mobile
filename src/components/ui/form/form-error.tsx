import { Text } from "@/components/ui/text";
import type { FieldError } from "react-hook-form";

type FormErrorProps = {
  error?: FieldError;
};

export function FormError({ error }: FormErrorProps) {
  if (!error?.message) return null;
  return (
    <Text className="text-sm text-destructive">{String(error.message)}</Text>
  );
}

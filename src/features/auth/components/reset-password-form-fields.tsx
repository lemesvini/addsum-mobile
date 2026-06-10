import { FormInput } from "@/components/ui/form";
import type { ResetPasswordFormInput } from "@/features/auth/api/auth-schemas";
import type { Control, FormState } from "react-hook-form";

type ResetPasswordFormFieldsProps = {
  control: Control<ResetPasswordFormInput>;
  formState: FormState<ResetPasswordFormInput>;
  editable?: boolean;
};

export function ResetPasswordFormFields({
  control,
  formState,
  editable = true,
}: ResetPasswordFormFieldsProps) {
  const { errors } = formState;

  return (
    <>
      <FormInput
        control={control}
        name="password"
        label="Nova senha"
        placeholder="Digite a nova senha"
        secureTextEntry
        autoCapitalize="none"
        error={errors.password}
        editable={editable}
      />
      <FormInput
        control={control}
        name="confirmPassword"
        label="Confirmar senha"
        placeholder="Confirme a nova senha"
        secureTextEntry
        autoCapitalize="none"
        error={errors.confirmPassword}
        editable={editable}
      />
    </>
  );
}

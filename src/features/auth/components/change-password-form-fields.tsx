import { FormInput } from "@/components/ui/form";
import type { ChangePasswordFormInput } from "@/features/auth/api/auth-schemas";
import type { Control, FormState } from "react-hook-form";

type ChangePasswordFormFieldsProps = {
  control: Control<ChangePasswordFormInput>;
  formState: FormState<ChangePasswordFormInput>;
  editable?: boolean;
};

export function ChangePasswordFormFields({
  control,
  formState,
  editable = true,
}: ChangePasswordFormFieldsProps) {
  const { errors } = formState;

  return (
    <>
      <FormInput
        control={control}
        name="currentPassword"
        label="Senha atual"
        placeholder="Digite sua senha atual"
        secureTextEntry
        autoCapitalize="none"
        error={errors.currentPassword}
        editable={editable}
      />
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

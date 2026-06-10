import { AvatarField, FormInput } from "@/components/ui/form";
import type { FormProps } from "@/common/types/form";
import type { ProfileEditSchema } from "@/features/profile/api/profile-schemas";
import { useWatch } from "react-hook-form";

type ProfileFormProps = FormProps<ProfileEditSchema> & {
  disabled?: boolean;
};

export function ProfileForm({
  control,
  formState,
  disabled = false,
}: ProfileFormProps) {
  const fullName = useWatch({ control, name: "fullName", defaultValue: "" });
  const { errors } = formState;

  return (
    <>
      <AvatarField
        control={control}
        name="avatarUrl"
        fullName={fullName ?? ""}
        error={errors.avatarUrl}
        disabled={disabled}
      />
      <FormInput
        control={control}
        name="fullName"
        label="Nome completo*"
        placeholder="Digite seu nome"
        error={errors.fullName}
        editable={!disabled}
      />
    </>
  );
}

import type {
  Control,
  FieldValues,
  FormState,
  UseFormRegister,
  UseFormSetValue,
} from "react-hook-form";

export type FormProps<T extends FieldValues> = {
  register: UseFormRegister<T>;
  formState: FormState<T>;
  control: Control<T>;
  setValue?: UseFormSetValue<T>;
};

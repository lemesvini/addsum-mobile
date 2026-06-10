import { z } from "zod";

export const loginInputSchema = z.object({
  email: z.string().min(1, "Obrigatório").email("Email inválido"),
  password: z.string().min(1, "Obrigatório"),
});

export type LoginInput = z.infer<typeof loginInputSchema>;

const passwordFieldSchema = z
  .string()
  .min(8, "Senha deve ter no mínimo 8 caracteres")
  .max(255, "Senha muito longa")
  .refine((v) => /[A-Z]/.test(v), {
    message: "A nova senha deve conter pelo menos uma letra maiúscula",
  })
  .refine((v) => /[a-z]/.test(v), {
    message: "A nova senha deve conter pelo menos uma letra minúscula",
  })
  .refine((v) => /\d/.test(v), {
    message: "A nova senha deve conter pelo menos um número",
  });

export const registerInputSchema = z
  .object({
    fullName: z.string().min(1, "Obrigatório").max(255, "Nome muito longo"),
    email: z.string().min(1, "Obrigatório").email("Email inválido"),
    password: passwordFieldSchema,
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerInputSchema>;

export const resetPasswordFormSchema = z
  .object({
    password: passwordFieldSchema,
    confirmPassword: z.string().min(1, "Confirme a senha"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;

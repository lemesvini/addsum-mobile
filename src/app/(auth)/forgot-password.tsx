import { Text } from "@/components/ui/text";
import { AuthTextField } from "@/features/auth/components/auth-text-field";
import { useForgotPassword } from "@/features/auth/hooks/use-forgot-password";
import {
  forgotPasswordInputSchema,
  type ForgotPasswordInput,
} from "@/features/auth/api/auth-schemas";
import { useZodForm } from "@/components/ui/form";
import { useRouter, type Href } from "expo-router";
import { Mail } from "lucide-react-native";
import { Controller } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, View } from "react-native";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword, isLoading, error } = useForgotPassword();

  const { control, handleSubmit, formState } = useZodForm<ForgotPasswordInput>({
    schema: forgotPasswordInputSchema,
    defaultValues: { email: "" },
    mode: "onSubmit",
  });

  const onSubmit = handleSubmit(async (data) => {
    const ok = await forgotPassword(data.email);
    // Always advance (don't reveal whether the e-mail exists).
    if (ok) {
      router.push(
        `/(auth)/reset-password?email=${encodeURIComponent(data.email.trim())}` as Href,
      );
    }
  });

  return (
    <View className="bg-background flex-1 items-center justify-center p-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="w-full justify-center"
      >
          <Text className="text-foreground text-3xl font-extrabold tracking-tight">
            Esqueceu a senha?
          </Text>
          <Text className="text-muted-foreground mb-6 mt-2 text-base">
            Informe seu e-mail e enviaremos um código para redefinir sua senha.
          </Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { value, onChange, onBlur } }) => (
              <AuthTextField
                icon={Mail}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.email?.message}
              />
            )}
          />

          <View className="mb-4 mt-6 flex-row justify-end">
            <Pressable onPress={() => router.back()}>
              <Text className="text-muted-foreground text-sm">
                Voltar para o login
              </Text>
            </Pressable>
          </View>

          {error ? (
            <Text className="text-destructive mb-3 text-sm">{error}</Text>
          ) : null}

          <Pressable
            disabled={isLoading}
            className="items-center rounded-full bg-primary px-4 py-3"
            onPress={() => onSubmit()}
          >
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? "Enviando..." : "Enviar código"}
            </Text>
          </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}

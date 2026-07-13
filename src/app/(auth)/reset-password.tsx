import { Text } from "@/components/ui/text";
import { AuthTextField } from "@/features/auth/components/auth-text-field";
import { useResetPassword } from "@/features/auth/hooks/use-reset-password";
import {
  resetPasswordFormSchema,
  type ResetPasswordFormInput,
} from "@/features/auth/api/auth-schemas";
import { useZodForm } from "@/components/ui/form";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { KeyRound, Hash } from "lucide-react-native";
import { Controller } from "react-hook-form";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  View,
} from "react-native";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { resetPassword, isLoading, error, setError } = useResetPassword();

  const [code, setCode] = useState("");

  const { control, handleSubmit, formState } =
    useZodForm<ResetPasswordFormInput>({
      schema: resetPasswordFormSchema,
      defaultValues: { password: "", confirmPassword: "" },
      mode: "onSubmit",
    });

  const onSubmit = handleSubmit(async (data) => {
    if (!code.trim()) {
      setError("Informe o código enviado por e-mail.");
      return;
    }
    const ok = await resetPassword({ token: code, data });
    if (ok) {
      Alert.alert("Senha redefinida", "Você já pode entrar com a nova senha.", [
        {
          text: "OK",
          onPress: () => router.replace("/(auth)/sign-in" as Href),
        },
      ]);
    }
  });

  return (
    <View className="bg-background flex-1 items-center justify-center p-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="w-full justify-center"
      >
          <Text className="text-foreground text-3xl font-extrabold tracking-tight">
            Redefinir senha
          </Text>
          <Text className="text-muted-foreground mb-6 mt-2 text-base">
            {email
              ? `Enviamos um código para ${email}. Digite-o abaixo com sua nova senha.`
              : "Digite o código enviado por e-mail e sua nova senha."}
          </Text>

          <AuthTextField
            icon={Hash}
            placeholder="Código (8 dígitos)"
            keyboardType="number-pad"
            autoCapitalize="none"
            value={code}
            onChangeText={setCode}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { value, onChange, onBlur } }) => (
              <AuthTextField
                icon={KeyRound}
                password
                placeholder="Nova senha"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.password?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { value, onChange, onBlur } }) => (
              <AuthTextField
                icon={KeyRound}
                password
                placeholder="Confirmar nova senha"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={formState.errors.confirmPassword?.message}
              />
            )}
          />

          {error ? (
            <Text className="text-destructive mb-3 mt-2 text-sm">{error}</Text>
          ) : null}

          <Pressable
            disabled={isLoading}
            className="mt-6 items-center rounded-full bg-primary px-4 py-3"
            onPress={() => onSubmit()}
          >
            <Text className="text-primary-foreground font-semibold">
              {isLoading ? "Redefinindo..." : "Redefinir senha"}
            </Text>
          </Pressable>
      </KeyboardAvoidingView>
    </View>
  );
}
